import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';

interface SignOffButtonProps {
  isSignedOff: boolean;
  onSignOff: () => void;
  loading?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline';
}

export const SignOffButton: React.FC<SignOffButtonProps> = ({ 
  isSignedOff, 
  onSignOff, 
  loading = false,
  size = 'sm',
  variant = 'default'
}) => {
  if (isSignedOff) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className="cursor-not-allowed bg-green-50 text-green-700 border-green-200"
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Signed Off
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onSignOff}
      disabled={loading}
      className="bg-primary text-primary-foreground hover:bg-primary/90"
    >
      {loading ? (
        <>
          <Clock className="mr-2 h-4 w-4 animate-spin" />
          Signing Off...
        </>
      ) : (
        'Sign Off'
      )}
    </Button>
  );
};