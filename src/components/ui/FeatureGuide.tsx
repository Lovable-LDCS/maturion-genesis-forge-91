import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit3, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Settings, 
  Brain,
  Upload,
  Eye,
  MoreHorizontal,
  Info
} from 'lucide-react';

export const DocumentEditingGuide: React.FC = () => {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <strong>Document Editing Location:</strong> In the "Manage Documents" tab, click the 
        <MoreHorizontal className="h-4 w-4 inline mx-1" /> menu icon on any document row, then select 
        <Edit3 className="h-4 w-4 inline mx-1" /> "Edit" to modify title, domain, tags, and notes.
        You can also use <Eye className="h-4 w-4 inline mx-1" /> "View Audit Log" to see document history.
      </AlertDescription>
    </Alert>
  );
};

interface FeatureExplanationProps {
  title: string;
  description: string;
  purpose: string;
  howToUse: string[];
  status?: 'ready' | 'in-progress' | 'needs-attention';
}

export const FeatureExplanation: React.FC<FeatureExplanationProps> = ({
  title,
  description,
  purpose,
  howToUse,
  status = 'ready'
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Settings className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'needs-attention':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'needs-attention':
        return <Badge className="bg-amber-100 text-amber-800">Needs Attention</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {title}
          </CardTitle>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Purpose:</h4>
          <p className="text-sm text-muted-foreground">{purpose}</p>
        </div>
        <div>
          <h4 className="font-medium mb-2">How to Use:</h4>
          <ul className="space-y-1">
            {howToUse.map((step, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary font-medium">{idx + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};