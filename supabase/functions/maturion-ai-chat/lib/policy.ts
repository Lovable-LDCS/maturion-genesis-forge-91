import { supabase } from './utils.ts';

// Function to get the Maturion Operating Policy & Governance
export async function getMaturionOperatingPolicy(organizationId: string): Promise<string> {
  try {
    const { data: policyChunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.title', 'Maturion Operating Policy & Governance')
      .order('chunk_index', { ascending: true })
      .limit(15);
    
    if (error || !policyChunks?.length) {
      console.log('No Maturion Operating Policy found, using default logic');
      return '';
    }
    
    console.log(`📋 Operating Policy: Loaded ${policyChunks.length} chunks from governance document`);
    return policyChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error fetching Maturion Operating Policy:', error);
    return '';
  }
}

// Function to get dynamic reasoning context from uploaded knowledge base
export async function getDynamicReasoningContext(organizationId: string, userQuery: string): Promise<string> {
  try {
    // Get all available policy and framework documents
    const { data: documents, error } = await supabase
      .from('ai_documents')
      .select('id, title, document_type, tags, domain')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'completed')
      .in('document_type', ['policy_document', 'framework_document', 'governance_document', 'mps_document']);
    
    if (error || !documents?.length) {
      console.log('No reasoning context documents found');
      return '';
    }
    
    console.log(`🧠 Found ${documents.length} reasoning context documents`);
    return `Available Knowledge Base: ${documents.map(doc => `${doc.title} (${doc.document_type})`).join(', ')}`;
  } catch (error) {
    console.error('Error fetching dynamic reasoning context:', error);
    return '';
  }
}

// 🧠 PLATFORM ANCHOR LOGIC: Get Maturion Reasoning Architecture Manifest
export async function getMaturionReasoningArchitecture(organizationId: string): Promise<string> {
  try {
    const { data: architectureChunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title, document_type)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.document_type', 'governance_reasoning_manifest')
      .order('chunk_index', { ascending: true })
      .limit(25);
    
    if (error || !architectureChunks?.length) {
      console.log('No Maturion Reasoning Architecture found - falling back to default logic');
      return '';
    }
    
    console.log(`🧠 Platform Anchor Logic: Loaded ${architectureChunks.length} chunks from governance manifest`);
    return architectureChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error fetching Maturion Reasoning Architecture:', error);
    return '';
  }
}

// Function to retrieve internal documents from AI knowledge base
export async function getInternalDocuments(organizationId: string, context: string) {
  try {
    const { data: documents, error } = await supabase
      .from('ai_documents')
      .select('title, domain, tags, metadata')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'completed');
    
    if (error) throw error;
    return documents || [];
  } catch (error) {
    console.error('Error in getInternalDocuments:', error);
    return [];
  }
}