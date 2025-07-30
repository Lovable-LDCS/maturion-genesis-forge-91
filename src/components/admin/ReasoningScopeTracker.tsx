import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, FileText, CheckCircle, AlertCircle, Globe } from 'lucide-react';

interface ReasoningDocument {
  id: string;
  title: string;
  document_type: string;
  processing_status: string;
  total_chunks: number;
  created_at: string;
  tags: string | null;
}

export function ReasoningScopeTracker() {
  const [documents, setDocuments] = useState<ReasoningDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReasoningDocuments();
  }, []);

  const fetchReasoningDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('id, title, document_type, processing_status, total_chunks, created_at, tags')
        .in('document_type', [
          'governance_reasoning_manifest',
          'ai_logic_rule_global',
          'system_instruction'
        ])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching reasoning documents:', error);
      toast({
        title: "Error",
        description: "Failed to load reasoning documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPlatformTag = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('ai_documents')
        .update({ 
          tags: '🧠 Platform Anchor Logic',
          metadata: {
            reasoning_scope: 'global_platform_logic',
            inheritance_level: 'primary'
          }
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document tagged as Platform Anchor Logic",
      });

      fetchReasoningDocuments();
    } catch (error) {
      console.error('Error adding platform tag:', error);
      toast({
        title: "Error",
        description: "Failed to update document tags",
        variant: "destructive",
      });
    }
  };

  const getDocumentIcon = (docType: string) => {
    switch (docType) {
      case 'governance_reasoning_manifest':
        return <Brain className="h-4 w-4" />;
      case 'ai_logic_rule_global':
        return <Globe className="h-4 w-4" />;
      case 'system_instruction':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string, chunks: number) => {
    if (status === 'completed' && chunks > 0) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getDocumentTypeLabel = (docType: string) => {
    switch (docType) {
      case 'governance_reasoning_manifest':
        return 'Governance Manifest';
      case 'ai_logic_rule_global':
        return 'Global Logic Rule';
      case 'system_instruction':
        return 'System Instruction';
      default:
        return docType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Reasoning Scope Tracker
          </CardTitle>
          <CardDescription>
            Loading reasoning documents...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Reasoning Scope Tracker
        </CardTitle>
        <CardDescription>
          Track and manage AI reasoning architecture documents and their inheritance scope
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reasoning documents found
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getDocumentIcon(doc.document_type)}
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(doc.document_type)} • {doc.total_chunks} chunks
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.processing_status, doc.total_chunks)}
                  
                  {doc.tags?.includes('🧠 Platform Anchor Logic') ? (
                    <Badge variant="default" className="bg-primary">
                      🧠 Platform Anchor Logic
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPlatformTag(doc.id)}
                      disabled={doc.processing_status !== 'completed' || doc.total_chunks === 0}
                    >
                      Add Platform Tag
                    </Button>
                  )}
                  
                  <Badge variant="outline">
                    {doc.processing_status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}