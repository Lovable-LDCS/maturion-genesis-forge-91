import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadOrgLogo, removeOrgLogo, getOrgLogoUrl } from '@/lib/orgBrandingService';

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
    if (!currentLogoPath || !organizationId) {
      setLogoUrl(null);
      setPreview(null);
      return;
    }

    try {
      const result = await getOrgLogoUrl(organizationId);
      
      if (result.success && result.signedUrl) {
        setLogoUrl(result.signedUrl);
        setPreview(result.signedUrl);
      } else {
        setLogoUrl(null);
        setPreview(null);
      }
    } catch (error) {
      console.warn('Error loading current logo:', error);
      setLogoUrl(null);
      setPreview(null);
    }
  }, [currentLogoPath, organizationId]);

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
      const result = await uploadOrgLogo(organizationId, file);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Get signed URL for immediate preview
      const urlResult = await getOrgLogoUrl(organizationId);
      if (urlResult.success && urlResult.signedUrl) {
        setPreview(urlResult.signedUrl);
        setLogoUrl(urlResult.signedUrl);
      }

      // Notify parent component
      onLogoUpdate?.(result.objectPath || null);

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
      const result = await removeOrgLogo(organizationId);
      
      if (!result.success) {
        throw new Error(result.error || 'Remove failed');
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