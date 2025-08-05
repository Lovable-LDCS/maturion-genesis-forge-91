import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, MoreHorizontal, Edit, Trash2, RefreshCw, Download, Calendar, FileText, Database, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MaturionDocument } from '@/hooks/useMaturionDocuments';

interface DocumentManagementTableProps {
  documents: MaturionDocument[];
  loading: boolean;
  onEdit: (document: MaturionDocument) => void;
  onDelete: (documentId: string) => void;
  onReprocess: (documentId: string) => void;
  onBulkDelete: (documentIds: string[]) => void;
  onRefresh: () => void;
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <Database className="h-3 w-3" />;
    case 'processing': return <Clock className="h-3 w-3 animate-spin" />;
    case 'failed': return <Trash2 className="h-3 w-3" />;
    case 'pending': return <FileText className="h-3 w-3" />;
    default: return <FileText className="h-3 w-3" />;
  }
};

export const DocumentManagementTable: React.FC<DocumentManagementTableProps> = ({
  documents,
  loading,
  onEdit,
  onDelete,
  onReprocess,
  onBulkDelete,
  onRefresh
}) => {
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
          doc.tags?.toLowerCase().includes(searchLower) ||
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
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
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
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('title')}
                  >
                    Document Title
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('document_type')}
                  >
                    Type
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('domain')}
                  >
                    Domain
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('processing_status')}
                  >
                    Status
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('total_chunks')}
                  >
                    Chunks
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                  >
                    Uploaded
                  </TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading documents...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No documents match your current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50">
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
                        <Badge variant={getStatusVariant(doc.processing_status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(doc.processing_status)}
                          {doc.processing_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{doc.total_chunks || 0}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(doc)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Metadata
                            </DropdownMenuItem>
                            {doc.processing_status === 'failed' && (
                              <DropdownMenuItem onClick={() => onReprocess(doc.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reprocess
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
    </div>
  );
};