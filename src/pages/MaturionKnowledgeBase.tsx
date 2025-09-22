import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Clock, FileText, Database, Shield, Filter, Trash2, CheckSquare, Square, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

import { MaturionKnowledgeUploadZone } from '@/components/ai/MaturionKnowledgeUploadZone';
import { ApprovedFilesQueue } from '@/components/ai/ApprovedFilesQueue';
import { DocumentProcessingDebugger } from '@/components/ai/DocumentProcessingDebugger';
import { DocumentChunkTester } from '@/components/qa/DocumentChunkTester';

import { useMaturionDocuments } from '@/hooks/useMaturionDocuments';
import { useOrganization } from '@/hooks/useOrganization';
import { usePolicyChangeLog } from '@/hooks/usePolicyChangeLog';
import { supabase } from '@/integrations/supabase/client';
import PolicyChangeLogTable from '@/components/admin/PolicyChangeLogTable';
import CreatePolicyLogDialog from '@/components/admin/CreatePolicyLogDialog';
import { PolicyLogDiagnosticPanel } from '@/components/admin/PolicyLogDiagnosticPanel';

const MaturionKnowledgeBase: React.FC = () => {
  const { documents, loading, refreshDocuments, bulkDeleteDocuments, uploadDocument } = useMaturionDocuments();
  const { currentOrganization } = useOrganization();
  const { logs, loading: logsLoading, createPolicyLog } = usePolicyChangeLog();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isBulkActionsExpanded, setIsBulkActionsExpanded] = useState(false);
  const [isDocumentListExpanded, setIsDocumentListExpanded] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingGuidance, setIsUploadingGuidance] = useState(false);
  
  const { toast } = useToast();

  // Upload Cross-Domain Guidance Document
  const uploadCrossDomainGuidance = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization found",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error", 
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingGuidance(true);
    try {
      // Create the document content (v2 with all 7 scenarios)
      const guidanceContent = `# Maturion Knowledge Base Guidance – Cross-Domain Criteria Handling (Extended, v2)

## Purpose
This document provides enhanced universal logic and fallback handling for proposed criteria that may fall outside the domain or MPS currently being configured. It supports better AI reasoning, user guidance, and safeguards against misplacement, duplication, or omission of valid suggestions.

## Scope
This logic applies globally across **all Domains** and **all MPSs**, and includes additional user behavioral logic to ensure no relevant criteria are lost, misfiled, or repeated unnecessarily.

---

## Logic Rules (Extended – 7 Scenarios)

### ✅ Scenario 1: Proposed Criterion Fits Current MPS
- AI (Maturion) reconstructs and validates the proposed criterion.
- It is immediately inserted into the MPS currently being configured.
- The user can approve or edit it without leaving their current workflow.

### ✅ Scenario 2: Proposed Criterion Fits Same Domain but Different MPS
- Maturion detects better alignment with another MPS within the **same domain**.
- Prompts:
  > "This criterion fits better under MPS Y – [Title]. Would you like to defer it there?"
- If accepted:
  - Criterion is added to MPS Y instantly.
  - User is reminded before exiting the domain to review and approve it.

### ✅ Scenario 3: Proposed Criterion Fits a **Future Domain**
- Maturion detects the criterion belongs to a domain that has not been configured yet.
- Action:
  - Defer the criterion.
  - When the user reaches the future domain:
    > "You proposed a criterion earlier that belongs here. Would you like to add it now?"

### ✅ Scenario 4: Criterion Fits a **Past Domain**
- Maturion identifies a mismatch to a domain already completed.
- Prompts:
  > "This belongs to Domain X – MPS Y. Would you like to return to add it?"
- If declined:
  - A reminder is logged.
  - **Final checkpoint** before Evidence Management (Step 4 of final domain):
    > ⚠️ "You still have unresolved criteria for Domain X. Would you like me to take you there now?"

### ✅ Scenario 5: Dual Evidence in One Sentence
- If a user submits a statement with multiple requirements:
  > e.g., "Must have a formal policy *and* conduct annual simulations."
- Maturion splits it into two criteria with appropriate summaries.
- Prompts:
  > "We've detected more than one requirement. Would you like to split this into two separate criteria?"

### ✅ Scenario 6: Criterion Fits Another MPS in the Same Domain (But That MPS Has Not Been Constructed Yet)
- **Context:** User is working in Domain X, MPS A. They propose a criterion that fits MPS B in the *same domain*, but MPS B has not been constructed yet.
- **Action:**
  - Maturion defers the criterion to MPS B.
  - When the user **constructs MPS B**, Maturion prompts:
    > "You proposed a criterion earlier for MPS B – [Title]. Would you like to add it now?"
- **Fallback:** If the user skips MPS B and reaches the final step of the domain without approving the deferred criterion:
  > ⚠️ "You still have unresolved criteria for MPS B in this domain. Would you like to review them before proceeding?"

### ✅ Scenario 7: Proposed Criterion Is a Duplicate of Existing One
- Maturion detects a criterion already exists (exact or near match).
- Prompts:
  > "This criterion is already included in this MPS. Would you like to:
  > • Keep the existing one
  > • Replace it with your version
  > • Skip it entirely?"
- If skipped, no duplicate is inserted.
- If replaced, the old criterion is removed and new one inserted.
- If both are kept, user is warned about redundancy.

---

## Modal Loop Logic
After submitting a custom criterion:
- Always ask:
  > "Would you like to propose another?"
- Modal repeats until the user explicitly confirms they are done.
- Loop is persistent and allows sequential submissions.

---

## Upload Instructions
- **Tags:** \`cross-domain\`, \`criteria-placement\`, \`lesson-learned\`, \`ai-logic\`, \`modal-logic\`, \`split-criteria\`, \`duplicate-detection\`
- **Domain:** *(Leave blank for global logic)*
- **Upload Notes:** Replaces previous guidance. Includes 7-scenario model and loop control logic to manage cross-domain proposals, duplicate detection, and modal handling.

---

*Generated on 2025-07-24 13:24 UTC – Version 2*`;

      // Create a File object from the content
      const blob = new Blob([guidanceContent], { type: 'text/markdown' });
      const file = new File([blob], 'Maturion_Criteria_Logic_v2.md', {
        type: 'text/markdown',
        lastModified: Date.now()
      });

      // Use legacy function for backward compatibility
      const documentId = await (uploadDocument as any)(
        file,
        'general',
        currentOrganization.id,
        user.id,
        'Maturion Knowledge Base Guidance – Cross-Domain Criteria Handling (Extended, v2)',
        '', // Global logic - no specific domain
        'cross-domain, criteria-placement, lesson-learned, ai-logic, modal-logic, split-criteria, duplicate-detection',
        'Replaces previous guidance. Includes 7-scenario model and loop control logic to manage cross-domain proposals, duplicate detection, and modal handling.'
      );

      if (documentId) {
        toast({
          title: "Success",
          description: "Cross-Domain Criteria Handling guidance has been uploaded to the knowledge base",
        });
      }
    } catch (error) {
      console.error('Error uploading guidance:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the guidance document",
        variant: "destructive",
      });
    } finally {
      setIsUploadingGuidance(false);
    }
  };

  // Filter documents based on status
  const filteredDocuments = useMemo(() => {
    if (statusFilter === 'all') return documents;
    return documents.filter(doc => doc.processing_status === statusFilter);
  }, [documents, statusFilter]);
  
  // Calculate statistics from filtered documents
  const stats = useMemo(() => {
    if (loading || documents.length === 0) {
      return {
        total: 0,
        completed: 0,
        processing: 0,
        failed: 0,
        pending: 0,
        totalChunks: 0,
        completionRate: 0
      };
    }

    const completed = documents.filter(d => d.processing_status === 'completed').length;
    const processing = documents.filter(d => d.processing_status === 'processing').length;
    const failed = documents.filter(d => d.processing_status === 'failed').length;
    const pending = documents.filter(d => d.processing_status === 'pending').length;
    const totalChunks = documents.reduce((sum, d) => sum + (d.total_chunks || 0), 0);
    const completionRate = documents.length > 0 ? (completed / documents.length) * 100 : 0;

    return {
      total: documents.length,
      completed,
      processing,
      failed,
      pending,
      totalChunks,
      completionRate
    };
  }, [documents, loading]);

  // Bulk deletion functions
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(documentId)) {
        newSelection.delete(documentId);
      } else {
        newSelection.add(documentId);
      }
      return newSelection;
    });
  };

  const selectAllDocuments = () => {
    setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const selectDuplicatesByName = () => {
    const fileNameCounts = new Map<string, string[]>();
    filteredDocuments.forEach(doc => {
      const fileName = doc.file_name;
      if (!fileNameCounts.has(fileName)) {
        fileNameCounts.set(fileName, []);
      }
      fileNameCounts.get(fileName)!.push(doc.id);
    });

    const duplicateIds = new Set<string>();
    fileNameCounts.forEach((ids, fileName) => {
      if (ids.length > 1) {
        // Keep the newest (first in list since sorted by created_at desc), mark rest for deletion
        ids.slice(1).forEach(id => duplicateIds.add(id));
      }
    });

    setSelectedDocuments(duplicateIds);
    
    toast({
      title: "Duplicates Selected",
      description: `Selected ${duplicateIds.size} duplicate documents for deletion`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select documents to delete",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const success = await bulkDeleteDocuments(Array.from(selectedDocuments));
      if (success) {
        setSelectedDocuments(new Set());
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Maturion Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage your organization's knowledge documents, semantic context, and vector embeddings for Maturion
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Knowledge base entries
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
              <Progress value={stats.completionRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed} of {stats.total} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vector Chunks</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChunks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Searchable Maturion embeddings
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.processing > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <Badge variant="outline" className="text-xs">
                      {stats.processing} Processing
                    </Badge>
                  </div>
                )}
                {stats.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <Badge variant="destructive" className="text-xs">
                      {stats.failed} Failed
                    </Badge>
                  </div>
                )}
                {stats.processing === 0 && stats.failed === 0 && stats.pending === 0 && stats.total > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <Badge variant="default" className="text-xs">
                      All Processed
                    </Badge>
                  </div>
                  )}
                {stats.pending > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <Badge variant="outline" className="text-xs">
                      {stats.pending} Pending
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Notice */}
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              ISO Compliance & Audit Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This Maturion Knowledge Base maintains full compliance with <strong>ISO 9001</strong> (quality documentation), 
              <strong>ISO 27001</strong> (information security), and <strong>ISO 37301</strong> (compliance management). 
              All document uploads, edits, and deletions are logged with complete audit trails including timestamps, 
              user attribution, and change reasons for regulatory requirements.
            </p>
          </CardContent>
        </Card>

        {/* Secure Upload Notice */}
        <Card className="mb-6 border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              Secure Upload Workflow Active
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              <strong>Direct uploads are disabled for security and credit efficiency.</strong> 
              All document uploads must first be verified through the Chunk Tester to ensure quality 
              and prevent AI credit waste. Use the QA Dashboard → Document Chunk Tester to validate files before approval.
            </p>
          </CardContent>
        </Card>

        {/* Document Management Panel */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Document Management
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredDocuments.length} of {stats.total} documents
                </span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">✅ Processed</SelectItem>
                    <SelectItem value="processing">🔵 Processing</SelectItem>
                    <SelectItem value="pending">🟡 Pending</SelectItem>
                    <SelectItem value="failed">🔴 Failed</SelectItem>
                    <SelectItem value="chunked_verified">🔍 Chunk Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          {/* Bulk Actions Panel - Collapsible */}
          {filteredDocuments.length > 0 && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Collapsible Header */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBulkActionsExpanded(!isBulkActionsExpanded)}
                  className="w-full justify-between h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <span className="text-sm">Bulk Actions & Selection Tools</span>
                  {isBulkActionsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {/* Bulk Actions Content */}
                {isBulkActionsExpanded && (
                  <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectedDocuments.size === filteredDocuments.length ? clearSelection : selectAllDocuments}
                        >
                          {selectedDocuments.size === filteredDocuments.length ? (
                            <>
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Deselect All
                            </>
                          ) : (
                            <>
                              <Square className="h-4 w-4 mr-2" />
                              Select All ({filteredDocuments.length})
                            </>
                          )}
                        </Button>
                        
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={selectDuplicatesByName}
                         >
                           Select Duplicates
                         </Button>
                         
                         <Button
                           variant="default"
                           size="sm"
                           onClick={uploadCrossDomainGuidance}
                           disabled={isUploadingGuidance}
                         >
                           {isUploadingGuidance ? 'Uploading...' : 'Upload Cross-Domain Guidance'}
                         </Button>
                      </div>
                      
                      {selectedDocuments.size > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    
                    {selectedDocuments.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Deleting...
                          </div>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedDocuments.size})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Document List with Selection - Collapsible */}
        {filteredDocuments.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documents</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDocumentListExpanded(!isDocumentListExpanded)}
                  className="flex items-center gap-2"
                >
                  <span className="text-sm">
                    {isDocumentListExpanded ? 'Hide' : 'Show'} {filteredDocuments.length} documents
                  </span>
                  {isDocumentListExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            
            {isDocumentListExpanded && (
              <CardContent>
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        selectedDocuments.has(doc.id) ? 'bg-muted border-primary' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleDocumentSelection(doc.id)}
                      >
                        {selectedDocuments.has(doc.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.title || doc.file_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(doc.file_size / 1024)} KB • {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {doc.processing_status === 'completed' && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Processed
                          </Badge>
                        )}
                        {doc.processing_status === 'processing' && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Processing
                          </Badge>
                        )}
                        {doc.processing_status === 'pending' && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {doc.processing_status === 'failed' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Policy Change Log Section - Debug Info */}
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Policy Management Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="space-y-3">
              <div className="space-y-2">
                <p><strong>Admin Status:</strong> ✅ Admin Access Granted (Unrestricted)</p>
                <p><strong>Logs Loading:</strong> {logsLoading ? '🔄 Loading...' : '✅ Loaded'}</p>
                <p><strong>Logs Count:</strong> {logs.length} policy logs found</p>
              </div>
              <p className="text-green-600">
                ✅ All admin functions are enabled. Policy Change Log is available below.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Annex 2: Document Upload & Processing */}
        <Collapsible defaultOpen={true} className="mb-6">
          <CollapsibleTrigger className="w-full">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    📄 Annex 2: Document Upload & Processing
                  </CardTitle>
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground mb-4">
                    Document chunk testing and validation facility for Maturion ingestion workflow.
                  </p>
                  <div className="border-2 border-dashed border-primary/50 p-4 rounded-lg">
                    <DocumentChunkTester />
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Change Log Panel (Annex 3) */}
        <Collapsible defaultOpen={true} className="mb-6">
          <CollapsibleTrigger className="w-full">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    📜 Change Log Panel (Annex 3)
                  </CardTitle>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=closed]:rotate-0 data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <p className="text-muted-foreground mb-4">
                    Comprehensive audit trail of platform changes for ISO compliance and regulatory requirements.
                  </p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Policy Management</h3>
                    <CreatePolicyLogDialog 
                      onCreateLog={createPolicyLog}
                      availableDocuments={documents.map(doc => ({
                        id: doc.id,
                        title: doc.title || '',
                        file_name: doc.file_name
                      }))}
                    />
                  </div>
                  
                  <PolicyLogDiagnosticPanel />
                  
                  <PolicyChangeLogTable 
                    logs={logs} 
                    loading={logsLoading} 
                  />
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>


        {/* Admin Tools */}
        <div className="space-y-6">
          <DocumentProcessingDebugger />
          
          {/* Legacy Document Management Panel - Upload disabled but management features enabled */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Legacy Document Management (Phase 1 Migration)
              </CardTitle>
              <CardDescription>
                Legacy upload methods are being phased out. Use the new Unified Document Upload Engine above.
                Existing document management features remain available.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Legacy Document Management Zone with uploads disabled */}
          <MaturionKnowledgeUploadZone 
            filteredDocuments={filteredDocuments} 
            onDocumentChange={refreshDocuments}
            enableUploads={false}
          />

          {/* Approved Files Queue */}
          <ApprovedFilesQueue />
        </div>
      </div>
    </div>
  );
};

export default MaturionKnowledgeBase;
