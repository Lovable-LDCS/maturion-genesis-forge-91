import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'signed_off':
        return {
          text: 'Signed Off',
          className: 'bg-green-500 text-white hover:bg-green-600'
        };
      case 'ready_for_test':
        return {
          text: 'Ready for Test',
          className: 'bg-blue-500 text-white hover:bg-blue-600'
        };
      case 'in_progress':
        return {
          text: 'In Progress',
          className: 'bg-yellow-500 text-white hover:bg-yellow-600'
        };
      case 'failed':
        return {
          text: 'Failed',
          className: 'bg-red-500 text-white hover:bg-red-600'
        };
      case 'rejected':
        return {
          text: 'Rejected',
          className: 'bg-red-500 text-white hover:bg-red-600'
        };
      case 'escalated':
        return {
          text: 'Escalated',
          className: 'bg-orange-500 text-white hover:bg-orange-600'
        };
      case 'alternative_proposal':
        return {
          text: 'Alternative Proposal',
          className: 'bg-purple-500 text-white hover:bg-purple-600'
        };
      default:
        return {
          text: 'Not Started',
          className: 'bg-gray-400 text-white hover:bg-gray-500'
        };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.className} border-none ${className || ''}`}
    >
      {config.text}
    </Badge>
  );
};