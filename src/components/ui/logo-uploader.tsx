import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LogoUploaderProps {
  organizationId: string;
  organizationName?: string;
  currentLogoPath?: string | null;
  onLogoUpdate?: (logoPath: string | null) => void;
  className?: string;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  organizationId,
  organizationName = '',
  currentLogoPath,
  onLogoUpdate,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate company initials for fallback
  const getCompanyInitials = useCallback(() => {
    if (!organizationName) return '??';
    return organizationName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [organizationName]);

  // Load current logo using signed URL
  const loadCurrentLogo = useCallback(async () => {
    if (!currentLogoPath) {
      setLogoUrl(null);
      setPreview(null);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('org_branding')
        .createSignedUrl(currentLogoPath, 3600); // 1 hour expiry

      if (error) {
        console.warn('Failed to create signed URL for logo:', error);
        return;
      }

      setLogoUrl(data.signedUrl);
      setPreview(data.signedUrl);
    } catch (error) {
      console.warn('Error loading current logo:', error);
    }
  }, [currentLogoPath]);

  useEffect(() => {
    loadCurrentLogo();
  }, [loadCurrentLogo]);

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PNG, JPG, SVG, or WebP image.';
    }
    
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return 'Image size must be less than 2 MB.';
    }
    
    return null;
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid File",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logo.${ext}`;
      const objectPath = `org/${organizationId}/logo/${fileName}`;

      // Remove existing logo files in the logo folder first
      try {
        const { data: existingFiles } = await supabase.storage
          .from('org_branding')
          .list(`org/${organizationId}/logo`);

        if (existingFiles && existingFiles.length > 0) {
          const filesToRemove = existingFiles.map(f => `org/${organizationId}/logo/${f.name}`);
          await supabase.storage
            .from('org_branding')
            .remove(filesToRemove);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup existing logos:', cleanupError);
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('org_branding')
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update organization record with new logo path
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          logo_object_path: objectPath,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (updateError) {
        throw updateError;
      }

      // Create signed URL for immediate preview
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('org_branding')
        .createSignedUrl(objectPath, 3600);

      if (signedUrlError) {
        console.warn('Failed to create signed URL:', signedUrlError);
      } else {
        setPreview(signedUrlData.signedUrl);
        setLogoUrl(signedUrlData.signedUrl);
      }

      // Notify parent component
      onLogoUpdate?.(objectPath);

      toast({
        title: "Logo Uploaded",
        description: "Company logo has been successfully uploaded.",
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle remove logo
  const handleRemoveLogo = async () => {
    if (!currentLogoPath) return;

    setUploading(true);
    try {
      // Remove from storage
      const { error: removeError } = await supabase.storage
        .from('org_branding')
        .remove([currentLogoPath]);

      if (removeError) {
        console.warn('Failed to remove from storage:', removeError);
      }

      // Update organization record
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          logo_object_path: null,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (updateError) {
        throw updateError;
      }

      setPreview(null);
      setLogoUrl(null);
      onLogoUpdate?.(null);

      toast({
        title: "Logo Removed",
        description: "Company logo has been removed.",
      });

    } catch (error: any) {
      console.error('Remove error:', error);
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Company Logo</h3>
            {(preview || currentLogoPath) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={uploading}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>

          {/* Preview Area */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex-shrink-0">
              {preview || logoUrl ? (
                <div className="relative">
                  <img 
                    src={preview || logoUrl || ''} 
                    alt="Company logo" 
                    className="h-16 w-16 object-contain rounded-lg border border-border"
                    onError={() => {
                      setPreview(null);
                      setLogoUrl(null);
                    }}
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                  <span className="text-sm font-medium text-muted-foreground">
                    {getCompanyInitials()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Upload a company logo (PNG, JPG, SVG, or WebP, max 2MB)
              </p>
              
              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                <div className="flex items-center justify-center gap-2">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                  </span>
                </div>
                
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files[0]);
                    }
                  }}
                  disabled={uploading}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Replace Button */}
          {(preview || logoUrl) && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploading}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Replace Logo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};