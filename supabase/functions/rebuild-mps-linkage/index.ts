import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MPSLinkageRequest {
  organizationId: string;
  forceRebuild?: boolean;
}

interface MPSLinkageResult {
  success: boolean;
  linked_documents: number;
  updated_chunks: number;
  mps_mappings: Record<number, string>;
  errors?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { organizationId, forceRebuild = false }: MPSLinkageRequest = await req.json();

    console.log(`🔗 Starting MPS document linkage rebuild for organization: ${organizationId}`);

    // Get all completed MPS documents
    const { data: mpsDocuments, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, title, file_name, metadata, processing_status')
      .eq('organization_id', organizationId)
      .eq('document_type', 'mps_document')
      .eq('processing_status', 'completed');

    if (docsError) {
      throw new Error(`Failed to fetch MPS documents: ${docsError.message}`);
    }

    if (!mpsDocuments || mpsDocuments.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No completed MPS documents found',
          linked_documents: 0,
          updated_chunks: 0,
          mps_mappings: {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${mpsDocuments.length} completed MPS documents`);

    // Define MPS mapping based on standard naming patterns
    const mpsMappings: Record<number, string> = {};
    const linkedDocuments: string[] = [];
    let updatedChunks = 0;
    const errors: string[] = [];

    // Process each document to extract MPS mappings
    for (const doc of mpsDocuments) {
      try {
        console.log(`🔍 Analyzing document: ${doc.title || doc.file_name}`);

        // Get chunks for this document to analyze content
        const { data: chunks, error: chunksError } = await supabase
          .from('ai_document_chunks')
          .select('id, content, metadata')
          .eq('document_id', doc.id);

        if (chunksError) {
          errors.push(`Failed to fetch chunks for ${doc.title}: ${chunksError.message}`);
          continue;
        }

        if (!chunks || chunks.length === 0) {
          errors.push(`No chunks found for document: ${doc.title}`);
          continue;
        }

        const fullContent = chunks.map(chunk => chunk.content).join('\n');
        
        // Extract MPS numbers from content using multiple patterns
        const mpsNumbers = extractMPSNumbers(fullContent, doc.title || doc.file_name || '');
        
        if (mpsNumbers.length > 0) {
          console.log(`📌 Found MPS numbers in ${doc.title}: ${mpsNumbers.join(', ')}`);
          
          // Map each found MPS number to this document
          for (const mpsNum of mpsNumbers) {
            mpsMappings[mpsNum] = doc.title || doc.file_name || `Document ${doc.id}`;
          }

          // Update document metadata to include MPS mappings
          const updatedMetadata = {
            ...doc.metadata,
            mps_numbers: mpsNumbers,
            linkage_updated: new Date().toISOString(),
            force_rebuild: forceRebuild
          };

          const { error: updateError } = await supabase
            .from('ai_documents')
            .update({ metadata: updatedMetadata })
            .eq('id', doc.id);

          if (updateError) {
            errors.push(`Failed to update metadata for ${doc.title}: ${updateError.message}`);
          } else {
            linkedDocuments.push(doc.id);
          }

          // Update chunk metadata to include MPS-specific tagging
          for (const chunk of chunks) {
            const chunkMPSNumbers = extractMPSNumbers(chunk.content, '');
            if (chunkMPSNumbers.length > 0) {
              const updatedChunkMetadata = {
                ...chunk.metadata,
                mps_numbers: chunkMPSNumbers,
                linkage_updated: new Date().toISOString()
              };

              const { error: chunkUpdateError } = await supabase
                .from('ai_document_chunks')
                .update({ metadata: updatedChunkMetadata })
                .eq('id', chunk.id);

              if (!chunkUpdateError) {
                updatedChunks++;
              } else {
                errors.push(`Failed to update chunk metadata: ${chunkUpdateError.message}`);
              }
            }
          }
        } else {
          console.log(`⚠️ No MPS numbers detected in ${doc.title}`);
          
          // Try to infer from filename or title
          const inferredMPS = inferMPSFromName(doc.title || doc.file_name || '');
          if (inferredMPS) {
            console.log(`🎯 Inferred MPS ${inferredMPS} from filename: ${doc.title}`);
            mpsMappings[inferredMPS] = doc.title || doc.file_name || `Document ${doc.id}`;
            
            // Update with inferred MPS
            const updatedMetadata = {
              ...doc.metadata,
              mps_numbers: [inferredMPS],
              inferred_mps: true,
              linkage_updated: new Date().toISOString()
            };

            await supabase
              .from('ai_documents')
              .update({ metadata: updatedMetadata })
              .eq('id', doc.id);

            linkedDocuments.push(doc.id);
          }
        }
      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
        errors.push(`Error processing ${doc.title}: ${docError instanceof Error ? docError.message : 'Unknown error'}`);
      }
    }

    // Ensure all MPS 1-25 are represented
    for (let i = 1; i <= 25; i++) {
      if (!mpsMappings[i]) {
        console.log(`⚠️ No document found for MPS ${i}`);
        errors.push(`No document linkage found for MPS ${i}`);
      }
    }

    // Log the rebuild results
    await supabase
      .from('audit_trail')
      .insert({
        organization_id: organizationId,
        table_name: 'ai_documents',
        record_id: organizationId,
        action: 'mps_linkage_rebuild',
        changed_by: '00000000-0000-0000-0000-000000000001',
        change_reason: JSON.stringify({
          linked_documents: linkedDocuments.length,
          updated_chunks: updatedChunks,
          mps_count: Object.keys(mpsMappings).length,
          force_rebuild: forceRebuild,
          timestamp: new Date().toISOString()
        })
      });

    const result: MPSLinkageResult = {
      success: true,
      linked_documents: linkedDocuments.length,
      updated_chunks: updatedChunks,
      mps_mappings: mpsMappings,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`✅ MPS linkage rebuild completed:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error rebuilding MPS linkage:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        linked_documents: 0,
        updated_chunks: 0,
        mps_mappings: {}
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractMPSNumbers(content: string, filename: string): number[] {
  const numbers = new Set<number>();
  
  // Pattern 1: "MPS 1", "MPS 2", etc.
  const mpsPattern1 = /MPS\s*(\d+)/gi;
  let match;
  while ((match = mpsPattern1.exec(content)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 25) numbers.add(num);
  }
  
  // Pattern 2: "MPS1", "MPS2", etc.
  const mpsPattern2 = /MPS(\d+)/gi;
  while ((match = mpsPattern2.exec(content)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 25) numbers.add(num);
  }
  
  // Pattern 3: Numbered lists like "1.", "2.", etc. (contextual)
  if (content.toLowerCase().includes('mini performance standard') || 
      content.toLowerCase().includes('maturity practice') ||
      filename.toLowerCase().includes('mps')) {
    const numberedPattern = /(?:^|\n)\s*(\d+)\./gm;
    while ((match = numberedPattern.exec(content)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 25) numbers.add(num);
    }
  }
  
  // Pattern 4: Section headings with numbers
  const sectionPattern = /(?:Section|Part|Chapter)\s*(\d+)/gi;
  while ((match = sectionPattern.exec(content)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 25) numbers.add(num);
  }
  
  return Array.from(numbers).sort((a, b) => a - b);
}

function inferMPSFromName(filename: string): number | null {
  const lower = filename.toLowerCase();
  
  // Check for explicit MPS numbers in filename
  const mpsMatch = lower.match(/mps\s*(\d+)/);
  if (mpsMatch) {
    const num = parseInt(mpsMatch[1]);
    if (num >= 1 && num <= 25) return num;
  }
  
  // Domain-based inference
  const domainMappings: Record<string, number[]> = {
    'leadership': [1, 2, 3, 4, 5],
    'governance': [1, 2, 3, 4, 5],
    'process': [6, 7, 8, 9, 10],
    'integrity': [6, 7, 8, 9, 10],
    'people': [11, 12, 13, 14],
    'culture': [11, 12, 13, 14],
    'protection': [15, 16, 17, 18, 19, 20],
    'security': [15, 16, 17, 18, 19, 20],
    'proof': [21, 22, 23, 24, 25],
    'works': [21, 22, 23, 24, 25]
  };
  
  for (const [keyword, mpsNumbers] of Object.entries(domainMappings)) {
    if (lower.includes(keyword)) {
      return mpsNumbers[0]; // Return first MPS of the domain
    }
  }
  
  // Specific topic inference
  if (lower.includes('risk')) return 4;
  if (lower.includes('legal') || lower.includes('regulatory')) return 5;
  if (lower.includes('chain of custody')) return 2;
  if (lower.includes('separation of duties')) return 3;
  
  return null;
}