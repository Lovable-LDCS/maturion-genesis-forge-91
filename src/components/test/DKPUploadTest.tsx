import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMaturionDocuments } from '@/hooks/useMaturionDocuments';
import { FileText, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const DKPUploadTest: React.FC = () => {
  const { toast } = useToast();
  const { uploadDocument, documents, loading } = useMaturionDocuments();
  const [uploading, setUploading] = useState(false);
  const [testContent, setTestContent] = useState(`# Diamond Knowledge Pack - Protection Controls

## Access & Scanning Requirements

### Requirement 1 — Evidence: Dual biometric authentication
- Implementation: Multi-factor biometric systems (fingerprint + iris)
- Action: Deploy dual readers at all access points
- Cadence: Daily authentication logs review by Security Manager

### Requirement 2 — Evidence: Test stone validation protocols  
- Implementation: Certified test stones for equipment calibration
- Action: Weekly calibration checks using verified test stones
- Cadence: Monthly calibration reports to Operations Director

### Requirement 3 — Evidence: Tamper detection systems
- Implementation: 24/7 monitoring with instant alert capability
- Action: Install tamper-evident seals on all scanning equipment  
- Cadence: Continuous monitoring with immediate incident response

### Requirement 4 — Evidence: Black-screen security protocols
- Implementation: Physical view restriction during sensitive operations
- Action: Deploy privacy screens and restricted viewing areas
- Cadence: Weekly compliance audits by Internal Security Team

### Requirement 5 — Evidence: Independent dual data streams
- Implementation: Separate scanning systems with cross-validation
- Action: Configure parallel data capture and verification
- Cadence: Daily data integrity checks by IT Operations

### Requirement 6 — Evidence: Anomaly detection algorithms
- Implementation: AI-powered variance monitoring systems
- Action: Set up automated threshold alerts and exceptions
- Cadence: Real-time monitoring with weekly pattern analysis

### Requirement 7 — Evidence: Remote assurance capabilities
- Implementation: Secure remote monitoring and audit access
- Action: Establish encrypted remote access protocols
- Cadence: Monthly remote audit sessions by External Auditors

### Requirement 8 — Evidence: Compartmentalized access controls
- Implementation: Role-based access with need-to-know principles
- Action: Configure granular permission matrices
- Cadence: Quarterly access reviews by Compliance Officer

### Requirement 9 — Evidence: Equipment maintenance logs
- Implementation: Comprehensive maintenance tracking system
- Action: Schedule preventive maintenance protocols
- Cadence: Monthly maintenance reviews by Technical Manager

### Requirement 10 — Evidence: Security incident response procedures
- Implementation: Documented escalation and response protocols
- Action: Establish 24/7 incident response team
- Cadence: Quarterly incident response drills and reviews`);

  const handleTestUpload = async () => {
    setUploading(true);
    try {
      const file = new File([testContent], 'DKP_Protection_Controls_Test.md', { type: 'text/markdown' });
      
      const metadata = {
        title: 'Diamond Knowledge Pack - Protection Controls Test',
        documentType: 'diamond_knowledge_pack',
        domain: 'Protection',
        tags: 'dkp:v1, industry:diamond, protection, access-control, scanning',
        visibility: 'all_users',
        description: 'Test Diamond Knowledge Pack focusing on Protection domain access and scanning requirements'
      };
      
      await uploadDocument(
        file, 
        'diamond_knowledge_pack' as any,
        'e443d914-8756-4b29-9599-6a59230b87f3', // De Beers org ID
        'dc7609db-1323-478a-8739-775f0020cac2', // Current user ID (from logs)
        metadata.title,
        metadata.domain,
        metadata.tags,
        metadata.description
      );
      
      toast({
        title: "DKP Upload Test Complete",
        description: "Diamond Knowledge Pack uploaded successfully. Watch for status changes in the documents list.",
        duration: 5000,
      });
    } catch (error) {
      console.error('Upload test failed:', error);
      toast({
        title: "Upload Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleWebCrawlTest = async () => {
    try {
      toast({
        title: "Starting Web Crawl Test",
        description: "Seeding domains and triggering crawl for De Beers org...",
        duration: 3000,
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://dmhlxhatogrrrvuruayv.supabase.co'}/functions/v1/run-web-crawl-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaGx4aGF0b2dycnJ2dXJ1YXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTQwODMsImV4cCI6MjA2ODE3MDA4M30.uBMegZGwmf8CfVqdzrT3gTSV4kcJCoQxDDra-Qd4-b0'}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Web Crawl Test Complete",
          description: `Pages: ${result.stats?.pages || 0}, Chunks: ${result.stats?.chunks || 0}`,
          duration: 8000,
        });
      } else {
        throw new Error(result.error || 'Crawl test failed');
      }
    } catch (error) {
      toast({
        title: "Web Crawl Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleHealthCheck = async () => {
    try {
      const healthChecks = [
        { name: 'crawl-org-domain', url: 'https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/crawl-org-domain/health' },
        { name: 'extract-and-index', url: 'https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/extract-and-index/health' },
        { name: 'run-web-crawl-test', url: 'https://dmhlxhatogrrrvuruayv.supabase.co/functions/v1/run-web-crawl-test/health' }
      ];

      const results = await Promise.all(
        healthChecks.map(async ({ name, url }) => {
          try {
            const response = await fetch(url);
            const data = await response.json();
            return { name, status: 'ok', data };
          } catch (error) {
            return { name, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      const allHealthy = results.every(r => r.status === 'ok');
      
      toast({
        title: allHealthy ? "All Health Checks Passed" : "Some Health Checks Failed",
        description: results.map(r => `${r.name}: ${r.status}`).join(', '),
        variant: allHealthy ? "default" : "destructive",
        duration: 8000,
      });

      console.log('Health check results:', results);
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const recentDKPDocs = documents.filter(doc => 
    (doc.document_type as any) === 'diamond_knowledge_pack' || 
    doc.tags?.includes('dkp:v1') ||
    doc.title?.toLowerCase().includes('diamond knowledge pack')
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Diamond Knowledge Pack Test Suite
          </CardTitle>
          <CardDescription>
            Test implementation of Diamond Knowledge Pack document type with auto-tagging, 
            org web ingestion, and health monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Test Content Preview */}
          <div className="space-y-2">
            <Label>Test DKP Content (Protection Domain)</Label>
            <Textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleTestUpload} 
              disabled={uploading || loading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading DKP...' : 'Test DKP Upload'}
            </Button>

            <Button 
              onClick={handleWebCrawlTest}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Run Web Crawl Test
            </Button>

            <Button 
              onClick={handleHealthCheck}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Health Check All
            </Button>
          </div>

          {/* Recent DKP Documents */}
          {recentDKPDocs.length > 0 && (
            <div className="space-y-2">
              <Label>Recent Diamond Knowledge Pack Documents</Label>
              <div className="space-y-2">
                {recentDKPDocs.slice(0, 3).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <div>
                        <div className="font-medium text-sm">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.document_type} • {doc.domain} • {doc.total_chunks || 0} chunks
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.processing_status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {doc.processing_status === 'processing' && (
                        <Clock className="h-4 w-4 text-blue-600" />
                      )}
                      {doc.processing_status === 'failed' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-xs capitalize">{doc.processing_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};