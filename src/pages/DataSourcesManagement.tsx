import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { LiveDataSourceQuery } from '@/components/admin/LiveDataSourceQuery';
import { 
  Database, 
  Key, 
  RefreshCw, 
  Settings, 
  Trash2, 
  Plus, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Zap
} from 'lucide-react';

// Use the actual Supabase type
type DataSource = Tables<'data_sources'>;

const DataSourcesManagement: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    source_name: '',
    source_type: 'google_drive',
    api_key: '',
    client_id: '',
    client_secret: '',
    scope: '',
    webhook_url: '',
    custom_config: '{}',
    description: ''
  });

  const [testResults, setTestResults] = useState<{
    list: { success: boolean; data?: any; error?: string } | null;
    create: { success: boolean; data?: any; error?: string } | null;
  }>({
    list: null,
    create: null
  });

  useEffect(() => {
    if (currentOrganization) {
      loadDataSources();
    }
  }, [currentOrganization]);

  const loadDataSources = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataSources(data || []);
    } catch (error) {
      console.error('Error loading data sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data sources',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testDataSourcesAPI = async () => {
    if (!currentOrganization) return;
    
    try {
      // Test List API
      const listResponse = await supabase.functions.invoke('test-data-sources-api', {
        method: 'GET'
      });
      
      setTestResults(prev => ({
        ...prev,
        list: {
          success: !listResponse.error,
          data: listResponse.data,
          error: listResponse.error?.message
        }
      }));

      // Test Create API
      const createResponse = await supabase.functions.invoke('test-data-sources-api', {
        body: {
          organization_id: currentOrganization.id,
          source_name: 'QA Test Source',
          source_type: 'api',
          created_by: user?.id,
          updated_by: user?.id
        }
      });

      setTestResults(prev => ({
        ...prev,
        create: {
          success: !createResponse.error,
          data: createResponse.data,
          error: createResponse.error?.message
        }
      }));

      toast({
        title: 'API Tests Complete',
        description: 'Check the Test Results tab for detailed information'
      });
    } catch (error) {
      console.error('API test error:', error);
      toast({
        title: 'API Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const createDataSource = async () => {
    if (!currentOrganization || !user) return;

    try {
      const connectionConfig: Record<string, any> = {
        description: createForm.description
      };

      // Add type-specific configuration
      if (createForm.source_type === 'google_drive') {
        connectionConfig.client_id = createForm.client_id;
        connectionConfig.scope = createForm.scope || 'https://www.googleapis.com/auth/drive.readonly';
      } else if (createForm.source_type === 'sharepoint') {
        connectionConfig.client_id = createForm.client_id;
        connectionConfig.scope = createForm.scope || 'Sites.Read.All';
      } else if (createForm.source_type === 'api') {
        connectionConfig.api_endpoint = createForm.webhook_url;
      } else if (createForm.source_type === 'custom') {
        try {
          connectionConfig.custom = JSON.parse(createForm.custom_config);
        } catch {
          toast({
            title: 'Invalid JSON',
            description: 'Custom configuration must be valid JSON',
            variant: 'destructive'
          });
          return;
        }
      }

      const { error } = await supabase
        .from('data_sources')
        .insert({
          organization_id: currentOrganization.id,
          source_name: createForm.source_name,
          source_type: createForm.source_type,
          connection_config: connectionConfig,
          credentials_encrypted: createForm.api_key ? `encrypted:${createForm.api_key.slice(0, 8)}...` : null,
          metadata: {
            created_via: 'ui',
            description: createForm.description
          },
          created_by: user.id,
          updated_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Data source created successfully'
      });

      setShowCreateDialog(false);
      setCreateForm({
        source_name: '',
        source_type: 'google_drive',
        api_key: '',
        client_id: '',
        client_secret: '',
        scope: '',
        webhook_url: '',
        custom_config: '{}',
        description: ''
      });
      
      loadDataSources();
    } catch (error) {
      console.error('Error creating data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to create data source',
        variant: 'destructive'
      });
    }
  };

  const syncDataSource = async (dataSource: DataSource) => {
    try {
      const { error } = await supabase
        .from('data_sources')
        .update({
          sync_status: 'syncing',
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', dataSource.id);

      if (error) throw error;

      toast({
        title: 'Sync Started',
        description: `Synchronization started for ${dataSource.source_name}`
      });

      loadDataSources();
    } catch (error) {
      console.error('Error syncing data source:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to start synchronization',
        variant: 'destructive'
      });
    }
  };

  const deleteDataSource = async (dataSource: DataSource) => {
    if (!confirm(`Are you sure you want to delete ${dataSource.source_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('data_sources')
        .delete()
        .eq('id', dataSource.id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: `${dataSource.source_name} has been deleted`
      });

      loadDataSources();
    } catch (error) {
      console.error('Error deleting data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete data source',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      completed: 'default',
      syncing: 'secondary',
      failed: 'destructive',
      never_synced: 'secondary'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            Loading data sources...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Data Sources Management</h1>
          <p className="text-muted-foreground">
            Manage your organization's data sources, API connections, and synchronization settings.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="manage">Manage Sources</TabsTrigger>
            <TabsTrigger value="live-query">Live Query</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="test-results">Test Results</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataSources.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dataSources.filter(ds => ds.is_active).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Syncing</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dataSources.filter(ds => ds.sync_status === 'syncing').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dataSources.filter(ds => ds.sync_status === 'failed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataSources.slice(0, 5).map((source) => (
                    <div key={source.id} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(source.sync_status)}
                        <div>
                          <p className="font-medium">{source.source_name}</p>
                          <p className="text-sm text-muted-foreground">{source.source_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(source.sync_status)}
                        {source.last_sync_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last: {new Date(source.last_sync_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {dataSources.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No data sources configured yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live-query" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Live Data Source Query</h2>
              <p className="text-muted-foreground">
                Execute real-time queries against your connected data sources. No syncing required.
              </p>
            </div>
            
            <LiveDataSourceQuery organizationId={currentOrganization?.id || ''} />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Data Sources</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Data Source
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Data Source</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="source_name">Source Name</Label>
                        <Input
                          id="source_name"
                          value={createForm.source_name}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, source_name: e.target.value }))}
                          placeholder="My Data Source"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="source_type">Source Type</Label>
                        <Select 
                          value={createForm.source_type} 
                          onValueChange={(value) => setCreateForm(prev => ({ ...prev, source_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google_drive">Google Drive</SelectItem>
                            <SelectItem value="sharepoint">SharePoint</SelectItem>
                            <SelectItem value="dropbox">Dropbox</SelectItem>
                            <SelectItem value="api">REST API</SelectItem>
                            <SelectItem value="supabase">Supabase</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(createForm.source_type === 'google_drive' || createForm.source_type === 'sharepoint') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client_id">Client ID</Label>
                          <Input
                            id="client_id"
                            type="password"
                            value={createForm.client_id}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, client_id: e.target.value }))}
                            placeholder="OAuth Client ID"
                          />
                        </div>
                        <div>
                          <Label htmlFor="scope">Scope</Label>
                          <Input
                            id="scope"
                            value={createForm.scope}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, scope: e.target.value }))}
                            placeholder="API scope permissions"
                          />
                        </div>
                      </div>
                    )}

                    {createForm.source_type === 'api' && (
                      <div>
                        <Label htmlFor="webhook_url">API Endpoint URL</Label>
                        <Input
                          id="webhook_url"
                          value={createForm.webhook_url}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, webhook_url: e.target.value }))}
                          placeholder="https://api.example.com/endpoint"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="api_key">API Key / Secret</Label>
                      <Input
                        id="api_key"
                        type="password"
                        value={createForm.api_key}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, api_key: e.target.value }))}
                        placeholder="API key or authentication token"
                      />
                    </div>

                    {createForm.source_type === 'custom' && (
                      <div>
                        <Label htmlFor="custom_config">Custom Configuration (JSON)</Label>
                        <Textarea
                          id="custom_config"
                          value={createForm.custom_config}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, custom_config: e.target.value }))}
                          placeholder='{"key": "value"}'
                          rows={4}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={createForm.description}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description of this data source"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createDataSource}>
                        Create Data Source
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {dataSources.map((source) => (
                <Card key={source.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Database className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{source.source_name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{source.source_type}</Badge>
                            {getStatusBadge(source.sync_status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncDataSource(source)}
                          disabled={source.sync_status === 'syncing'}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${source.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteDataSource(source)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {source.sync_error_message && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {source.sync_error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Key Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    API keys are encrypted and stored securely. Only truncated versions are displayed for security.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  {dataSources.filter(ds => ds.credentials_encrypted).map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{source.source_name}</p>
                        <p className="text-sm text-muted-foreground">{source.source_type}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {source.credentials_encrypted}
                        </code>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Rotate Key
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {dataSources.filter(ds => ds.credentials_encrypted).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No API keys configured yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test-results" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">API Test Results</h2>
              <Button onClick={testDataSourcesAPI}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Tests
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    List Data Sources API
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.list ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {testResults.list.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          {testResults.list.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      {testResults.list.success && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">
                            Found {testResults.list.data?.count || 0} data sources
                          </p>
                        </div>
                      )}
                      
                      {testResults.list.error && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.list.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No test results yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Data Source API
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.create ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {testResults.create.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          {testResults.create.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      {testResults.create.success && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">
                            Created data source: {testResults.create.data?.data?.source_name}
                          </p>
                        </div>
                      )}
                      
                      {testResults.create.error && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.create.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No test results yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataSourcesManagement;