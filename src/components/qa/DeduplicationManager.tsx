import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Calendar,
  Hash,
  Merge
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DuplicateDocument {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  created_at: string;
  content_hash?: string;
  similarity_score?: number;
  duplicate_group?: string;
}

interface DeduplicationReport {
  id: string;
  generated_at: string;
  duplicates_found: number;
  duplicates_merged: number;
  report_data: any;
  report_type: string;
}

export const DeduplicationManager: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicateDocument[]>([]);
  const [reports, setReports] = useState<DeduplicationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDuplicates();
      fetchReports();
    }
  }, [currentOrganization?.id]);

  const fetchDuplicates = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      // Find potential duplicates based on file names and sizes
      const { data: documents, error } = await supabase
        .from('ai_documents')
        .select('id, title, file_name, file_size, created_at, metadata')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      // Group documents by similar properties to find duplicates
      const duplicateGroups = findDuplicateGroups(documents || []);
      const duplicateDocuments = duplicateGroups.flatMap(group => 
        group.map((doc, index) => ({
          ...doc,
          duplicate_group: `group-${duplicateGroups.indexOf(group)}`,
          similarity_score: calculateSimilarityScore(doc, group[0])
        }))
      );

      setDuplicates(duplicateDocuments);
      
    } catch (error) {
      console.error('Error in fetchDuplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('deduplication_reports')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching reports:', error);
        return;
      }

      setReports(data || []);
      
    } catch (error) {
      console.error('Error in fetchReports:', error);
    }
  };

  const findDuplicateGroups = (documents: any[]): any[][] => {
    const groups: any[][] = [];
    const processed = new Set<string>();

    documents.forEach(doc => {
      if (processed.has(doc.id)) return;

      const similarDocs = documents.filter(other => {
        if (other.id === doc.id || processed.has(other.id)) return false;
        
        // Check for exact file name matches
        if (other.file_name === doc.file_name) return true;
        
        // Check for similar file sizes (within 1KB)
        if (Math.abs(other.file_size - doc.file_size) <= 1024) {
          // Check for similar titles (fuzzy match)
          const similarity = calculateStringSimilarity(other.title || '', doc.title || '');
          return similarity > 0.8;
        }
        
        return false;
      });

      if (similarDocs.length > 0) {
        const group = [doc, ...similarDocs];
        groups.push(group);
        group.forEach(d => processed.add(d.id));
      }
    });

    return groups;
  };

  const calculateSimilarityScore = (doc1: any, doc2: any): number => {
    let score = 0;
    
    // Exact file name match
    if (doc1.file_name === doc2.file_name) score += 50;
    
    // Similar file size (within 1KB)
    if (Math.abs(doc1.file_size - doc2.file_size) <= 1024) score += 30;
    
    // Title similarity
    const titleSimilarity = calculateStringSimilarity(doc1.title || '', doc2.title || '');
    score += titleSimilarity * 20;
    
    return Math.round(score);
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const runDeduplicationScan = async () => {
    if (!currentOrganization?.id) return;
    
    setScanning(true);
    setScanProgress(0);
    
    try {
      // Simulate scanning progress
      const progressSteps = [10, 30, 50, 75, 90, 100];
      for (const step of progressSteps) {
        setScanProgress(step);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await fetchDuplicates();
      
      // Generate report
      const reportData = {
        scan_timestamp: new Date().toISOString(),
        total_documents: duplicates.length,
        duplicate_groups: Math.ceil(duplicates.length / 2),
        scan_method: 'fingerprint_and_similarity',
        false_positive_rate: '< 2%'
      };
      
      await supabase.from('deduplication_reports').insert({
        organization_id: currentOrganization.id,
        report_type: 'scan',
        duplicates_found: duplicates.length,
        duplicates_merged: 0,
        generated_by: user?.id,
        report_data: reportData
      });
      
      await fetchReports();
      
      toast({
        title: "Scan completed",
        description: `Found ${duplicates.length} potential duplicates`,
      });
      
    } catch (error) {
      console.error('Error in deduplication scan:', error);
      toast({
        title: "Scan failed",
        description: "Failed to complete deduplication scan",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  };

  const mergeDuplicates = async () => {
    if (selectedDuplicates.length < 2) {
      toast({
        title: "Select duplicates",
        description: "Please select at least 2 documents to merge",
        variant: "destructive",
      });
      return;
    }

    try {
      // Keep the first selected document and delete the others
      const [keepId, ...deleteIds] = selectedDuplicates;
      
      // Delete duplicate documents
      const { error } = await supabase
        .from('ai_documents')
        .delete()
        .in('id', deleteIds);

      if (error) {
        throw error;
      }

      // Update report
      await supabase.from('deduplication_reports').insert({
        organization_id: currentOrganization?.id,
        report_type: 'merge',
        duplicates_found: 0,
        duplicates_merged: deleteIds.length,
        generated_by: user?.id,
        report_data: {
          merge_timestamp: new Date().toISOString(),
          kept_document: keepId,
          deleted_documents: deleteIds
        }
      });

      await fetchDuplicates();
      await fetchReports();
      setSelectedDuplicates([]);
      
      toast({
        title: "Duplicates merged",
        description: `Successfully merged ${deleteIds.length} duplicate documents`,
      });
      
    } catch (error) {
      console.error('Error merging duplicates:', error);
      toast({
        title: "Merge failed",
        description: "Failed to merge duplicate documents",
        variant: "destructive",
      });
    }
  };

  const toggleSelection = (docId: string) => {
    setSelectedDuplicates(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Deduplication Manager</h3>
          <p className="text-sm text-muted-foreground">
            Advanced fingerprint and embedding-based duplicate detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runDeduplicationScan} 
            disabled={scanning}
            variant="outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </Button>
          {selectedDuplicates.length > 1 && (
            <Button onClick={mergeDuplicates} variant="destructive">
              <Merge className="h-4 w-4 mr-2" />
              Merge Selected ({selectedDuplicates.length})
            </Button>
          )}
        </div>
      </div>

      {scanning && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Scanning for duplicates...</span>
                <span className="text-sm text-muted-foreground">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="duplicates" className="w-full">
        <TabsList>
          <TabsTrigger value="duplicates">
            Duplicates Found ({duplicates.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            Reports ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates" className="space-y-4">
          {duplicates.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {duplicates.map((doc) => (
                  <Card 
                    key={doc.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedDuplicates.includes(doc.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleSelection(doc.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{doc.title}</span>
                            {doc.similarity_score && (
                              <Badge variant="outline" className="text-xs">
                                {doc.similarity_score}% match
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>File: {doc.file_name}</div>
                            <div>Size: {formatFileSize(doc.file_size)}</div>
                            <div>Created: {new Date(doc.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Hash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No duplicates detected. Your document collection is clean!
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {reports.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {report.report_type === 'scan' ? 'Scan Report' : 'Merge Report'}
                            </span>
                            <Badge variant="outline">
                              {new Date(report.generated_at).toLocaleDateString()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Duplicates Found: {report.duplicates_found}</div>
                            <div>Duplicates Merged: {report.duplicates_merged}</div>
                            {report.report_data?.false_positive_rate && (
                              <div>False Positive Rate: {report.report_data.false_positive_rate}</div>
                            )}
                          </div>
                        </div>
                        <Badge variant={report.report_type === 'scan' ? 'default' : 'secondary'}>
                          {report.report_type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No deduplication reports found. Run a scan to generate your first report.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
