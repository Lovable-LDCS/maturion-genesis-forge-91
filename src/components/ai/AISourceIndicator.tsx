import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Globe, AlertTriangle } from 'lucide-react';

interface AISourceIndicatorProps {
  sourceType: 'internal' | 'external';
  isInternalOnlyContext?: boolean;
  hasDocumentContext?: boolean;
  className?: string;
}

export const AISourceIndicator: React.FC<AISourceIndicatorProps> = ({
  sourceType,
  isInternalOnlyContext = false,
  hasDocumentContext = false,
  className = ""
}) => {
  const getIndicatorContent = () => {
    if (isInternalOnlyContext) {
      if (sourceType === 'internal' && hasDocumentContext) {
        return {
          icon: Shield,
          text: 'Internal Docs',
          variant: 'default' as const,
          tooltip: 'This content is generated using only your organization\'s approved internal documents.',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      } else {
        return {
          icon: AlertTriangle,
          text: 'No Internal Docs',
          variant: 'destructive' as const,
          tooltip: 'Insufficient internal documentation available. Please upload relevant documents to your knowledge base.',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      }
    } else {
      if (sourceType === 'internal' && hasDocumentContext) {
        return {
          icon: Shield,
          text: 'Internal + External',
          variant: 'secondary' as const,
          tooltip: 'This content combines your internal documents with external industry knowledge.',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      } else {
        return {
          icon: Globe,
          text: 'External Context',
          variant: 'outline' as const,
          tooltip: 'This content is based on general industry knowledge and best practices.',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      }
    }
  };

  const { icon: Icon, text, tooltip, className: badgeClassName } = getIndicatorContent();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`flex items-center gap-1 text-xs ${badgeClassName} ${className}`}
          >
            <Icon size={12} />
            {text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};