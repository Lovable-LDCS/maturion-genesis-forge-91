import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, MoreHorizontal, Edit, Trash2, RefreshCw, Download, Calendar, FileText, Database, Clock, Upload, Eye, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';
import { DocumentEditDialog } from "./DocumentEditDialog";
import { DocumentAuditLogDialog } from "./DocumentAuditLogDialog";
import { UnifiedDocumentMetadataDialog } from "./UnifiedDocumentMetadataDialog";
import { DocumentFileReplacementDialog } from "./DocumentFileReplacementDialog";

interface DocumentManagementTableProps {
  documents: MaturionDocument[];
  loading: boolean;
  onEdit: (document: MaturionDocument) => void;
  onDelete: (documentId: string) => void;
  onReprocess: (documentId: string) => void;
  onBulkDelete: (documentIds: string[]) => void;
  onRefresh: () => void;
  onReplace?: (document: MaturionDocument) => void;
  onViewAuditLog?: (documentId: string) => void;
  onRegenerateEmbeddings?: () => void;
}

interface DocumentFilters {
  search: string;
  type: string;
  status: string;
  domain: string;
  dateRange: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'processing': return 'secondary';
    case 'failed': return 'destructive';
    case 'pending': return 'outline';
    default: return 'outline';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-300';
    case 'processing': return 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse';
    case 'failed': return 'bg-red-100 text-red-800 border-red-300';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-3 w-3" />;
    case 'processing': return <Loader2 className="h-3 w-3 animate-spin" />;
    case 'failed': return <AlertTriangle className="h-3 w-3" />;
    case 'pending': return <Clock className="h-3 w-3" />;
    default: return <FileText className="h-3 w-3" />;
  }
};

const getStatusTooltip = (status: string) => {
  switch (status) {
    case 'completed': return 'Document successfully processed and chunked';
    case 'processing': return 'Document is being processed and analyzed';
    case 'failed': return 'Document processing failed - click to reprocess';
    case 'pending': return 'Document queued for processing';
    default: return 'Unknown status';
  }
};

