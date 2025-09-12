import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CrawlRequest {
  orgId: string;
  domainId?: string;
  url?: string;
  priority?: number;
}

interface CrawlStats {
  pagesQueued: number;
  pagesProcessed: number;
  errors: number;
  startTime: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orgId, domainId, url, priority = 100 }: CrawlRequest = await req.json();
    console.log(`🕷️ Starting crawl for org: ${orgId}, domain: ${domainId || url}`);

    // Get domains to crawl
    let domainsToProcess = [];
    if (domainId) {
      const { data: domainData } = await supabase
        .from('org_domains')
        .select('*')
        .eq('id', domainId)
        .eq('is_enabled', true)
        .single();
      
      if (domainData) domainsToProcess = [domainData];
    } else if (url) {
      // Single URL crawl
      domainsToProcess = [{
        id: 'adhoc',
        org_id: orgId,
        domain: new URL(url).hostname,
        crawl_depth: 1,
        recrawl_hours: 168
      }];
    } else {
      // Get all enabled domains for org
      const { data: domains } = await supabase
        .from('org_domains')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_enabled', true);
      
      domainsToProcess = domains || [];
    }

    if (domainsToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No enabled domains found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Start ingest job
    const { data: jobData } = await supabase
      .from('org_ingest_jobs')
      .insert({
        org_id: orgId,
        status: 'running',
        stats: { domains: domainsToProcess.length }
      })
      .select()
      .single();

    const jobId = jobData?.id;
    let totalStats: CrawlStats = {
      pagesQueued: 0,
      pagesProcessed: 0,
      errors: 0,
      startTime: new Date().toISOString()
    };

    // Process each domain
    for (const domain of domainsToProcess) {
      try {
        console.log(`🌐 Processing domain: ${domain.domain}`);
        
        // Seed initial URLs
        const seedUrls = [
          `https://${domain.domain}/`,
          `https://${domain.domain}/about`,
          `https://${domain.domain}/news`,
          `https://${domain.domain}/reports`,
          `https://${domain.domain}/our-business`
        ];

        // Queue seed URLs
        const queueData = seedUrls.map(url => ({
          org_id: orgId,
          url,
          priority,
          status: 'queued' as const,
          attempts: 0
        }));

        const { data: queuedUrls } = await supabase
          .from('org_crawl_queue')
          .upsert(queueData, { onConflict: 'org_id,url', ignoreDuplicates: true })
          .select();

        totalStats.pagesQueued += queuedUrls?.length || 0;

        // Process queue for this domain
        await processCrawlQueue(orgId, domain, totalStats);
        
      } catch (error) {
        console.error(`❌ Error processing domain ${domain.domain}:`, error);
        totalStats.errors++;
      }
    }

    // Update job completion
    if (jobId) {
      await supabase
        .from('org_ingest_jobs')
        .update({
          finished_at: new Date().toISOString(),
          status: totalStats.errors > 0 ? 'failed' : 'completed',
          stats: totalStats
        })
        .eq('id', jobId);
    }

    console.log('✅ Crawl completed:', totalStats);

    return new Response(JSON.stringify({
      success: true,
      stats: totalStats,
      jobId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Crawl error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function processCrawlQueue(orgId: string, domain: any, stats: CrawlStats) {
  const MAX_PAGES = 50; // Rate limit per domain
  const RATE_LIMIT_MS = 2000; // 0.5 req/s = 2000ms between requests
  
  let processed = 0;
  
  while (processed < MAX_PAGES) {
    // Get next queued URL
    const { data: queueItem } = await supabase
      .from('org_crawl_queue')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (!queueItem) break;

    try {
      // Mark as fetching
      await supabase
        .from('org_crawl_queue')
        .update({ 
          status: 'fetching',
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItem.id);

      // Fetch the page
      const result = await fetchPage(queueItem.url, orgId, domain);
      
      if (result.success) {
        // Mark as done
        await supabase
          .from('org_crawl_queue')
          .update({ status: 'done' })
          .eq('id', queueItem.id);

        stats.pagesProcessed++;
        
        // Queue discovered links if within depth limit
        if (result.links && result.links.length > 0) {
          const newUrls = result.links
            .filter(link => isInternalLink(link, domain.domain))
            .slice(0, 10) // Limit new URLs per page
            .map(url => ({
              org_id: orgId,
              url,
              priority: queueItem.priority - 10,
              status: 'queued' as const,
              attempts: 0
            }));

          if (newUrls.length > 0) {
            await supabase
              .from('org_crawl_queue')
              .upsert(newUrls, { onConflict: 'org_id,url', ignoreDuplicates: true });
            
            stats.pagesQueued += newUrls.length;
          }
        }
      } else {
        // Mark as failed with error
        await supabase
          .from('org_crawl_queue')
          .update({ 
            status: 'failed',
            last_error: result.error,
            attempts: queueItem.attempts + 1
          })
          .eq('id', queueItem.id);

        stats.errors++;
      }

    } catch (error) {
      console.error(`❌ Error processing ${queueItem.url}:`, error);
      
      await supabase
        .from('org_crawl_queue')
        .update({ 
          status: 'failed',
          last_error: error.message,
          attempts: queueItem.attempts + 1
        })
        .eq('id', queueItem.id);

      stats.errors++;
    }

    processed++;
    
    // Rate limiting
    if (processed < MAX_PAGES) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }
  }
}

async function fetchPage(url: string, orgId: string, domain: any) {
  try {
    console.log(`📄 Fetching: ${url}`);

    // Check if page already exists and is recent
    const { data: existing } = await supabase
      .from('org_pages')
      .select('*')
      .eq('org_id', orgId)
      .eq('url', url)
      .single();

    const headers: Record<string, string> = {
      'User-Agent': 'MaturionBot/1.0 (+support@apginc.ca)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    // Use ETag/If-Modified-Since for caching
    if (existing?.etag) {
      headers['If-None-Match'] = existing.etag;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    // 304 Not Modified - content unchanged
    if (response.status === 304) {
      console.log(`💾 Page unchanged (304): ${url}`);
      return { success: true, cached: true };
    }

    if (!response.ok) {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Only process HTML and PDFs
    if (!contentType.includes('text/html') && !contentType.includes('application/pdf')) {
      return { 
        success: false, 
        error: `Unsupported content type: ${contentType}` 
      };
    }

    const content = await response.text();
    const etag = response.headers.get('etag');

    // Extract text and links
    const { text, title, links } = await extractContent(content, contentType);
    
    // Create content hash for deduplication
    const htmlHash = await hashContent(content);

    // Check if content changed
    if (existing && existing.html_hash === htmlHash) {
      console.log(`💾 Content unchanged (same hash): ${url}`);
      // Update fetch time but keep existing content
      await supabase
        .from('org_pages')
        .update({
          fetched_at: new Date().toISOString(),
          etag
        })
        .eq('id', existing.id);
      
      return { success: true, cached: true };
    }

    // Insert/update page
    await supabase
      .from('org_pages')
      .upsert({
        org_id: orgId,
        url,
        domain: domain.domain,
        title,
        text,
        html_hash: htmlHash,
        fetched_at: new Date().toISOString(),
        etag,
        content_type: contentType,
        robots_index: true // TODO: Check robots meta tag
      }, { onConflict: 'org_id,url' });

    console.log(`✅ Page saved: ${url} (${text.length} chars)`);

    return { 
      success: true, 
      links,
      text
    };

  } catch (error) {
    console.error(`❌ Fetch error for ${url}:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function extractContent(html: string, contentType: string) {
  if (contentType.includes('application/pdf')) {
    // For PDFs, return basic info (full PDF processing in extract-and-index)
    return {
      text: 'PDF document - content will be extracted during indexing',
      title: 'PDF Document',
      links: []
    };
  }

  // Basic HTML text extraction (Readability.js equivalent)
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Extract title
  const titleEl = doc.querySelector('title');
  const title = titleEl?.textContent?.trim() || 'Untitled';

  // Extract main content (simple heuristic)
  const contentSelectors = [
    'main', 
    'article', 
    '.content', 
    '.main-content',
    '#content',
    '#main'
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    contentElement = doc.querySelector(selector);
    if (contentElement) break;
  }

  // Fallback to body if no main content found
  if (!contentElement) {
    contentElement = doc.body;
  }

  // Remove unwanted elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    '.ad', '.advertisement', '.social-share', '.comments'
  ];

  unwantedSelectors.forEach(selector => {
    contentElement?.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Extract text
  const text = contentElement?.textContent
    ?.replace(/\s+/g, ' ')
    ?.trim() || '';

  // Extract links
  const links = Array.from(doc.querySelectorAll('a[href]'))
    .map(a => {
      const href = (a as HTMLAnchorElement).href;
      try {
        return new URL(href).toString();
      } catch {
        return null;
      }
    })
    .filter((href): href is string => 
      href !== null && 
      (href.startsWith('http://') || href.startsWith('https://'))
    )
    .slice(0, 20); // Limit links per page

  return { text, title, links };
}

function isInternalLink(url: string, baseDomain: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === baseDomain || urlObj.hostname.endsWith(`.${baseDomain}`);
  } catch {
    return false;
  }
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
