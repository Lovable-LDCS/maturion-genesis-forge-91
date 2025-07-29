import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Search, Filter, FileText } from 'lucide-react';
import { PolicyChangeLog } from '@/hooks/usePolicyChangeLog';
import { format } from 'date-fns';

interface PolicyChangeLogTableProps {
  logs: PolicyChangeLog[];
  loading: boolean;
}

const PolicyChangeLogTable: React.FC<PolicyChangeLogTableProps> = ({ logs, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<PolicyChangeLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           log.logged_by.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || log.type === typeFilter;
      const matchesScope = scopeFilter === 'all' || log.domain_scope === scopeFilter;
      
      return matchesSearch && matchesType && matchesScope;
    });
  }, [logs, searchQuery, typeFilter, scopeFilter]);

  const getUniqueTypes = () => [...new Set(logs.map(log => log.type).filter(type => type && type.trim() !== ''))];
  const getUniqueScopes = () => [...new Set(logs.map(log => log.domain_scope).filter(scope => scope && scope.trim() !== ''))];

  const getPriorityBadge = (metadata: any) => {
    if (!metadata?.importance_level) return null;
    
    const level = metadata.importance_level.toLowerCase();
    const colors = {
      critical: 'destructive' as const,
      high: 'destructive' as const,
      medium: 'default' as const,
      low: 'secondary' as const
    };
    
    return (
      <Badge variant={colors[level as keyof typeof colors] || 'default'} className="text-xs">
        {metadata.importance_level}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📜 Policy Change Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📜 Policy Change Log
        </CardTitle>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getUniqueTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              {getUniqueScopes().map(scope => (
                <SelectItem key={scope} value={scope}>{scope}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Policy Logs Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all' || scopeFilter !== 'all' 
                ? 'No logs match your current filters.' 
                : 'No policy change logs have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Logged By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.title}</span>
                        {getPriorityBadge(log.metadata)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.domain_scope}</Badge>
                    </TableCell>
                    <TableCell>{log.logged_by}</TableCell>
                    <TableCell>
                      {format(new Date(log.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {log.tags?.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {log.tags && log.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{log.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {log.title}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-sm">Type</h4>
                                <Badge variant="outline">{log.type}</Badge>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">Scope</h4>
                                <Badge variant="secondary">{log.domain_scope}</Badge>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">Logged By</h4>
                                <p className="text-sm">{log.logged_by}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">Date</h4>
                                <p className="text-sm">{format(new Date(log.created_at), 'PPP')}</p>
                              </div>
                            </div>
                            
                            {log.tags && log.tags.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-1">
                                  {log.tags.map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Summary</h4>
                              <div className="bg-muted/30 p-3 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{log.summary}</p>
                              </div>
                            </div>
                            
                            {log.linked_document_id && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Linked Document</h4>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {log.linked_document_id}
                                </Badge>
                              </div>
                            )}
                            
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Additional Metadata</h4>
                                <pre className="bg-muted/30 p-3 rounded-lg text-xs overflow-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PolicyChangeLogTable;