import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DE_BEERS_ORG_ID = 'e443d914-8756-4b29-9599-6a59230b87f3';

export const DKPOrgCrawlTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({});
  const { toast } = useToast();

  const runCrawlSequence = async () => {
    setLoading(true);
    setResults({});
    
    try {
      // Step 1: Seed De Beers domains
      toast({ title: "Step 1: Seeding De Beers domains..." });
      const { data: seedResult, error: seedError } = await supabase.functions.invoke('seed-debeers-domains', {
        body: { org_id: DE_BEERS_ORG_ID }
      });
      
      if (seedError) throw seedError;
      setResults(prev => ({ ...prev, seed: seedResult }));
      toast({ title: "✅ Domains seeded successfully" });

      // Step 2: Crawl domains
      toast({ title: "Step 2: Starting crawl..." });
      const { data: crawlResult, error: crawlError } = await supabase.functions.invoke('crawl-org-domain', {
        body: { orgId: DE_BEERS_ORG_ID }
      });
      
      if (crawlError) throw crawlError;
      setResults(prev => ({ ...prev, crawl: crawlResult }));
      toast({ title: "✅ Crawl completed" });

      // Step 3: Extract and index
      toast({ title: "Step 3: Extracting and indexing..." });
      const { data: extractResult, error: extractError } = await supabase.functions.invoke('extract-and-index', {
        body: { orgId: DE_BEERS_ORG_ID }
      });
      
      if (extractError) throw extractError;
      setResults(prev => ({ ...prev, extract: extractResult }));
      toast({ title: "✅ Extraction completed" });

      // Step 4: get-crawl-status (Gate C evidence)
      const { data: statusData, error: statusErr } = await supabase.functions.invoke('get-crawl-status', {
        body: { orgId: DE_BEERS_ORG_ID }
      });
      if (statusErr) throw statusErr;
      
      // Gate C console logging for QA evidence
      console.log('[Gate C] get-crawl-status response:', statusData);

      // Step 5: Verify results with direct queries
      toast({ title: "Step 5: Verifying results..." });
      
      const { data: pagesData } = await supabase
        .from('org_pages')
        .select('id')
        .eq('org_id', DE_BEERS_ORG_ID);
        
      const { data: chunksData } = await supabase
        .from('org_page_chunks') 
        .select('id')
        .eq('org_id', DE_BEERS_ORG_ID);
        
      const { data: jobsData } = await supabase
        .from('org_ingest_jobs')
        .select('*')
        .eq('org_id', DE_BEERS_ORG_ID)
        .order('started_at', { ascending: false })
        .limit(3);

      // Step 6: List AI documents created by crawl with chunks > 0
      const { data: crawlDocs } = await supabase
        .from('ai_documents')
        .select('id, title, document_type, tags, total_chunks')
        .eq('organization_id', DE_BEERS_ORG_ID)
        .or('document_type.eq.web_crawl,tags.ilike.%crawl:web%')
        .gt('total_chunks', 0);
      
      setResults(prev => ({ 
        ...prev, 
        status: statusData,
        verification: {
          pages: pagesData?.length || 0,
          chunks: chunksData?.length || 0,
          jobs: jobsData
        },
        crawlDocuments: crawlDocs || []
      }));
      
      toast({ title: "✅ Full crawl sequence completed!", variant: "default" });

    } catch (error: any) {
      console.error('Crawl sequence error:', error);
      toast({ 
        title: "❌ Crawl sequence failed", 
        description: error.message || 'Unknown error',
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>DKP Org Crawl Test - De Beers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runCrawlSequence} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Running Crawl Sequence...' : 'Start De Beers Crawl & Extract'}
        </Button>
        
        {/* UI filters & discoverability */}
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Results:</h3>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
          
          {/* Gate C Evidence Cards */}
          {results.status && (
            <Card className={`border-2 ${results.status.state === 'success' ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${results.status.state === 'success' ? 'text-green-700' : 'text-yellow-700'}`}>
                  {results.status.state === 'success' ? 
                    <CheckCircle className="h-5 w-5" /> : 
                    <Clock className="h-5 w-5" />
                  }
                  Crawl Status: {results.status.state?.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.status.enabled_domains || 0}</div>
                    <div className="text-sm text-muted-foreground">Domains</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.verification?.pages || 0}</div>
                    <div className="text-sm text-muted-foreground">Pages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.verification?.chunks || 0}</div>
                    <div className="text-sm text-muted-foreground">Chunks</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Crawl Documents with Chunks > 0 */}
          {results.crawlDocuments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Web Crawl Documents (Chunks &gt; 0)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.crawlDocuments.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {doc.document_type} | Tags: {doc.tags?.join(', ') || 'None'}
                        </div>
                      </div>
                      <Badge variant="default">{doc.total_chunks} chunks</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};