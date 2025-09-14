import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { 
  Globe, 
  Play, 
  Plus, 
  Trash2, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface OrgDomain {
  id: string;
  domain: string;
  crawl_depth: number;
  recrawl_hours: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DomainStats {
  pages: number;
  chunks: number;
  lastCrawl?: string;
  nextCrawl?: string;
  queueDepth: number;
}

export const OrganizationDomainsPanel = () => {
  const [domains, setDomains] = useState<OrgDomain[]>([]);
  const [stats, setStats] = useState<Record<string, DomainStats>>({});
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState({
    domain: '',
    crawl_depth: 2,
    recrawl_hours: 168
  });
  
  const { toast } = useToast();
  const { currentContext } = useOrganizationContext();

  useEffect(() => {
    if (currentContext?.organization_id) {
      loadDomains();
    }
  }, [currentContext?.organization_id]);

  const loadDomains = async () => {
    try {
      setLoading(true);
      
      // Load domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('org_domains')
        .select('*')
        .eq('org_id', currentContext?.organization_id)
        .order('created_at', { ascending: false });

      if (domainsError) throw domainsError;

      setDomains(domainsData || []);

      // Load stats for each domain
      if (domainsData && domainsData.length > 0) {
        await loadDomainStats(domainsData);
      }
      
    } catch (error) {
      console.error('Error loading domains:', error);
      toast({
        title: 'Error',
        description: 'Failed to load domains',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDomainStats = async (domainsData: OrgDomain[]) => {
    try {
      const statsPromises = domainsData.map(async (domain) => {
        // Get page count
        const { count: pageCount } = await supabase
          .from('org_pages')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentContext?.organization_id)
          .eq('domain', domain.domain);

        // Get chunk count
        const { count: chunkCount } = await supabase
          .from('org_page_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentContext?.organization_id);

        // Get queue depth
        const { count: queueDepth } = await supabase
          .from('org_crawl_queue')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentContext?.organization_id)
          .eq('status', 'queued');

        // Get last crawl time
        const { data: lastPage } = await supabase
          .from('org_pages')
          .select('fetched_at')
          .eq('org_id', currentContext?.organization_id)
          .eq('domain', domain.domain)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single();

        const lastCrawl = lastPage?.fetched_at;
        let nextCrawl = null;
        
        if (lastCrawl) {
          const nextCrawlDate = new Date(lastCrawl);
          nextCrawlDate.setHours(nextCrawlDate.getHours() + domain.recrawl_hours);
          nextCrawl = nextCrawlDate.toISOString();
        }

        return [domain.id, {
          pages: pageCount || 0,
          chunks: chunkCount || 0,
          lastCrawl,
          nextCrawl,
          queueDepth: queueDepth || 0
        }];
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = Object.fromEntries(statsResults);
      setStats(statsMap);
      
    } catch (error) {
      console.error('Error loading domain stats:', error);
    }
  };

  const addDomain = async () => {
    if (!newDomain.domain.trim()) return;

    try {
      const { error } = await supabase
        .from('org_domains')
        .insert({
          org_id: currentContext?.organization_id,
          organization_id: currentContext?.organization_id,
          domain: newDomain.domain.toLowerCase().replace(/^https?:\/\//, ''),
          crawl_depth: newDomain.crawl_depth,
          recrawl_hours: newDomain.recrawl_hours,
          is_enabled: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Domain added successfully'
      });

      setNewDomain({ domain: '', crawl_depth: 2, recrawl_hours: 168 });
      loadDomains();
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add domain',
        variant: 'destructive'
      });
    }
  };

  const toggleDomain = async (domainId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('org_domains')
        .update({ is_enabled: enabled })
        .eq('id', domainId);

      if (error) throw error;

      setDomains(prev => prev.map(d => 
        d.id === domainId ? { ...d, is_enabled: enabled } : d
      ));

      toast({
        title: 'Success',
        description: `Domain ${enabled ? 'enabled' : 'disabled'}`
      });
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update domain',
        variant: 'destructive'
      });
    }
  };

  const runCrawl = async (domainId: string, domain: string) => {
    try {
      setCrawling(domainId);
      
      const { data, error } = await supabase.functions.invoke('crawl-org-domain', {
        body: {
          orgId: currentContext?.organization_id,
          domainId,
          priority: 200
        }
      });

      if (error) throw error;

      toast({
        title: 'Crawl Started',
        description: `Crawling ${domain}...`
      });

      // Refresh stats after a delay
      setTimeout(() => {
        loadDomains();
      }, 5000);
      
    } catch (error: any) {
      console.error('Crawl error:', error);
      toast({
        title: 'Crawl Failed', 
        description: error.message || 'Failed to start crawl',
        variant: 'destructive'
      });
    } finally {
      setCrawling(null);
    }
  };

  const seedDeBeersData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('seed-debeers-domains');

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Seeded ${data.domainsSeeded} De Beers domains`
      });

      loadDomains();
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to seed domains',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (nextCrawl?: string) => {
    if (!nextCrawl) return false;
    return new Date(nextCrawl) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Organization Domains
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Organization Domains
          </CardTitle>
          <CardDescription>
            Manage domains for web crawling and content ingestion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newDomain.domain}
                onChange={(e) => setNewDomain(prev => ({ ...prev, domain: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="depth">Crawl Depth</Label>
              <Input
                id="depth"
                type="number"
                min="1"
                max="5"
                value={newDomain.crawl_depth}
                onChange={(e) => setNewDomain(prev => ({ ...prev, crawl_depth: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="hours">Recrawl Hours</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                value={newDomain.recrawl_hours}
                onChange={(e) => setNewDomain(prev => ({ ...prev, recrawl_hours: parseInt(e.target.value) }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addDomain} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          </div>
          
          <Button onClick={seedDeBeersData} variant="outline" className="mb-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Seed De Beers Domains
          </Button>
        </CardContent>
      </Card>

      {/* Domains List */}
      {domains.length > 0 ? (
        <div className="grid gap-4">
          {domains.map((domain) => {
            const domainStats = stats[domain.id] || { pages: 0, chunks: 0, queueDepth: 0 };
            const overdue = isOverdue(domainStats.nextCrawl);
            
            return (
              <Card key={domain.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">{domain.domain}</h3>
                        <p className="text-sm text-muted-foreground">
                          Depth: {domain.crawl_depth} • Recrawl: every {domain.recrawl_hours}h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={domain.is_enabled}
                        onCheckedChange={(enabled) => toggleDomain(domain.id, enabled)}
                      />
                      <Button
                        size="sm"
                        onClick={() => runCrawl(domain.id, domain.domain)}
                        disabled={!domain.is_enabled || crawling === domain.id}
                      >
                        {crawling === domain.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Run Now
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{domainStats.pages} pages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-primary/20 rounded" />
                      <span>{domainStats.chunks} chunks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Last: {formatDate(domainStats.lastCrawl)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {overdue ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                      <span className={overdue ? 'text-destructive' : ''}>
                        Next: {formatDate(domainStats.nextCrawl)}
                      </span>
                    </div>
                  </div>

                  {domainStats.queueDepth > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">
                        {domainStats.queueDepth} URLs queued
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No domains configured</h3>
            <p className="text-muted-foreground">
              Add domains above to start crawling organizational web content
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};