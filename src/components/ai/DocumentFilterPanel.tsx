import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers, BookOpen, GraduationCap, Globe, FileText } from 'lucide-react';

interface DocumentFilterPanelProps {
  onFilterChange: (filters: DocumentFilters) => void;
  totalDocuments: number;
  filteredCount: number;
}

export interface DocumentFilters {
  docType?: string;
  layer?: number;
  stage?: string;
  source?: string;
}

const DOC_TYPES = {
  organization_profile: { label: 'Organization Profile', icon: <BookOpen className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
  diamond_knowledge_pack: { label: 'Diamond Knowledge Pack', icon: <FileText className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-700' },
  training_slide: { label: 'Training Slides', icon: <GraduationCap className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  web_crawl: { label: 'Web Crawl', icon: <Globe className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700' },
  general: { label: 'General', icon: <FileText className="h-4 w-4" />, color: 'bg-gray-100 text-gray-700' }
};

const LAYERS = [
  { value: 1, label: 'Layer 1 - Organization', color: 'bg-blue-100 text-blue-700' },
  { value: 2, label: 'Layer 2 - Knowledge Base', color: 'bg-emerald-100 text-emerald-700' },
  { value: 3, label: 'Layer 3 - Training', color: 'bg-purple-100 text-purple-700' },
];

const STAGES = [
  { value: 'exploration', label: 'Exploration' },
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'mining', label: 'Mining' },
  { value: 'processing', label: 'Processing' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'selling', label: 'Selling' }
];

export const DocumentFilterPanel: React.FC<DocumentFilterPanelProps> = ({
  onFilterChange,
  totalDocuments,
  filteredCount
}) => {
  const [filters, setFilters] = React.useState<DocumentFilters>({});

  const handleFilterUpdate = (key: keyof DocumentFilters, value: any) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Document Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filteredCount} / {totalDocuments}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Document Type</label>
          <Select onValueChange={(value) => handleFilterUpdate('docType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All document types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(DOC_TYPES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Layer Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Layer</label>
          <Select onValueChange={(value) => handleFilterUpdate('layer', value === 'all' ? undefined : parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="All layers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Layers</SelectItem>
              {LAYERS.map((layer) => (
                <SelectItem key={layer.value} value={layer.value.toString()}>
                  <div className="flex items-center gap-2">
                    <Badge className={layer.color}>L{layer.value}</Badge>
                    {layer.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stage Filter (for Layer 3 training slides) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Stage</label>
          <Select onValueChange={(value) => handleFilterUpdate('stage', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Source</label>
          <Select onValueChange={(value) => handleFilterUpdate('source', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="crawl">Web Crawl</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};