export const DocumentManagementTable: React.FC<DocumentManagementTableProps> = ({
  documents,
  loading,
  onEdit,
  onDelete,
  onReprocess,
  onBulkDelete,
  onRefresh,
  onReplace,
  onViewAuditLog,
  onRegenerateEmbeddings
}) => {
  
  // State for dialog management
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [selectedDocumentForReplace, setSelectedDocumentForReplace] = useState<MaturionDocument | null>(null);
  
  // Count pending documents
  const pendingCount = documents.filter(doc => doc.processing_status === 'pending').length;

  // Handle replace document
  const handleReplace = (document: MaturionDocument) => {
    setSelectedDocumentForReplace(document);
    setReplaceDialogOpen(true);
  };

  const handleReplaceSuccess = () => {
    onRefresh();
    setReplaceDialogOpen(false);
    setSelectedDocumentForReplace(null);
  };

  // Count pending documents
  const pendingDocsCount = documents.filter(doc => doc.processing_status === 'pending').length;
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    type: 'all',
    status: 'all',
    domain: 'all',
    dateRange: 'all'
  });
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof MaturionDocument>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filtering and sorting logic
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          doc.title?.toLowerCase().includes(searchLower) ||
          doc.file_name.toLowerCase().includes(searchLower) ||
          (Array.isArray(doc.tags) ? doc.tags.join(', ') : (doc.tags || '')).toLowerCase().includes(searchLower) ||
          doc.domain?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type !== 'all' && doc.document_type !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && doc.processing_status !== filters.status) {
        return false;
      }

      // Domain filter
      if (filters.domain !== 'all' && doc.domain !== filters.domain) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const docDate = new Date(doc.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today':
            if (daysDiff > 0) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
        }
      }

      return true;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [documents, filters, sortField, sortDirection]);

  // Get unique values for filter dropdowns
  const uniqueTypes = useMemo(() => 
    [...new Set(documents.map(doc => doc.document_type))].sort(),
    [documents]
  );

  const uniqueDomains = useMemo(() => 
    [...new Set(documents.map(doc => doc.domain).filter(Boolean))].sort(),
    [documents]
  );

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedDocuments.length;
    const completed = filteredAndSortedDocuments.filter(doc => doc.processing_status === 'completed').length;
    const processing = filteredAndSortedDocuments.filter(doc => doc.processing_status === 'processing').length;
    const failed = filteredAndSortedDocuments.filter(doc => doc.processing_status === 'failed').length;
    const totalChunks = filteredAndSortedDocuments.reduce((sum, doc) => sum + (doc.total_chunks || 0), 0);
    
    return { total, completed, processing, failed, totalChunks };
  }, [filteredAndSortedDocuments]);

  // Selection handlers
  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const selectAllDocuments = () => {
    setSelectedDocuments(new Set(filteredAndSortedDocuments.map(doc => doc.id)));
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const handleSort = (field: keyof MaturionDocument) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleBulkDelete = () => {
    if (selectedDocuments.size > 0) {
      onBulkDelete(Array.from(selectedDocuments));
      setSelectedDocuments(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vector Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChunks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Manage your organization's documents with advanced filtering and bulk operations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {pendingDocsCount > 0 && (
                <Button 
                  onClick={() => {
                    // Trigger reprocessing of all pending documents
                    documents.filter(doc => doc.processing_status === 'pending')
                      .forEach(doc => onReprocess(doc.id));
                  }} 
                  variant="secondary" 
                  size="sm"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Retry Pending ({pendingDocsCount})
                </Button>
              )}
              {onRegenerateEmbeddings && (
                <Button 
                  onClick={onRegenerateEmbeddings} 
                  variant="outline" 
                  size="sm"
                >
                  <Database className="h-4 w-4 mr-1" />
                  Fix Embeddings
                </Button>
              )}
              {selectedDocuments.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedDocuments.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Documents</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedDocuments.size} document(s)? 
                        This action cannot be undone and will remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                        Delete Documents
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.domain} onValueChange={(value) => setFilters(prev => ({ ...prev, domain: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {uniqueDomains.map(domain => (
                  <SelectItem key={domain} value={domain || ''}>
                    {domain || 'No Domain'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="AI Processed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="completed">AI Ready</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection Controls */}
          {filteredAndSortedDocuments.length > 0 && (
            <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedDocuments.size === filteredAndSortedDocuments.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAllDocuments();
                    } else {
                      clearSelection();
                    }
                  }}
                />
                <span>Select All ({filteredAndSortedDocuments.length})</span>
              </div>
              {selectedDocuments.size > 0 && (
                <div className="flex items-center gap-2">
                  <span>{selectedDocuments.size} selected</span>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Documents Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 sticky left-0 bg-background z-10">
                    <Checkbox
                      checked={selectedDocuments.size === filteredAndSortedDocuments.length && filteredAndSortedDocuments.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllDocuments();
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground min-w-[200px]"
                    onClick={() => handleSort('title')}
                  >
                    Document Title
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground min-w-[120px]"
                    onClick={() => handleSort('document_type')}
                  >
                    Type
                  </TableHead>
                   <TableHead 
                     className="cursor-pointer hover:text-foreground min-w-[100px]"
                     onClick={() => handleSort('domain')}
                   >
                     Domain
                   </TableHead>
                   <TableHead className="min-w-[150px]">
                     Context/Organization
                   </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground min-w-[120px]"
                    onClick={() => handleSort('processing_status')}
                  >
                    Status
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground min-w-[80px]"
                    onClick={() => handleSort('total_chunks')}
                  >
                    Chunks
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground min-w-[120px]"
                    onClick={() => handleSort('created_at')}
                  >
                    Uploaded
                  </TableHead>
                  <TableHead className="w-20 sticky right-0 bg-background z-10">
                    <div className="flex items-center gap-1">
                      Actions
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Click ⋯ to edit, replace, or delete documents
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {loading ? (
                   <TableRow>
                     <TableCell colSpan={9} className="text-center py-8">
                       <div className="flex items-center justify-center gap-2">
                         <Clock className="h-4 w-4 animate-spin" />
                         Loading documents...
                       </div>
                     </TableCell>
                   </TableRow>
                 ) : filteredAndSortedDocuments.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                       No documents match your current filters
                     </TableCell>
                   </TableRow>
                ) : (
                  filteredAndSortedDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50 group">
                      <TableCell>
                        <Checkbox
                          checked={selectedDocuments.has(doc.id)}
                          onCheckedChange={() => toggleDocumentSelection(doc.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doc.title || doc.file_name}</div>
                          <div className="text-sm text-muted-foreground">{doc.file_name}</div>
                          {doc.tags && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Tags: {doc.tags}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {doc.document_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         {doc.domain ? (
                           <Badge variant="secondary">{doc.domain}</Badge>
                         ) : (
                           <span className="text-muted-foreground text-sm">-</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {/* Context/Organization Display */}
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                             (doc as any).context_level === 'global' ? 'bg-blue-500' :
                             (doc as any).context_level === 'subsidiary' ? 'bg-gray-500' :
                             'bg-green-500'
                           }`} />
                           <div className="text-sm">
                             {(doc as any).context_level === 'global' ? (
                               <span className="text-blue-700 dark:text-blue-300 font-medium">
                                 Backoffice/Global
                               </span>
                             ) : (
                               <span className="text-gray-700 dark:text-gray-300">
                                 {/* We would need to fetch org name here, for now show ID */}
                                 Organization
                               </span>
                             )}
                           </div>
                         </div>
                       </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant={getStatusVariant(doc.processing_status)} 
                                className={`flex items-center gap-1 w-fit border ${getStatusColor(doc.processing_status)}`}
                              >
                                {getStatusIcon(doc.processing_status)}
                                {doc.processing_status}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getStatusTooltip(doc.processing_status)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{doc.total_chunks || 0}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                       <TableCell className="sticky right-0 bg-background z-10">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="h-8 w-8 p-0 bg-muted/30 hover:bg-muted border border-muted-foreground/20 hover:border-muted-foreground/40 transition-all duration-200"
                               title="Click for document actions: Edit, Replace, Delete, etc."
                             >
                               <span className="sr-only">Open document actions menu</span>
                               <MoreHorizontal className="h-4 w-4 text-foreground/60 hover:text-foreground transition-colors" />
                             </Button>
                           </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(doc)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Metadata
                            </DropdownMenuItem>
                             {onReplace && (
                               <DropdownMenuItem onClick={() => handleReplace(doc)}>
                                 <Upload className="h-4 w-4 mr-2" />
                                 Replace Document
                               </DropdownMenuItem>
                             )}
                            {onViewAuditLog && (
                              <DropdownMenuItem onClick={() => onViewAuditLog(doc.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Audit Log
                              </DropdownMenuItem>
                            )}
                            {(doc.processing_status === 'failed' || doc.processing_status === 'pending') && (
                              <DropdownMenuItem onClick={() => onReprocess(doc.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {doc.processing_status === 'failed' ? 'Reprocess' : 'Force Process'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDelete(doc.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Document File Replacement Dialog */}
      {selectedDocumentForReplace && (
        <DocumentFileReplacementDialog
          open={replaceDialogOpen}
          onOpenChange={setReplaceDialogOpen}
          document={selectedDocumentForReplace}
          onSuccess={handleReplaceSuccess}
        />
      )}
    </div>
  );
};