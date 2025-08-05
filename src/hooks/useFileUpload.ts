import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (
    file: File,
    bucket: string,
    path: string
  ): Promise<string | null> => {
    setUploading(true);
    
    try {
      // Validate file before upload using secure database function
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_file_upload', {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });

      const validationResult = validation as { valid: boolean; error?: string; sanitized_name?: string };

      if (validationError || !validationResult?.valid) {
        throw new Error(validationResult?.error || 'File validation failed');
      }

      // Use sanitized filename from validation
      const sanitizedPath = path.replace(/[^/]*$/, validationResult.sanitized_name || file.name);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(sanitizedPath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast({
        title: "Upload successful",
        description: "File uploaded successfully",
      });

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading
  };
};