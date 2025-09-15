import { supabase } from '@/integrations/supabase/client';

/**
 * Organization Branding Service
 * Handles secure logo upload and retrieval with tenant-scoped storage
 */

interface LogoUploadResult {
  success: boolean;
  objectPath?: string;
  error?: string;
}

interface LogoUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

/**
 * Upload organization logo to secure tenant-scoped storage
 * @param orgId Organization ID
 * @param file Logo file (PNG, JPG, JPEG, SVG, WebP)
 * @returns Promise<LogoUploadResult>
 */
export async function uploadOrgLogo(orgId: string, file: File): Promise<LogoUploadResult> {
  try {
    // Validate file type and size - restrict to PNG/WebP for canonical naming
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload PNG, JPG, JPEG, or WebP images only.'
      };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB (increased from 2MB for better UX)
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      };
    }

    // Canonical filename normalization - always use logo.{ext} 
    const originalExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const normalizedExt = ['png', 'webp'].includes(originalExt) ? originalExt : 'png';
    const canonicalPath = `org/${orgId}/logo/logo.${normalizedExt}`;

    // Upload logo with upsert - automatically replaces existing logo
    const { error: uploadError } = await supabase.storage
      .from('org_branding')
      .upload(canonicalPath, file, {
        upsert: true, // Automatically replaces existing logo - no orphans
        contentType: file.type
      });

    if (uploadError) {
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      };
    }

    // Save canonical object path in organizations table
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ 
        logo_object_path: canonicalPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to save logo path: ${updateError.message}`
      };
    }

    return {
      success: true,
      objectPath: canonicalPath
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error during logo upload'
    };
  }
}

/**
 * Get signed URL for organization logo rendering
 * @param orgId Organization ID
 * @param expirySeconds URL expiry time in seconds (default: 1 hour)
 * @returns Promise<LogoUrlResult>
 */
export async function getOrgLogoUrl(orgId: string, expirySeconds: number = 3600): Promise<LogoUrlResult> {
  try {
    // Get logo object path from organizations table
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('logo_object_path')
      .eq('id', orgId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch organization data: ${fetchError.message}`
      };
    }

    if (!org?.logo_object_path) {
      return {
        success: true,
        signedUrl: undefined // No logo set
      };
    }

    // Create signed URL for secure access
    const { data: urlData, error: urlError } = await supabase.storage
      .from('org_branding')
      .createSignedUrl(org.logo_object_path, expirySeconds);

    if (urlError) {
      return {
        success: false,
        error: `Failed to create signed URL: ${urlError.message}`
      };
    }

    return {
      success: true,
      signedUrl: urlData.signedUrl
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error getting logo URL'
    };
  }
}

/**
 * Remove organization logo
 * @param orgId Organization ID
 * @returns Promise<LogoUploadResult>
 */
export async function removeOrgLogo(orgId: string): Promise<LogoUploadResult> {
  try {
    // Get current logo path
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('logo_object_path')
      .eq('id', orgId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch organization data: ${fetchError.message}`
      };
    }

    if (!org?.logo_object_path) {
      return {
        success: true // Nothing to remove
      };
    }

    // Remove from storage
    const { error: removeError } = await supabase.storage
      .from('org_branding')
      .remove([org.logo_object_path]);

    if (removeError) {
      console.warn('Failed to remove from storage:', removeError);
      // Continue with database update even if storage removal fails
    }

    // Clear logo path from organizations table
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ 
        logo_object_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to clear logo path: ${updateError.message}`
      };
    }

    return {
      success: true
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unexpected error removing logo'
    };
  }
}