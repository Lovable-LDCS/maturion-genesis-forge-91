import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import mammoth from 'mammoth';

interface ChunkResult {
  success: boolean;
  textLength: number;
  chunks: string[];
  extractionMethod: string;
  warnings: string[];
  errors: string[];
}

interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  mimeType: string;
}

interface DocumentMetadata {
  title: string;
  documentType: string;
  tags: string;
  domain: string;
  visibility: string;
  description: string;
}

export const DocumentChunkTester: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ChunkResult | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [showChunkPreviews, setShowChunkPreviews] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    documentType: '',
    tags: '',
    domain: '',
    visibility: 'all_users',
    description: ''
  });
  const { toast } = useToast();

  // Preflight validation
  const validateFile = useCallback((file: File): FileValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // File size validation
    if (file.size < 1024) { // 1KB minimum
      errors.push(`File too small: ${file.size} bytes (minimum 1KB)`);
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB maximum
      warnings.push(`Large file: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
    }

    // MIME type validation
    const supportedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/pdf'
    ];
    
    const supportedExtensions = ['.docx', '.txt', '.md', '.pdf'];
    const hasValidExtension = supportedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!supportedTypes.includes(file.type) && !hasValidExtension) {
      errors.push(`Unsupported file type: ${file.type || 'unknown'} (${file.name})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileSize: file.size,
      mimeType: file.type || 'unknown'
    };
  }, []);

  // Text chunking function (copied from edge function)
  const splitTextIntoChunks = useCallback((text: string, chunkSize: number = 2000, overlap: number = 200): string[] => {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      
      if (end === text.length) break;
      start = end - overlap;
    }

    return chunks;
  }, []);

  // Extract text from file
  const extractText = useCallback(async (file: File): Promise<{ text: string; method: string; warnings: string[] }> => {
    const warnings: string[] = [];
    let text = '';
    let method = 'unknown';

    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.name.endsWith('.docx')) {
        method = 'mammoth_docx';
        const arrayBuffer = await file.arrayBuffer();
        
        // Check DOCX signature
        const uint8Array = new Uint8Array(arrayBuffer);
        const signature = Array.from(uint8Array.slice(0, 4))
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
        
        if (!signature.startsWith('504b')) {
          warnings.push('File does not have valid DOCX signature');
          method = 'text_fallback';
          text = new TextDecoder().decode(arrayBuffer);
        } else {
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
          
          if (result.messages && result.messages.length > 0) {
            warnings.push(`Mammoth messages: ${result.messages.length} warnings/info`);
          }
        }
        
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        method = 'plain_text';
        text = await file.text();
        
      } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        method = 'markdown';
        text = await file.text();
        
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        method = 'pdf_emergency';
        warnings.push('PDF text extraction is limited (emergency mode)');
        const arrayBuffer = await file.arrayBuffer();
        const rawText = new TextDecoder().decode(arrayBuffer);
        text = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        
      } else {
        method = 'unsupported_text_attempt';
        warnings.push('Unsupported file type - attempting text extraction');
        text = await file.text();
      }
      
    } catch (error: any) {
      warnings.push(`Extraction failed: ${error.message}`);
      method = 'extraction_failed';
      text = '';
    }

    return { text, method, warnings };
  }, []);

  // Process file
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Extract text
      const { text, method, warnings: extractWarnings } = await extractText(file);
      warnings.push(...extractWarnings);

      // Validate extracted text
      if (!text || text.trim().length === 0) {
        errors.push('No text content extracted from file');
      }

      if (text.length < 200) {
        warnings.push(`Text content is short: ${text.length} characters (recommended minimum: 200)`);
      }

      // Generate chunks
      const chunks = splitTextIntoChunks(text);
      
      if (chunks.length === 0) {
        errors.push('No chunks generated from text');
      }

      // Validate chunks
      const emptyChunks = chunks.filter(chunk => chunk.trim().length === 0);
      if (emptyChunks.length > 0) {
        warnings.push(`${emptyChunks.length} empty chunks detected`);
      }

      const shortChunks = chunks.filter(chunk => chunk.length < 100);
      if (shortChunks.length > 0) {
        warnings.push(`${shortChunks.length} short chunks (< 100 chars) detected`);
      }

      setResult({
        success: errors.length === 0,
        textLength: text.length,
        chunks: chunks,
        extractionMethod: method,
        warnings,
        errors
      });

    } catch (error: any) {
      errors.push(`Processing failed: ${error.message}`);
      setResult({
        success: false,
        textLength: 0,
        chunks: [],
        extractionMethod: 'failed',
        warnings,
        errors
      });
    } finally {
      setIsProcessing(false);
    }
  }, [extractText, splitTextIntoChunks]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setShowMetadataForm(false);
      setMetadata({
        title: selectedFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
        documentType: '',
        tags: '',
        domain: '',
        visibility: 'all_users',
        description: ''
      });
      const fileValidation = validateFile(selectedFile);
      setValidation(fileValidation);
      
      // Show metadata form if file is valid
      if (fileValidation.isValid) {
        setShowMetadataForm(true);
      }
    }
  }, [validateFile]);

  // Handle file drop
  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setShowMetadataForm(false);
      setMetadata({
        title: droppedFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
        documentType: '',
        tags: '',
        domain: '',
        visibility: 'all_users',
        description: ''
      });
      const fileValidation = validateFile(droppedFile);
      setValidation(fileValidation);
      
      // Show metadata form if file is valid
      if (fileValidation.isValid) {
        setShowMetadataForm(true);
      }
    }
  }, [validateFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Save approved chunks to cache for Smart Chunk Reuse
  const saveApprovedChunks = useCallback(async (chunks: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's organizations - handle multiple memberships by prioritizing primary organization
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations!inner(
            id,
            organization_type,
            name
          )
        `)
        .eq('user_id', user.id);

      if (orgError) {
        console.error('Organization query error:', orgError);
        throw new Error(`Failed to fetch organizations: ${orgError.message}`);
      }

      if (!orgMembers || orgMembers.length === 0) {
        console.error('No organization memberships found for user:', user.id);
        throw new Error('User organization membership not found. Please ensure you are a member of an organization.');
      }

      // Prioritize primary organization, fallback to first organization
      const primaryOrg = orgMembers.find(member => 
        member.organizations?.organization_type === 'primary'
      );
      const selectedOrg = primaryOrg || orgMembers[0];

      console.log('🏢 ORGANIZATION CONTEXT SELECTION:', {
        totalOrgs: orgMembers.length,
        allOrgs: orgMembers.map(org => ({
          id: org.organization_id,
          name: org.organizations?.name,
          type: org.organizations?.organization_type,
          role: org.role
        })),
        selectedOrgId: selectedOrg.organization_id,
        selectedOrgType: selectedOrg.organizations?.organization_type,
        selectedOrgName: selectedOrg.organizations?.name,
        userRole: selectedOrg.role,
        isPrimary: selectedOrg.organizations?.organization_type === 'primary'
      });

      // Verify user has admin/owner role for RLS policy
      if (!['admin', 'owner'].includes(selectedOrg.role)) {
        console.error('❌ PERMISSION ERROR:', {
          requiredRoles: ['admin', 'owner'],
          userRole: selectedOrg.role,
          organizationId: selectedOrg.organization_id
        });
        throw new Error(`Insufficient permissions. Admin or Owner role required for chunk approval. Current role: ${selectedOrg.role}`);
      }

      // CRITICAL: Lock in the organization ID for the entire operation
      const LOCKED_ORG_ID = selectedOrg.organization_id;
      console.log('🔒 LOCKED ORGANIZATION ID FOR ENTIRE OPERATION:', LOCKED_ORG_ID);

      // First create a document in ai_documents table to satisfy foreign key constraint
      console.log('📄 CREATING DOCUMENT RECORD:', {
        organizationId: LOCKED_ORG_ID,
        title: metadata.title,
        fileName: file?.name,
        documentType: metadata.documentType,
        domain: metadata.domain
      });

      const { data: newDocument, error: docError } = await supabase
        .from('ai_documents')
        .insert({
          title: metadata.title || 'Chunk Tester Upload',
          file_name: file?.name || 'unknown-file',
          file_path: `chunk-tester/${Date.now()}-${file?.name || 'upload'}`,
          file_size: file?.size || 0,
          mime_type: file?.type || 'application/octet-stream',
          document_type: metadata.documentType || 'knowledge_model',
          domain: metadata.domain || 'general',
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
          total_chunks: chunks.length,
          organization_id: LOCKED_ORG_ID, // Using locked org ID
          uploaded_by: user.id,
          updated_by: user.id,
          metadata: {
            approved_via_tester: true,
            extraction_method: 'mammoth_docx',
            processing_source: 'chunk_tester'
          }
        })
        .select()
        .single();

      if (docError) {
        console.error('❌ DOCUMENT CREATION FAILED:', {
          error: docError,
          organizationId: LOCKED_ORG_ID,
          userRole: selectedOrg.role
        });
        throw new Error(`Failed to create document: ${docError.message}`);
      }

      const documentId = newDocument.id;
      console.log('✅ DOCUMENT CREATED SUCCESSFULLY:', {
        documentId,
        organizationId: newDocument.organization_id,
        confirmedOrgMatch: newDocument.organization_id === LOCKED_ORG_ID
      });

      // CRITICAL: Verify document exists and is accessible before proceeding
      console.log('🔍 VERIFYING DOCUMENT EXISTS IN DATABASE...');
      const { data: verifyDoc, error: verifyError } = await supabase
        .from('ai_documents')
        .select('id, organization_id, title')
        .eq('id', documentId)
        .single();

      if (verifyError || !verifyDoc) {
        console.error('❌ DOCUMENT VERIFICATION FAILED:', {
          verifyError,
          documentId,
          found: !!verifyDoc
        });
        throw new Error(`Created document cannot be found: ${verifyError?.message || 'Document not found'}`);
      }

      console.log('✅ DOCUMENT VERIFIED IN DATABASE:', {
        foundId: verifyDoc.id,
        foundOrgId: verifyDoc.organization_id,
        idMatch: verifyDoc.id === documentId,
        orgMatch: verifyDoc.organization_id === LOCKED_ORG_ID
      });

      console.log('🔗 PREPARING CHUNKS FOR APPROVAL:', {
        chunksCount: chunks.length,
        documentId,
        organizationId: LOCKED_ORG_ID,
        userId: user.id,
        userRole: selectedOrg.role,
        orgValidation: LOCKED_ORG_ID === newDocument.organization_id
      });

      // Create chunks with the real document ID and LOCKED organization ID
      const chunksToSave = chunks.map((content, index) => ({
        document_id: documentId,
        chunk_index: index,
        content,
        content_hash: `chunk_${documentId}_${index}_${Date.now()}`,
        metadata: {
          approved_via_tester: true,
          extraction_method: result?.extractionMethod || 'chunk_tester',
          chunk_size: content.length,
          verified_at: new Date().toISOString(),
          file_name: file?.name || 'unknown',
          document_title: metadata.title,
          organization_name: selectedOrg.organizations?.name
        },
        approved_by: user.id,
        organization_id: LOCKED_ORG_ID // Using same locked org ID
      }));

      console.log('🔍 FINAL VALIDATION BEFORE INSERT:', {
        chunksCount: chunksToSave.length,
        sampleChunk: {
          document_id: chunksToSave[0]?.document_id,
          organization_id: chunksToSave[0]?.organization_id,
          approved_by: chunksToSave[0]?.approved_by
        },
        allOrgIdsMatch: chunksToSave.every(chunk => chunk.organization_id === LOCKED_ORG_ID),
        docIdExists: !!documentId,
        confirmedOrgId: LOCKED_ORG_ID
      });

      // Test RLS access before attempting insert
      console.log('🔐 TESTING DATABASE ACCESS...');
      const { data: testAccess, error: testError } = await supabase
        .from('approved_chunks_cache')
        .select('count')
        .eq('organization_id', LOCKED_ORG_ID)
        .limit(1);

      console.log('🔐 RLS TEST RESULT:', { 
        testAccess, 
        testError,
        organizationId: LOCKED_ORG_ID 
      });

      // CRITICAL: Test inserting ONE chunk first to isolate the exact error
      console.log('🧪 TESTING SINGLE CHUNK INSERT...');
      const testChunk = {
        document_id: documentId,
        chunk_index: 0,
        content: chunks[0].substring(0, 100) + '...', // Truncated for test
        content_hash: `test_${documentId}_0_${Date.now()}`,
        metadata: {
          approved_via_tester: true,
          extraction_method: 'test',
          test_insert: true
        },
        approved_by: user.id,
        organization_id: LOCKED_ORG_ID
      };

      const { data: testInsert, error: testInsertError } = await supabase
        .from('approved_chunks_cache')
        .insert([testChunk])
        .select();

      if (testInsertError) {
        console.error('❌ SINGLE CHUNK TEST FAILED:', {
          error: testInsertError,
          code: testInsertError.code,
          message: testInsertError.message,
          details: testInsertError.details,
          hint: testInsertError.hint,
          testChunk
        });
        throw new Error(`Single chunk test failed: ${testInsertError.message} (Code: ${testInsertError.code})`);
      }

      console.log('✅ SINGLE CHUNK TEST PASSED:', testInsert);

      console.log('💾 INSERTING ALL CHUNKS...');
      const { data: insertedChunks, error: chunksError } = await supabase
        .from('approved_chunks_cache')
        .insert(chunksToSave)
        .select();

      if (chunksError) {
        console.error('❌ CRITICAL: CHUNK INSERT FAILED:', {
          error: chunksError,
          code: chunksError.code,
          message: chunksError.message,
          details: chunksError.details,
          hint: chunksError.hint,
          organizationId: LOCKED_ORG_ID,
          documentId,
          userId: user.id,
          userRole: selectedOrg.role,
          chunksCount: chunksToSave.length,
          sampleChunkOrgId: chunksToSave[0]?.organization_id,
          documentOrgId: newDocument.organization_id
        });
        throw new Error(`Failed to save approved chunks: ${chunksError.message} (Code: ${chunksError.code})`);
      }

      if (!insertedChunks || insertedChunks.length === 0) {
        console.error('❌ CRITICAL: No chunks were inserted despite no error');
        throw new Error('No chunks were saved - insert returned empty result');
      }

      console.log('🎉 SUCCESS! CHUNKS APPROVED AND SAVED:', {
        chunksCount: insertedChunks.length,
        documentId,
        organizationId: LOCKED_ORG_ID,
        insertedIds: insertedChunks.map(chunk => chunk.id)
      });
      
      return documentId;
    } catch (error) {
      console.error('❌ Error saving approved chunks:', error);
      throw error;
    }
  }, [result, file, metadata]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Chunk Tester
        </CardTitle>
        <CardDescription>
          Test document processing locally before triggering AI pipeline. 
          Validates file extraction, chunking, and content quality without consuming credits.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div 
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {file ? file.name : 'Drop file here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: .docx, .txt, .md, .pdf
              </p>
            </div>
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept=".docx,.txt,.md,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* File Validation */}
        {validation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                Preflight Validation {validation.isValid ? 'Passed' : 'Failed'}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>File size: {(validation.fileSize / 1024).toFixed(1)} KB</p>
              <p>MIME type: {validation.mimeType}</p>
            </div>

            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <p key={index}>• {warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Metadata Form */}
        {showMetadataForm && file && validation?.isValid && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-lg">Document Metadata</CardTitle>
              <CardDescription>
                Please provide metadata for this document before testing. This information will be preserved throughout the approval process.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter document title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type *</Label>
                  <Select 
                    value={metadata.documentType} 
                    onValueChange={(value) => setMetadata(prev => ({ ...prev, documentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mps">MPS (Maturity Practice Statement)</SelectItem>
                      <SelectItem value="policy">Policy Document</SelectItem>
                      <SelectItem value="threat_profile">Threat Profile</SelectItem>
                      <SelectItem value="sop">Standard Operating Procedure</SelectItem>
                      <SelectItem value="guidance">Guidance Document</SelectItem>
                      <SelectItem value="best_practice">Best Practice</SelectItem>
                      <SelectItem value="compliance">Compliance Framework</SelectItem>
                      <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                      <SelectItem value="ai_ingestion_policy">AI Ingestion Policy</SelectItem>
                      <SelectItem value="knowledge_model">Knowledge Model</SelectItem>
                      <SelectItem value="governance_protocol">Governance Protocol</SelectItem>
                      <SelectItem value="metadata_framework">Metadata Framework</SelectItem>
                      <SelectItem value="chunking_strategy">Chunking Strategy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain *</Label>
                  <Select 
                    value={metadata.domain} 
                    onValueChange={(value) => setMetadata(prev => ({ ...prev, domain: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="leadership_governance">Leadership & Governance</SelectItem>
                       <SelectItem value="people_culture">People & Culture</SelectItem>
                       <SelectItem value="process_integrity">Process Integrity</SelectItem>
                       <SelectItem value="protection">Protection</SelectItem>
                       <SelectItem value="proof_it_works">Proof it Works</SelectItem>
                       <SelectItem value="cross_domain">Cross-Domain</SelectItem>
                       <SelectItem value="general">General</SelectItem>
                       <SelectItem value="system_architecture">System Architecture</SelectItem>
                       <SelectItem value="ai_logic_behavior">AI Logic & Behavior</SelectItem>
                       <SelectItem value="validation_rules">Validation Rules</SelectItem>
                       <SelectItem value="security_controls">Security Controls</SelectItem>
                       <SelectItem value="global_instruction">Global Instruction</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility *</Label>
                  <Select 
                    value={metadata.visibility} 
                    onValueChange={(value) => setMetadata(prev => ({ ...prev, visibility: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_users">All Users</SelectItem>
                      <SelectItem value="superusers_only">Superusers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags *</Label>
                <Input
                  id="tags"
                  value={metadata.tags}
                  onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Enter tags separated by commas (e.g., iso27001, risk-management, audit)"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use comma-separated tags for better searchability and filtering
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">AI Backoffice Description</Label>
                <Textarea
                  id="description"
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional: Provide context or notes about this document for AI processing"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Process Button */}
        {file && validation?.isValid && metadata.title && metadata.documentType && metadata.domain && metadata.tags && (
          <Button 
            onClick={() => processFile(file)} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Test Document Processing'}
          </Button>
        )}

        {/* Approve for Upload Button */}
        {result && result.success && result.chunks.length > 0 && (
          <div className="pt-4 border-t">
            <div className="space-y-3">
              <div className="bg-muted/30 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Document Metadata Summary</h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>Title:</strong> {metadata.title}</p>
                  <p><strong>Type:</strong> {metadata.documentType}</p>
                  <p><strong>Domain:</strong> {metadata.domain}</p>
                  <p><strong>Tags:</strong> {metadata.tags}</p>
                  <p><strong>Visibility:</strong> {metadata.visibility}</p>
                  {metadata.description && <p><strong>Description:</strong> {metadata.description}</p>}
                </div>
              </div>
              
              <Button 
                onClick={async () => {
                  try {
                    // Save approved chunks for Smart Chunk Reuse
                    const tempDocId = await saveApprovedChunks(result.chunks);
                    
                    // Add to approved files queue with metadata and chunk reference
                    if ((window as any).addApprovedFile && file) {
                      const fileWithMetadata = {
                        file,
                        metadata: {
                          ...metadata,
                          tempDocId,
                          preApprovedChunks: true
                        },
                        chunksCount: result.chunks.length,
                        extractionMethod: result.extractionMethod
                      };
                      (window as any).addApprovedFile(fileWithMetadata);
                      
                      toast({
                        title: "✅ Approved for Smart Upload",
                        description: `${file.name} approved with ${result.chunks.length} pre-verified chunks ready for reuse.`,
                      });
                      
                      setFile(null);
                      setResult(null);
                      setValidation(null);
                      setShowMetadataForm(false);
                      setMetadata({
                        title: '',
                        documentType: '',
                        tags: '',
                        domain: '',
                        visibility: 'all_users',
                        description: ''
                      });
                    } else {
                      toast({
                        title: "Feature Unavailable",
                        description: "Approved files queue is not available. Please refresh the page.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error('❌ Error approving file:', error);
                    toast({
                      title: "Approval Failed",
                      description: "Failed to save approved chunks. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                className="w-full gap-2"
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4" />
                Approve for Smart Upload to Maturion
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will add the file with metadata to the approved queue for secure upload
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="text-lg font-semibold">
                Processing {result.success ? 'Successful' : 'Failed'}
              </h3>
            </div>

            {/* Smart Chunk Reuse Success Message */}
            {result.success && showMetadataForm && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium text-green-800">✅ Ready for Smart Chunk Reuse</p>
                    <p className="text-green-700">
                      Once uploaded, this document will use pre-approved chunks to avoid reprocessing failures and save credits.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.textLength}</div>
                <div className="text-xs text-muted-foreground">Characters</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.chunks.length}</div>
                <div className="text-xs text-muted-foreground">Chunks</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xs font-mono">{result.extractionMethod}</div>
                <div className="text-xs text-muted-foreground">Method</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {result.textLength > 0 ? Math.round(result.chunks.length * 2000 / result.textLength * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Errors:</p>
                    {result.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    {result.warnings.map((warning, index) => (
                      <p key={index}>• {warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Chunk Previews */}
            {result.chunks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium">Chunks Generated</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChunkPreviews(!showChunkPreviews)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showChunkPreviews ? 'Hide' : 'Show'} Previews
                  </Button>
                </div>

                {showChunkPreviews && (
                  <ScrollArea className="h-96 border rounded-lg p-4">
                    <div className="space-y-4">
                      {result.chunks.slice(0, 5).map((chunk, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              Chunk {index + 1}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {chunk.length} characters
                            </span>
                          </div>
                          <div className="text-sm font-mono bg-muted p-3 rounded text-wrap break-words">
                            {chunk.substring(0, 300)}
                            {chunk.length > 300 && '...'}
                          </div>
                        </div>
                      ))}
                      {result.chunks.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          ... and {result.chunks.length - 5} more chunks
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};