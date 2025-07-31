import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, FileText, Calendar, Tag } from 'lucide-react';

interface ExistingDocument {
  id: string;
  title: string;
  document_type: string;
  domain: string;
  tags: string;
  created_at: string;
  file_name: string;
  processing_status: string;
}

interface DocumentReplacementDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (replaceDocumentId?: string) => void;
  newDocumentTitle: string;
  newDocumentType: string;
  newDocumentDomain: string;
}

export const DocumentReplacementDialog: React.FC<DocumentReplacementDialogProps> = ({
  open,
  onClose,
  onConfirm,
  newDocumentTitle,
  newDocumentType,
  newDocumentDomain,
}) => {
  const [replaceOption, setReplaceOption] = useState<'no' | 'yes'>('no');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<ExistingDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<ExistingDocument[]>([]);
  const { toast } = useToast();

  // Fetch existing documents when dialog opens
  useEffect(() => {
    if (open) {
      fetchExistingDocuments();
    }
  }, [open]);

  // Auto-detect potential duplicates
  useEffect(() => {
    if (existingDocuments.length > 0 && newDocumentTitle) {
      detectPotentialDuplicates();
    }
  }, [existingDocuments, newDocumentTitle, newDocumentType, newDocumentDomain]);

  // Filter documents based on search with normalization
  useEffect(() => {
    if (searchTerm) {
      const normalizedSearchTerm = normalizeTitle(searchTerm);
      const filtered = existingDocuments.filter(doc => {
        const normalizedTitle = normalizeTitle(doc.title || '');
        const normalizedType = normalizeTitle(doc.document_type || '');
        const normalizedDomain = normalizeTitle(doc.domain || '');
        const normalizedTags = normalizeTitle(doc.tags || '');
        
        // Check if normalized search term is contained in any normalized field
        return normalizedTitle.includes(normalizedSearchTerm) ||
               normalizedType.includes(normalizedSearchTerm) ||
               normalizedDomain.includes(normalizedSearchTerm) ||
               normalizedTags.includes(normalizedSearchTerm) ||
               // Also check fuzzy similarity for more flexible matching
               calculateSimilarity(normalizedTitle, normalizedSearchTerm) > 0.6;
      });
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(existingDocuments);
    }
  }, [searchTerm, existingDocuments]);

  const fetchExistingDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('id, title, document_type, domain, tags, created_at, file_name, processing_status')
        .in('processing_status', ['completed', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingDocuments(data || []);
    } catch (error) {
      console.error('Error fetching existing documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch existing documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizeTitle = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      // Normalize version patterns
      .replace(/\bversion\s+(\d+(?:\.\d+)*)\b/gi, 'v$1')
      .replace(/\bver\s+(\d+(?:\.\d+)*)\b/gi, 'v$1')
      .replace(/\bv\s+(\d+(?:\.\d+)*)\b/gi, 'v$1')
      // Normalize punctuation and special characters
      .replace(/[–—−]/g, '-')  // en dash, em dash, minus to hyphen
      .replace(/['']/g, "'")   // smart quotes to regular quotes
      .replace(/[""]/g, '"')   // smart quotes to regular quotes
      .replace(/\s+/g, ' ')    // multiple spaces to single space
      .replace(/[^\w\s.-]/g, '') // remove special chars except word chars, spaces, dots, hyphens
      .trim();
  };

  const detectPotentialDuplicates = () => {
    const duplicates = existingDocuments.filter(doc => {
      // Normalize titles for comparison - add null checks
      if (!doc.title || !newDocumentTitle) return false;
      
      const normalizedExisting = normalizeTitle(doc.title);
      const normalizedNew = normalizeTitle(newDocumentTitle);
      
      // Check for exact title match after normalization
      if (normalizedExisting === normalizedNew) return true;
      
      // Check for similar title (75% match for better accuracy) and same type/domain
      const similarity = calculateSimilarity(normalizedExisting, normalizedNew);
      if (similarity > 0.75 && 
          doc.document_type === newDocumentType && 
          doc.domain === newDocumentDomain) {
        return true;
      }
      
      // Additional check: high similarity (85%+) regardless of type/domain for very similar titles
      if (similarity > 0.85) {
        return true;
      }
      
      return false;
    });

    setPotentialDuplicates(duplicates);
    
    // If duplicates found, auto-suggest replacement
    if (duplicates.length > 0) {
      setReplaceOption('yes');
      if (duplicates.length === 1) {
        setSelectedDocumentId(duplicates[0].id);
      }
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
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

  const handleConfirm = () => {
    if (replaceOption === 'yes' && !selectedDocumentId) {
      toast({
        title: "Selection Required",
        description: "Please select a document to replace",
        variant: "destructive",
      });
      return;
    }

    onConfirm(replaceOption === 'yes' ? selectedDocumentId : undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Version Management</DialogTitle>
          <DialogDescription>
            Does this file replace an existing document in the knowledge base?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New Document Info */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2">New Document:</h3>
            <div className="text-sm space-y-1">
              <div><strong>Title:</strong> {newDocumentTitle}</div>
              <div><strong>Type:</strong> {newDocumentType}</div>
              <div><strong>Domain:</strong> {newDocumentDomain}</div>
            </div>
          </div>

          {/* Potential Duplicates Warning */}
          {potentialDuplicates.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <h3 className="font-medium text-amber-800">Potential Duplicates Detected</h3>
              </div>
              <p className="text-sm text-amber-700 mb-3">
                Found {potentialDuplicates.length} existing document(s) with similar title and metadata. 
                Consider replacing to avoid duplicates.
              </p>
              <div className="space-y-2">
                 {potentialDuplicates.map(doc => (
                   <div key={doc.id} className="text-xs bg-white p-2 rounded border">
                     <div className="flex items-center justify-between">
                       <strong>{doc.title}</strong>
                       {doc.processing_status === 'failed' && (
                         <span className="text-red-600 font-medium text-xs">FAILED</span>
                       )}
                     </div>
                     <div className="text-muted-foreground">
                       {doc.document_type} • {doc.domain} • {formatDate(doc.created_at)}
                       {doc.processing_status === 'failed' && ' • Processing failed'}
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* Replace Option */}
          <RadioGroup value={replaceOption} onValueChange={(value: 'no' | 'yes') => setReplaceOption(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no">No - Upload as new document</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes">Yes - Replace an existing document</Label>
            </div>
          </RadioGroup>

          {/* Document Selection */}
          {replaceOption === 'yes' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">Search existing documents</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by title, type, domain, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>

              {/* No Results Message */}
              {searchTerm && filteredDocuments.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 mb-3">
                    ⚠️ No matching documents found. You may upload this as a new document instead.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setReplaceOption('no');
                      setSearchTerm('');
                      setSelectedDocumentId('');
                    }}
                  >
                    Switch to "Upload as New"
                  </Button>
                </div>
              )}

              <div>
                <Label htmlFor="document-select">Select document to replace</Label>
                <Select 
                  value={selectedDocumentId} 
                  onValueChange={setSelectedDocumentId}
                  disabled={filteredDocuments.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      filteredDocuments.length === 0 
                        ? "No documents found" 
                        : "Choose a document to replace"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                     {filteredDocuments.map((doc) => (
                       <SelectItem key={doc.id} value={doc.id}>
                         <div className="flex flex-col">
                           <div className="flex items-center gap-2">
                             <span className="font-medium">{doc.title}</span>
                             {doc.processing_status === 'failed' && (
                               <span className="text-red-600 font-medium text-xs">FAILED</span>
                             )}
                           </div>
                           <div className="text-xs text-muted-foreground">
                             {doc.document_type} • {doc.domain} • {formatDate(doc.created_at)}
                             {doc.processing_status === 'failed' && ' • Processing failed'}
                           </div>
                         </div>
                       </SelectItem>
                     ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDocumentId && (() => {
                const selectedDoc = filteredDocuments.find(doc => doc.id === selectedDocumentId);
                return (
                  <div className={`p-3 rounded-lg border ${
                    selectedDoc?.processing_status === 'failed' 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      selectedDoc?.processing_status === 'failed' 
                        ? 'text-orange-700' 
                        : 'text-red-700'
                    }`}>
                      <strong>
                        {selectedDoc?.processing_status === 'failed' ? 'Notice:' : 'Warning:'}
                      </strong> 
                      {selectedDoc?.processing_status === 'failed' 
                        ? ' The selected document has failed processing and will be archived. The new document will replace it and attempt proper processing.'
                        : ' The selected document will be archived and replaced. This action will preserve the audit trail but the old version will no longer be active in the AI knowledge base.'
                      }
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {replaceOption === 'yes' ? 'Replace & Upload' : 'Upload as New'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};