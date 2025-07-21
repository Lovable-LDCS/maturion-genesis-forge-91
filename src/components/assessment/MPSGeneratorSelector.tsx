import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, X } from 'lucide-react';

interface MPSGeneratorSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  onUseAI: () => void;
  onCreateManually: () => void;
}

export const MPSGeneratorSelector: React.FC<MPSGeneratorSelectorProps> = ({
  isOpen,
  onClose,
  domainName,
  onUseAI,
  onCreateManually
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">MPS & Criteria Generator</h2>
              <p className="text-sm text-muted-foreground">{domainName} Domain</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">
              How would you like to create your Mini Performance Standards (MPSs)?
            </h3>
            <p className="text-muted-foreground">
              Choose your preferred approach for building audit criteria under this domain.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* AI Assistance Option */}
            <Card 
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
              onClick={onUseAI}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">Use AI Assistance</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="mb-4">
                  Let AI propose a comprehensive set of MPSs and criteria based on LDCS principles and international standards.
                </CardDescription>
                <Badge variant="secondary" className="mb-4">
                  Recommended for beginners
                </Badge>
              </CardContent>
            </Card>

            {/* Manual Creation Option */}
            <Card 
              className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
              onClick={onCreateManually}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg">Create Manually</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="mb-4">
                  Build your own custom MPSs and criteria with optional AI hints and suggestions.
                </CardDescription>
                <Badge variant="outline" className="mb-4">
                  Full control
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};