import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Play, Pause } from 'lucide-react';

interface StatusIconProps {
  status: string;
  className?: string;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status, className = "h-4 w-4" }) => {
  switch (status) {
    case 'signed_off':
      return <CheckCircle className={`${className} text-green-500`} />;
    case 'ready_for_test':
      return <Play className={`${className} text-blue-500`} />;
    case 'in_progress':
      return <Clock className={`${className} text-yellow-500`} />;
    case 'failed':
    case 'rejected':
      return <XCircle className={`${className} text-red-500`} />;
    case 'escalated':
      return <AlertCircle className={`${className} text-orange-500`} />;
    case 'alternative_proposal':
      return <Pause className={`${className} text-purple-500`} />;
    default:
      return <AlertCircle className={`${className} text-gray-400`} />;
  }
};