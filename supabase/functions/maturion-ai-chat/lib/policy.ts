import { supabase } from './utils.ts';

// Function to get the AI Behavior & Knowledge Source Policy for enforcement
export async function getAIBehaviorPolicy(organizationId: string): Promise<string> {
  try {
    const { data: policyChunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.title', 'AI Behavior & Knowledge Source Policy')
      .limit(5);
    
    if (error || !policyChunks?.length) {
      console.log('No AI Behavior Policy found, using default enforcement');
      return '';
    }
    
    return policyChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error fetching AI Behavior Policy:', error);
    return '';
  }
}

// Function to get Enhanced Maturion Intent Prompt Logic
export async function getIntentPromptLogic(organizationId: string): Promise<string> {
  try {
    const { data: logicChunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.title', 'Enhanced Maturion Intent Prompt Logic')
      .limit(5);
    
    if (error || !logicChunks?.length) return '';
    
    return logicChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error fetching Intent Prompt Logic:', error);
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