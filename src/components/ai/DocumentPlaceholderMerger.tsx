import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, FileText, Search, Replace, CheckCircle, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentWithPlaceholders {
  id: string;
  title: string;
  file_name: string;
  placeholders: PlaceholderMatch[];
  content_chunks: string[];
}

interface PlaceholderMatch {
  placeholder_text: string;
  referenced_file: string;
  chunk_index: number;
  found_source: boolean;
  source_document_id?: string;
}

interface SourceDocument {
  id: string;
  title: string;
  file_name: string;
  content: string;
}

export const DocumentPlaceholderMerger: React.FC = () => {
  const [documentsWithPlaceholders, setDocumentsWithPlaceholders] = useState<DocumentWithPlaceholders[]>([]);
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResults, setScanResults] = useState<string>('');
  const { toast } = useToast();

  // Scan for documents with placeholders
  const scanForPlaceholders = async () => {
    setLoading(true);
    setScanResults('Scanning for placeholder content...\n');
    
    try {
      // Get recent documents (last 24 hours)
      const { data: recentDocs, error: docsError } = await supabase
        .from('ai_documents')
        .select('id, title, file_name, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      setScanResults(prev => prev + `Found ${recentDocs?.length || 0} recent documents to scan...\n`);

      const docsWithPlaceholders: DocumentWithPlaceholders[] = [];
      
      for (const doc of recentDocs || []) {
        // Get document chunks
        const { data: chunks, error: chunksError } = await supabase
          .from('ai_document_chunks')
          .select('content, chunk_index')
          .eq('document_id', doc.id)
          .order('chunk_index');

        if (chunksError) continue;

        const allContent = chunks?.map(c => c.content).join('\n') || '';
        const placeholderMatches: PlaceholderMatch[] = [];

        // Look for placeholder patterns
        const placeholderRegex = /\[Placeholder for merged content from:\s*([^\]]+)\]/gi;
        let match;
        
        while ((match = placeholderRegex.exec(allContent)) !== null) {
          const referencedFile = match[1].trim();
          placeholderMatches.push({
            placeholder_text: match[0],
            referenced_file: referencedFile,
            chunk_index: chunks?.findIndex(c => c.content.includes(match[0])) || 0,
            found_source: false
          });
        }

        if (placeholderMatches.length > 0) {
          docsWithPlaceholders.push({
            id: doc.id,
            title: doc.title || doc.file_name,
            file_name: doc.file_name,
            placeholders: placeholderMatches,
            content_chunks: chunks?.map(c => c.content) || []
          });
          
          setScanResults(prev => prev + `📄 ${doc.title || doc.file_name}: Found ${placeholderMatches.length} placeholders\n`);
          placeholderMatches.forEach(p => {
            setScanResults(prev => prev + `  → References: ${p.referenced_file}\n`);
          });
        }
      }

      setDocumentsWithPlaceholders(docsWithPlaceholders);
      setScanResults(prev => prev + `\n✅ Scan complete: ${docsWithPlaceholders.length} documents need placeholder replacement\n`);

      // Now find source documents
      await findSourceDocuments(docsWithPlaceholders);

    } catch (error) {
      console.error('Error scanning for placeholders:', error);
      setScanResults(prev => prev + `❌ Error during scan: ${error}\n`);
      toast({
        title: "Scan Error",
        description: "Failed to scan for placeholder documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const findSourceDocuments = async (docsWithPlaceholders: DocumentWithPlaceholders[]) => {
    setScanResults(prev => prev + '\nSearching for source documents...\n');
    
    // Get all referenced filenames
    const referencedFiles = new Set<string>();
    docsWithPlaceholders.forEach(doc => {
      doc.placeholders.forEach(p => {
        referencedFiles.add(p.referenced_file);
      });
    });

    const foundSources: SourceDocument[] = [];

    for (const filename of referencedFiles) {
      // Search for documents with matching filenames
      const { data: matchingDocs, error } = await supabase
        .from('ai_documents')
        .select('id, title, file_name')
        .or(`file_name.ilike.%${filename.replace(/\.[^.]*$/, '')}%,title.ilike.%${filename.replace(/\.[^.]*$/, '')}%`)
        .eq('processing_status', 'completed');

      if (error) continue;

      for (const doc of matchingDocs || []) {
        // Get full content
        const { data: chunks } = await supabase
          .from('ai_document_chunks')
          .select('content')
          .eq('document_id', doc.id)
          .order('chunk_index');

        if (chunks && chunks.length > 0) {
          const content = chunks.map(c => c.content).join('\n\n');
          
          // Only include if content seems valid (not corrupted)
          if (content.length > 100 && !content.includes('PK') && !content.includes('word/')) {
            foundSources.push({
              id: doc.id,
              title: doc.title || doc.file_name,
              file_name: doc.file_name,
              content
            });
            
            setScanResults(prev => prev + `✅ Found source: ${doc.file_name}\n`);
          } else {
            setScanResults(prev => prev + `⚠️ Source corrupted: ${doc.file_name} (needs reprocessing)\n`);
          }
        }
      }
    }

    setSourceDocuments(foundSources);
    
    // Update placeholder matches with found sources
    const updatedDocs = docsWithPlaceholders.map(doc => ({
      ...doc,
      placeholders: doc.placeholders.map(p => {
        const sourceDoc = foundSources.find(s => 
          s.file_name.toLowerCase().includes(p.referenced_file.toLowerCase().replace('.docx', '')) ||
          p.referenced_file.toLowerCase().includes(s.file_name.toLowerCase().replace('.docx', ''))
        );
        return {
          ...p,
          found_source: !!sourceDoc,
          source_document_id: sourceDoc?.id
        };
      })
    }));

    setDocumentsWithPlaceholders(updatedDocs);
    setScanResults(prev => prev + `\n📊 Found ${foundSources.length} source documents for replacement\n`);
  };

  const performPlaceholderReplacement = async () => {
    setProcessing(true);
    setProgress(0);
    
    try {
      const totalReplacements = documentsWithPlaceholders.reduce((sum, doc) => 
        sum + doc.placeholders.filter(p => p.found_source).length, 0
      );
      
      let completedReplacements = 0;

      for (const doc of documentsWithPlaceholders) {
        setScanResults(prev => prev + `\n🔄 Processing: ${doc.title}\n`);
        
        let updatedContent = doc.content_chunks.join('\n\n');

        for (const placeholder of doc.placeholders) {
          if (placeholder.found_source && placeholder.source_document_id) {
            const sourceDoc = sourceDocuments.find(s => s.id === placeholder.source_document_id);
            if (sourceDoc) {
              // Replace the placeholder with actual content
              updatedContent = updatedContent.replace(
                placeholder.placeholder_text,
                `\n\n--- Content from ${sourceDoc.file_name} ---\n\n${sourceDoc.content}\n\n--- End of merged content ---\n\n`
              );
              
              setScanResults(prev => prev + `  ✅ Replaced placeholder for ${sourceDoc.file_name}\n`);
              completedReplacements++;
              setProgress((completedReplacements / totalReplacements) * 100);
            }
          }
        }

        // Now we need to update the document with the merged content
        // For now, let's create a new document with the merged content
        await createMergedDocument(doc, updatedContent);
      }

      setScanResults(prev => prev + `\n🎉 Completed ${completedReplacements} placeholder replacements!\n`);
      
      toast({
        title: "Merge Complete",
        description: `Successfully merged content for ${documentsWithPlaceholders.length} documents`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error during placeholder replacement:', error);
      setScanResults(prev => prev + `❌ Error during replacement: ${error}\n`);
      toast({
        title: "Merge Error",
        description: "Failed to complete placeholder replacement",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const createMergedDocument = async (originalDoc: DocumentWithPlaceholders, mergedContent: string) => {
    try {
      // Get current user and organization info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get existing document's organization
      const { data: existingDoc } = await supabase
        .from('ai_documents')
        .select('organization_id')
        .eq('id', originalDoc.id)
        .single();

      if (!existingDoc?.organization_id) throw new Error('No organization found for original document');

      // Create a new document entry with merged content
      const newTitle = `${originalDoc.title} (Merged)`;
      const newFileName = originalDoc.file_name.replace('.docx', '_merged.txt');
      
      const { data: newDoc, error: docError } = await supabase
        .from('ai_documents')
        .insert([{
          title: newTitle,
          file_name: newFileName,
          file_path: `merged/${newFileName}`,
          file_size: mergedContent.length,
          mime_type: 'text/plain',
          document_type: 'governance_reasoning_manifest',
          processing_status: 'completed',
          upload_notes: `Auto-merged document from ${originalDoc.title} with placeholder content replaced`,
          total_chunks: 1,
          organization_id: existingDoc.organization_id,
          uploaded_by: user.id,
          updated_by: user.id
        }])
        .select()
        .single();

      if (docError) throw docError;

      // Create a single chunk with the merged content
      const { error: chunkError } = await supabase
        .from('ai_document_chunks')
        .insert([{
          document_id: newDoc.id,
          chunk_index: 0,
          content: mergedContent,
          content_hash: `merged_${Date.now()}`,
          organization_id: existingDoc.organization_id
        }]);

      if (chunkError) throw chunkError;

      setScanResults(prev => prev + `  📄 Created merged document: ${newTitle}\n`);
      
    } catch (error) {
      console.error('Error creating merged document:', error);
      setScanResults(prev => prev + `  ❌ Failed to create merged document for ${originalDoc.title}\n`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Replace className="h-5 w-5" />
            Document Placeholder Merger
          </CardTitle>
          <CardDescription>
            Scan for documents with placeholders and merge them with referenced source content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={scanForPlaceholders} disabled={loading} className="flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Scanning...' : 'Scan for Placeholders'}
            </Button>
            
            {documentsWithPlaceholders.length > 0 && (
              <Button 
                onClick={performPlaceholderReplacement} 
                disabled={processing}
                variant="default"
                className="flex items-center gap-2"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
                {processing ? 'Merging...' : 'Merge Placeholders'}
              </Button>
            )}
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing placeholder replacements...
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {documentsWithPlaceholders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents with Placeholders ({documentsWithPlaceholders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentsWithPlaceholders.map((doc, index) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{doc.title}</h4>
                    <Badge variant="outline">{doc.placeholders.length} placeholders</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {doc.placeholders.map((placeholder, pIndex) => (
                      <div key={pIndex} className="flex items-center gap-2 text-sm">
                        {placeholder.found_source ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                          {placeholder.referenced_file}
                        </span>
                        <span className={placeholder.found_source ? 'text-green-600' : 'text-yellow-600'}>
                          {placeholder.found_source ? 'Source found' : 'Source missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Documents */}
      {sourceDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Available Source Documents ({sourceDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourceDocuments.map((source, index) => (
                <div key={source.id} className="border rounded-lg p-3">
                  <div className="font-semibold text-sm">{source.title}</div>
                  <div className="text-xs text-muted-foreground">{source.file_name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.ceil(source.content.length / 1000)}k characters
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results Log */}
      {scanResults && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={scanResults}
              readOnly
              className="font-mono text-xs h-64 resize-none"
              placeholder="Scan results will appear here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};