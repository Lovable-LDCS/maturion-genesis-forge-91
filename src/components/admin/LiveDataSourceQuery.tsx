import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Database, 
  Loader2, 
  Download, 
  Search, 
  List, 
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';

interface DataSource {
  id: string;
  source_name: string;
  source_type: string;
  is_active: boolean;
}

interface QueryResult {
  success: boolean;
  data: any[];
  metadata: {
    execution_time_ms: number;
    row_count: number;
    has_more: boolean;
  };
  error?: string;
}

interface LiveDataSourceQueryProps {
  organizationId: string;
}

export const LiveDataSourceQuery: React.FC<LiveDataSourceQueryProps> = ({ organizationId }) => {
  const { toast } = useToast();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [queryType, setQueryType] = useState<'sql' | 'search' | 'list' | 'get'>('list');
  const [query, setQuery] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [limit, setLimit] = useState(100);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDataSources();
  }, [organizationId]);

  const loadDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('id, source_name, source_type, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;
      setDataSources(data || []);
    } catch (error) {
      console.error('Error loading data sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data sources',
        variant: 'destructive'
      });
    }
  };

  const testConnection = async (dataSourceId: string) => {
    setIsConnecting(true);
    setConnectionStatuses(prev => ({ ...prev, [dataSourceId]: 'connecting' }));

    try {
      const { data, error } = await supabase.functions.invoke('connect-data-source', {
        body: {
          data_source_id: dataSourceId,
          organization_id: organizationId,
          connection_test: true
        }
      });

      if (error) throw error;

      const status = data.success ? 'connected' : 'failed';
      setConnectionStatuses(prev => ({ ...prev, [dataSourceId]: status }));

      toast({
        title: data.success ? 'Connection Successful' : 'Connection Failed',
        description: data.success 
          ? 'Live connection established successfully'
          : data.error || 'Failed to establish connection',
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatuses(prev => ({ ...prev, [dataSourceId]: 'failed' }));
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const executeQuery = async () => {
    if (!selectedDataSource) {
      toast({
        title: 'No Data Source Selected',
        description: 'Please select a data source first',
        variant: 'destructive'
      });
      return;
    }

    setIsQuerying(true);
    setQueryResult(null);

    try {
      let parsedParameters = {};
      try {
        parsedParameters = JSON.parse(parameters);
      } catch {
        // If parameters can't be parsed as JSON, ignore them
      }

      const { data, error } = await supabase.functions.invoke('query-data-source', {
        body: {
          data_source_id: selectedDataSource,
          organization_id: organizationId,
          query: query.trim(),
          query_type: queryType,
          parameters: parsedParameters,
          limit
        }
      });

      if (error) throw error;

      setQueryResult(data);

      toast({
        title: data.success ? 'Query Executed' : 'Query Failed',
        description: data.success 
          ? `Retrieved ${data.metadata.row_count} rows in ${data.metadata.execution_time_ms}ms`
          : data.error || 'Query execution failed',
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Query execution error:', error);
      toast({
        title: 'Query Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const getConnectionStatusBadge = (dataSourceId: string) => {
    const status = connectionStatuses[dataSourceId] || 'unknown';
    const variants = {
      connected: 'bg-green-100 text-green-800',
      connecting: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800'
    };

    const icons = {
      connected: CheckCircle2,
      connecting: Loader2,
      failed: AlertCircle,
      unknown: Clock
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'connecting' ? 'animate-spin' : ''}`} />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const exportResults = () => {
    if (!queryResult?.data) return;

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(queryResult.data[0]).join(",") + "\n"
      + queryResult.data.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getQueryPlaceholder = () => {
    switch (queryType) {
      case 'sql':
        return 'SELECT * FROM table_name WHERE condition = $1';
      case 'search':
        return 'Search terms or keywords';
      case 'list':
        return 'table_name or leave empty for default';
      case 'get':
        return 'record_id or identifier';
      default:
        return 'Enter your query...';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Live Data Source Query
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Source Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Source</Label>
              <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center">
                        <Database className="h-4 w-4 mr-2" />
                        {source.source_name} ({source.source_type})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Query Type</Label>
              <Select value={queryType} onValueChange={(value: any) => setQueryType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">
                    <div className="flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      List Records
                    </div>
                  </SelectItem>
                  <SelectItem value="search">
                    <div className="flex items-center">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </div>
                  </SelectItem>
                  <SelectItem value="get">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Get Record
                    </div>
                  </SelectItem>
                  <SelectItem value="sql">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 mr-2" />
                      SQL Query
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Connection Status */}
          {selectedDataSource && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Connection Status:</span>
                {getConnectionStatusBadge(selectedDataSource)}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testConnection(selectedDataSource)}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>
          )}

          {/* Query Input */}
          <div>
            <Label>Query</Label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={getQueryPlaceholder()}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>

          {/* Parameters and Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Parameters (JSON)</Label>
              <Textarea
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder='{"table": "users", "column": "name"}'
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Limit</Label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                min={1}
                max={1000}
              />
            </div>
          </div>

          {/* Execute Button */}
          <Button
            onClick={executeQuery}
            disabled={!selectedDataSource || !query.trim() || isQuerying}
            className="w-full"
          >
            {isQuerying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Execute Query
          </Button>
        </CardContent>
      </Card>

      {/* Query Results */}
      {queryResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Query Results</span>
              {queryResult.success && queryResult.data.length > 0 && (
                <Button size="sm" variant="outline" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queryResult.success ? (
              <>
                <div className="flex items-center space-x-4 mb-4 text-sm text-muted-foreground">
                  <span>Rows: {queryResult.metadata.row_count}</span>
                  <span>Time: {queryResult.metadata.execution_time_ms}ms</span>
                  {queryResult.metadata.has_more && (
                    <Badge variant="secondary">More results available</Badge>
                  )}
                </div>

                {queryResult.data.length > 0 ? (
                  <div className="overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(queryResult.data[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResult.data.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value, colIndex) => (
                              <TableCell key={colIndex}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found
                  </div>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {queryResult.error || 'Query execution failed'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveDataSourceQuery;