-- Fix DKP document type
UPDATE public.ai_documents
SET document_type = 'diamond_knowledge_pack'
WHERE organization_id = 'e443d914-8756-4b29-9599-6a59230b87f3'
  AND title ILIKE 'DKP_Layer1_Diamond_Recovery_Pipeline_v1.0%';