
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface MPSValidationWarningsProps {
  warnings: string[];
}

export const MPSValidationWarnings: React.FC<MPSValidationWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Validation Warnings:</span>
      </div>
      <ul className="text-sm text-amber-700 mt-1 space-y-1">
        {warnings.map((warning, index) => (
          <li key={index} className="ml-6">• {warning}</li>
        ))}
      </ul>
    </div>
  );
};
