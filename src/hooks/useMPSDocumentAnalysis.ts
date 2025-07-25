import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StructuredCriterion {
  requirement: string;
  evidence: string;
  rationale?: string;
}

interface MPSDocumentInfo {
  documentName: string;
  expectedCriteriaCount: number;
  documentType: string;
  processingStatus: string;
  structuredCriteria: StructuredCriterion[];
  hasStructuredFormat: boolean;
  sourceType: 'structured_blocks' | 'pattern_detection' | 'fallback_estimation';
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

      // Analyze content to extract criteria count and structured blocks
      const fullContent = chunks.map(chunk => chunk.content).join('\n\n');
      const analysisResult = analyzeDocumentStructure(fullContent, mpsNumber);

      const documentInfo: MPSDocumentInfo = {
        documentName: relevantDoc.title || relevantDoc.file_name || 'Unknown Document',
        expectedCriteriaCount: analysisResult.criteriaCount,
        documentType: relevantDoc.document_type,
        processingStatus: relevantDoc.processing_status,
        structuredCriteria: analysisResult.structuredCriteria,
        hasStructuredFormat: analysisResult.hasStructuredFormat,
        sourceType: analysisResult.sourceType
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

// AI Conversion Logic Policy - Structured Criteria Interpretation
interface DocumentAnalysisResult {
  criteriaCount: number;
  structuredCriteria: StructuredCriterion[];
  hasStructuredFormat: boolean;
  sourceType: 'structured_blocks' | 'pattern_detection' | 'fallback_estimation';
}

function analyzeDocumentStructure(content: string, mpsNumber: number): DocumentAnalysisResult {
  // Primary: Detect structured "Requirement:" and "Evidence:" blocks
  const structuredCriteria = extractStructuredBlocks(content);
  
  if (structuredCriteria.length > 0) {
    return {
      criteriaCount: structuredCriteria.length,
      structuredCriteria,
      hasStructuredFormat: true,
      sourceType: 'structured_blocks'
    };
  }

  // Secondary: Use pattern detection
  const patternCount = extractCriteriaCount(content, mpsNumber);
  
  return {
    criteriaCount: patternCount,
    structuredCriteria: [],
    hasStructuredFormat: false,
    sourceType: patternCount > 8 ? 'pattern_detection' : 'fallback_estimation'
  };
}

function extractStructuredBlocks(content: string): StructuredCriterion[] {
  const criteria: StructuredCriterion[] = [];
  
  // Split content into sections and look for Requirement:/Evidence: patterns
  const sections = content.split(/\n\s*\n/);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    
    // Look for "Requirement:" pattern (case-insensitive)
    const requirementMatch = section.match(/^Requirement:\s*(.+)/im);
    if (requirementMatch) {
      const requirement = requirementMatch[1].trim();
      
      // Look for corresponding "Evidence:" in this section or next sections
      let evidence = '';
      let rationale = '';
      
      // Check current section for evidence
      const evidenceMatch = section.match(/Evidence:\s*(.+)/im);
      if (evidenceMatch) {
        evidence = evidenceMatch[1].trim();
      } else {
        // Check next few sections for evidence
        for (let j = i + 1; j < Math.min(i + 3, sections.length); j++) {
          const nextSection = sections[j].trim();
          const nextEvidenceMatch = nextSection.match(/^Evidence:\s*(.+)/im);
          if (nextEvidenceMatch) {
            evidence = nextEvidenceMatch[1].trim();
            break;
          }
        }
      }
      
      // Look for rationale (optional)
      const rationaleMatch = section.match(/(?:Rationale|Justification|Note):\s*(.+)/im);
      if (rationaleMatch) {
        rationale = rationaleMatch[1].trim();
      }
      
      if (requirement && evidence) {
        criteria.push({
          requirement: cleanText(requirement),
          evidence: cleanText(evidence),
          rationale: rationale ? cleanText(rationale) : undefined
        });
      }
    }
  }
  
  // Alternative pattern: Look for numbered requirement/evidence pairs
  if (criteria.length === 0) {
    const numberedPattern = /(?:^|\n)\s*\d+[\.\)]\s*(?:Requirement|Req):\s*(.+?)(?:\n\s*Evidence:\s*(.+?))?(?=\n\s*\d+[\.\)]|$)/gim;
    let match;
    
    while ((match = numberedPattern.exec(content)) !== null) {
      const requirement = match[1]?.trim();
      const evidence = match[2]?.trim() || 'Evidence to be determined during assessment';
      
      if (requirement) {
        criteria.push({
          requirement: cleanText(requirement),
          evidence: cleanText(evidence)
        });
      }
    }
  }
  
  return criteria;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .replace(/^[•\-\*]\s*/, '') // Remove bullet points
    .replace(/\.$/, ''); // Remove trailing period
}

// Fallback function for pattern detection (simplified version of original)
function extractCriteriaCount(content: string, mpsNumber: number): number {
  const lowerContent = content.toLowerCase();
  let maxCount = 0;

  // Try numbered criteria specific to this MPS
  const mpsSpecificMatches = content.match(new RegExp(`${mpsNumber}\\.(\\d+)`, 'g'));
  if (mpsSpecificMatches) {
    const numbers = mpsSpecificMatches.map(match => {
      const parts = match.split('.');
      return parseInt(parts[1], 10);
    });
    maxCount = Math.max(maxCount, Math.max(...numbers));
  }

  // Count assessment sections
  const assessmentSections = content.split(/\n\s*\n/).filter(section => {
    const sectionLower = section.toLowerCase();
    return (
      sectionLower.includes('shall') ||
      sectionLower.includes('must') ||
      sectionLower.includes('should') ||
      sectionLower.includes('evidence') ||
      sectionLower.includes('demonstrate')
    ) && section.trim().length > 50;
  });

  maxCount = Math.max(maxCount, assessmentSections.length);

  // Fallback based on content length
  if (maxCount === 0) {
    const contentLength = content.length;
    if (contentLength > 10000) maxCount = 12;
    else if (contentLength > 5000) maxCount = 10;
    else if (contentLength > 2000) maxCount = 8;
    else maxCount = 8;
  }

  return Math.max(8, Math.min(25, maxCount));
}