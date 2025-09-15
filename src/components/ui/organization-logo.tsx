import React, { useState, useEffect, useCallback } from 'react';
import { getOrgLogoUrl } from '@/lib/orgBrandingService';

interface OrganizationLogoProps {
  organizationId?: string;
  organizationName?: string;
  logoObjectPath?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base'
};

export const OrganizationLogo: React.FC<OrganizationLogoProps> = ({
  organizationId,
  organizationName = '',
  logoObjectPath,
  size = 'md',
  className = '',
  showFallback = true
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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

  // Load logo using signed URL
  const loadLogo = useCallback(async () => {
    if (!logoObjectPath || !organizationId) {
      setLogoUrl(null);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const result = await getOrgLogoUrl(organizationId);
      
      if (result.success && result.signedUrl) {
        setLogoUrl(result.signedUrl);
      } else {
        setError(true);
        setLogoUrl(null);
      }
    } catch (err) {
      console.warn('Error loading organization logo:', err);
      setError(true);
      setLogoUrl(null);
    } finally {
      setLoading(false);
    }
  }, [logoObjectPath, organizationId]);

  useEffect(() => {
    loadLogo();
  }, [loadLogo]);

  // Loading state
  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-muted animate-pulse ${className}`} />
    );
  }

  // Show logo if available and no error
  if (logoUrl && !error) {
    return (
      <img 
        src={logoUrl} 
        alt={`${organizationName} logo`}
        className={`${sizeClasses[size]} object-contain rounded-lg ${className}`}
        onError={() => {
          setError(true);
          setLogoUrl(null);
        }}
      />
    );
  }

  // Show fallback initials if enabled
  if (showFallback) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg border border-border bg-muted/50 flex items-center justify-center font-medium text-muted-foreground ${className}`}>
        {getCompanyInitials()}
      </div>
    );
  }

  // Return null if no fallback
  return null;
};