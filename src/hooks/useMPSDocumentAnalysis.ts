import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MPSDocumentInfo {
  documentName: string;
  expectedCriteriaCount: number;
  documentType: string;
  processingStatus: string;
}

interface MPSAnalysisResult {
  foundDocument: boolean;
  documentInfo?: MPSDocumentInfo;
  error?: string;
}

export const useMPSDocumentAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMPSDocument = useCallback(async (
    organizationId: string, 
    mpsNumber: number
  ): Promise<MPSAnalysisResult> => {
    setIsAnalyzing(true);

    try {
      // Search for MPS documents that might contain the target MPS
      const { data: documents, error } = await supabase
        .from('ai_documents')
        .select('id, title, file_name, document_type, processing_status, metadata')
        .eq('organization_id', organizationId)
        .eq('document_type', 'mps_document')
        .eq('processing_status', 'completed');

      if (error) {
        console.error('Error fetching MPS documents:', error);
        return { foundDocument: false, error: error.message };
      }

      if (!documents || documents.length === 0) {
        return { foundDocument: false, error: 'No processed MPS documents found' };
      }

      // Look for document that might contain this MPS
      const targetMPSName = `MPS ${mpsNumber}`;
      const relevantDoc = documents.find(doc => 
        doc.title?.toLowerCase().includes(`mps ${mpsNumber}`) ||
        doc.title?.toLowerCase().includes(`mps${mpsNumber}`) ||
        doc.file_name?.toLowerCase().includes(`mps ${mpsNumber}`) ||
        doc.file_name?.toLowerCase().includes(`mps${mpsNumber}`)
      ) || documents[0]; // Fall back to first document if no specific match

      if (!relevantDoc) {
        return { foundDocument: false, error: 'No relevant MPS document found' };
      }

      // Fetch document chunks to analyze criteria count
      const { data: chunks, error: chunksError } = await supabase
        .from('ai_document_chunks')
        .select('content')
        .eq('document_id', relevantDoc.id);

      if (chunksError) {
        console.error('Error fetching document chunks:', chunksError);
        return { foundDocument: false, error: chunksError.message };
      }

      if (!chunks || chunks.length === 0) {
        return { foundDocument: false, error: 'No document content found for analysis' };
      }

      // Analyze content to extract criteria count
      const fullContent = chunks.map(chunk => chunk.content).join(' ');
      const criteriaCount = extractCriteriaCount(fullContent, mpsNumber);

      const documentInfo: MPSDocumentInfo = {
        documentName: relevantDoc.title || relevantDoc.file_name || 'Unknown Document',
        expectedCriteriaCount: criteriaCount,
        documentType: relevantDoc.document_type,
        processingStatus: relevantDoc.processing_status
      };

      return { foundDocument: true, documentInfo };

    } catch (error) {
      console.error('Error analyzing MPS document:', error);
      return { 
        foundDocument: false, 
        error: error instanceof Error ? error.message : 'Unknown analysis error' 
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyzeMPSDocument, isAnalyzing };
};

// Helper function to extract criteria count from document content
function extractCriteriaCount(content: string, mpsNumber: number): number {
  const lowerContent = content.toLowerCase();
  
  // Look for patterns that indicate criteria structure
  const patterns = [
    // Pattern 1: Look for numbered criteria like "4.1", "4.2", etc.
    new RegExp(`${mpsNumber}\\.(\\d+)`, 'g'),
    // Pattern 2: Look for bullet points or numbered lists
    /^\s*[•\-\*]\s+/gm,
    /^\s*\d+\.\s+/gm,
    // Pattern 3: Look for "criterion" or "criteria" mentions
    /criterion|criteria/gi,
    // Pattern 4: Look for assessment-related keywords
    /shall\s+(demonstrate|show|provide|maintain|establish)/gi
  ];

  let maxCount = 0;

  // Try pattern 1: numbered criteria specific to this MPS
  const mpsSpecificMatches = content.match(new RegExp(`${mpsNumber}\\.(\\d+)`, 'g'));
  if (mpsSpecificMatches) {
    const numbers = mpsSpecificMatches.map(match => {
      const parts = match.split('.');
      return parseInt(parts[1], 10);
    });
    maxCount = Math.max(maxCount, Math.max(...numbers));
  }

  // Try pattern 2: Count sections that look like assessment criteria
  const assessmentSections = content.split(/\n\s*\n/).filter(section => {
    const sectionLower = section.toLowerCase();
    return (
      sectionLower.includes('shall') ||
      sectionLower.includes('must') ||
      sectionLower.includes('should') ||
      sectionLower.includes('evidence') ||
      sectionLower.includes('demonstrate')
    ) && section.trim().length > 50; // Filter out short sections
  });

  maxCount = Math.max(maxCount, assessmentSections.length);

  // Try pattern 3: Look for explicit criteria numbering
  const criteriaLines = content.split('\n').filter(line => {
    const trimmedLine = line.trim();
    return (
      /^\d+\.\d+/.test(trimmedLine) ||
      /^[A-Z]\d+\.\d+/.test(trimmedLine) ||
      (trimmedLine.includes('criteria') && trimmedLine.length < 100)
    );
  });

  maxCount = Math.max(maxCount, criteriaLines.length);

  // Fallback: If we can't find specific patterns, estimate based on content length
  if (maxCount === 0) {
    const contentLength = content.length;
    if (contentLength > 10000) maxCount = 12; // Long document, likely complex MPS
    else if (contentLength > 5000) maxCount = 10; // Medium document
    else if (contentLength > 2000) maxCount = 8; // Short document
    else maxCount = 8; // Very short, use minimum
  }

  // Ensure we stay within reasonable bounds (8-25 criteria)
  return Math.max(8, Math.min(25, maxCount));
}