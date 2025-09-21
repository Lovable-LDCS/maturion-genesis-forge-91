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
    source_type: 'supabase',
    api_key: '',
    client_id: '',
    client_secret: '',
    scope: '',
    webhook_url: '',
    custom_config: '{}',
    description: '',
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_key: ''
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
      setIsCreating(true);
      
      const connectionConfig: Record<string, any> = {
        description: createForm.description
      };

      // Prepare credentials for encryption
      let credentialsToEncrypt: Record<string, any> = {};

      // Add type-specific configuration
      if (createForm.source_type === 'supabase') {
        connectionConfig.url = createForm.supabase_url;
        connectionConfig.supports_realtime = true;
        connectionConfig.supports_storage = true;
        connectionConfig.supports_live_queries = true;
        
        credentialsToEncrypt = {
          anon_key: createForm.supabase_anon_key,
          service_role_key: createForm.supabase_service_key,
          url: createForm.supabase_url
        };
      } else if (createForm.source_type === 'postgresql') {
        connectionConfig.supports_live_queries = true;
        connectionConfig.connection_type = 'database';
        
        credentialsToEncrypt = {
          host: createForm.host || '',
          port: createForm.port || 5432,
          database: createForm.database || '',
          username: createForm.username || '',
          password: createForm.password || ''
        };
      } else if (createForm.source_type === 'mysql') {
        connectionConfig.supports_live_queries = true;
        connectionConfig.connection_type = 'database';
        
        credentialsToEncrypt = {
          host: createForm.host || '',
          port: createForm.port || 3306,
          database: createForm.database || '',
          username: createForm.username || '',
          password: createForm.password || ''
        };
      } else if (createForm.source_type === 'rest_api') {
        connectionConfig.supports_live_queries = true;
        connectionConfig.connection_type = 'api';
        
        credentialsToEncrypt = {
          base_url: createForm.webhook_url,
          api_key: createForm.api_key,
          headers: {}
        };
      } else if (createForm.source_type === 'google_drive') {
        connectionConfig.client_id = createForm.client_id;
        connectionConfig.scope = createForm.scope || 'https://www.googleapis.com/auth/drive.readonly';
        
        credentialsToEncrypt = {
          client_id: createForm.client_id,
          client_secret: createForm.client_secret,
          access_token: ''
        };
      } else if (createForm.source_type === 'sharepoint') {
        connectionConfig.client_id = createForm.client_id;
        connectionConfig.scope = createForm.scope || 'Sites.Read.All';
        
        credentialsToEncrypt = {
          client_id: createForm.client_id,
          client_secret: createForm.client_secret,
          access_token: ''
        };
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
        
        credentialsToEncrypt = {
          endpoint: createForm.webhook_url,
          api_key: createForm.api_key,
          headers: {}
        };
      }

      // Encrypt credentials using production encryption
      const { data: encryptedResult, error: encryptError } = await supabase.functions.invoke('encrypt-credentials', {
        body: { action: 'encrypt', data: credentialsToEncrypt }
      });

      if (encryptError) {
        throw new Error('Failed to encrypt credentials: ' + encryptError.message);
      }

      const { error } = await supabase
        .from('data_sources')
        .insert({
          organization_id: currentOrganization.id,
          source_name: createForm.source_name,
          source_type: createForm.source_type,
          connection_config: connectionConfig,
          credentials_encrypted: encryptedResult.encrypted,
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
        description: 'Data source created successfully with encrypted credentials'
      });

      setShowCreateDialog(false);
      setCreateForm({
        source_name: '',
        source_type: 'supabase',
        api_key: '',
        client_id: '',
        client_secret: '',
        scope: '',
        webhook_url: '',
        custom_config: '{}',
        description: '',
        supabase_url: '',
        supabase_anon_key: '',
        supabase_service_key: ''
      });
      
      loadDataSources();
    } catch (error) {
      console.error('Error creating data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to create data source',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };
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
          credentials_encrypted: createForm.source_type === 'supabase' 
            ? connectionConfig.credentials_encrypted 
            : (createForm.api_key ? `encrypted:${createForm.api_key.slice(0, 8)}...` : null),
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
        source_type: 'supabase',
        api_key: '',
        client_id: '',
        client_secret: '',
        scope: '',
        webhook_url: '',
        custom_config: '{}',
        description: '',
        supabase_url: '',
        supabase_anon_key: '',
        supabase_service_key: ''
      });
      
      loadDataSources();

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
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Add Data Source Connection</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Connect to databases and APIs for <strong>live, real-time querying</strong>. 
                      No syncing required - query data directly from your sources.
                    </p>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Step 1: Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">1. Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="source_name">Connection Name</Label>
                          <Input
                            id="source_name"
                            value={createForm.source_name}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, source_name: e.target.value }))}
                            placeholder="e.g., Production Database, Customer CRM"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input
                            id="description"
                            value={createForm.description}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of this data source"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Source Type Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">2. Choose Connection Type</h3>
                      <div>
                        <Label htmlFor="source_type">Data Source Type</Label>
                        <Select 
                          value={createForm.source_type} 
                          onValueChange={(value) => setCreateForm(prev => ({ ...prev, source_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supabase">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Supabase Database</span>
                                <span className="text-xs text-muted-foreground">PostgreSQL with real-time features</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="postgresql">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">PostgreSQL</span>
                                <span className="text-xs text-muted-foreground">Direct PostgreSQL database connection</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="mysql">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">MySQL</span>
                                <span className="text-xs text-muted-foreground">MySQL database connection</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="api">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">REST API</span>
                                <span className="text-xs text-muted-foreground">HTTP API with authentication</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="google_drive">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Google Drive</span>
                                <span className="text-xs text-muted-foreground">Google Drive files and documents</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sharepoint">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">SharePoint</span>
                                <span className="text-xs text-muted-foreground">Microsoft SharePoint documents</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="custom">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">Custom Integration</span>
                                <span className="text-xs text-muted-foreground">Custom API or database connection</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Connection Type Description */}
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                          {createForm.source_type === 'supabase' && (
                            <p><strong>Supabase:</strong> Real-time PostgreSQL database with built-in authentication and APIs. Ideal for modern applications.</p>
                          )}
                          {createForm.source_type === 'postgresql' && (
                            <p><strong>PostgreSQL:</strong> Direct connection to PostgreSQL databases. Supports complex queries and large datasets.</p>
                          )}
                          {createForm.source_type === 'mysql' && (
                            <p><strong>MySQL:</strong> Connect to MySQL databases for live data access and analysis.</p>
                          )}
                          {createForm.source_type === 'api' && (
                            <p><strong>REST API:</strong> Connect to HTTP APIs with authentication support. Query external services directly.</p>
                          )}
                          {createForm.source_type === 'google_drive' && (
                            <p><strong>Google Drive:</strong> Access documents, spreadsheets, and files from Google Drive.</p>
                          )}
                          {createForm.source_type === 'sharepoint' && (
                            <p><strong>SharePoint:</strong> Connect to Microsoft SharePoint for document and data access.</p>
                          )}
                          {createForm.source_type === 'custom' && (
                            <p><strong>Custom:</strong> Define your own connection parameters for specialized integrations.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Connection Configuration */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">3. Connection Configuration</h3>
                      
                      {/* Supabase Configuration */}
                      {createForm.source_type === 'supabase' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center">
                              <Database className="h-4 w-4 mr-2" />
                              Supabase Connection Details
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Enter your Supabase project credentials for live database access
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="supabase_url">Project URL *</Label>
                              <Input
                                id="supabase_url"
                                type="url"
                                value={createForm.supabase_url}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, supabase_url: e.target.value }))}
                                placeholder="https://your-project.supabase.co"
                                required
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="supabase_anon_key">Public Anon Key *</Label>
                              <Input
                                id="supabase_anon_key"
                                value={createForm.supabase_anon_key}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, supabase_anon_key: e.target.value }))}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                required
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Found in your Supabase project settings under API
                              </p>
                            </div>
                            
                            <div>
                              <Label htmlFor="supabase_service_key">Service Role Key (Optional)</Label>
                              <Input
                                id="supabase_service_key"
                                type="password"
                                value={createForm.supabase_service_key}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, supabase_service_key: e.target.value }))}
                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Provides elevated access for protected tables and operations
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Other source types configuration */}
                      {createForm.source_type === 'api' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">REST API Connection</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>API Base URL</Label>
                              <Input
                                value={createForm.webhook_url}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, webhook_url: e.target.value }))}
                                placeholder="https://api.example.com/v1"
                              />
                            </div>
                            <div>
                              <Label>API Key</Label>
                              <Input
                                type="password"
                                value={createForm.api_key}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, api_key: e.target.value }))}
                                placeholder="your-api-key"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {(createForm.source_type === 'google_drive' || createForm.source_type === 'sharepoint') && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">OAuth Configuration</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>Client ID</Label>
                              <Input
                                value={createForm.client_id}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, client_id: e.target.value }))}
                                placeholder="OAuth client ID"
                              />
                            </div>
                            <div>
                              <Label>Client Secret</Label>
                              <Input
                                type="password"
                                value={createForm.client_secret}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, client_secret: e.target.value }))}
                                placeholder="OAuth client secret"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {createForm.source_type === 'custom' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Custom Integration</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label>Configuration (JSON)</Label>
                              <Textarea
                                value={createForm.custom_config}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, custom_config: e.target.value }))}
                                placeholder='{"host": "localhost", "port": 5432, "database": "mydb"}'
                                rows={4}
                                className="font-mono text-sm"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Connection Capabilities Info */}
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Live Query Ready:</strong> Once configured, this connection will enable 
                        real-time querying through the "Live Query" tab. No data syncing required - 
                        query your source directly whenever you need fresh data.
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={createDataSource}
                        disabled={!createForm.source_name || !createForm.source_type}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Connection
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Database Credentials</h2>
              <p className="text-muted-foreground">
                Add database credentials to enable real-time connections. Start with Supabase for immediate testing.
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Quick Setup: Add Supabase Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Get started in 2 minutes:</strong> Add your Supabase credentials to test real-time database connections.
                  </AlertDescription>
                </Alert>
                
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Supabase Database Connection
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Connected Databases & API Keys
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All credentials are encrypted and stored securely. Only truncated versions are displayed.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  {dataSources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Database className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{source.source_name}</p>
                          <p className="text-sm text-muted-foreground">{source.source_type}</p>
                          {source.connection_config && typeof source.connection_config === 'object' && 
                           source.connection_config !== null && 
                           'url' in source.connection_config && 
                           typeof (source.connection_config as any).url === 'string' && (
                            <p className="text-xs text-muted-foreground">{(source.connection_config as any).url}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {source.credentials_encrypted && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {source.credentials_encrypted.slice(0, 20)}...
                          </code>
                        )}
                        <Button size="sm" variant="outline">
                          <Zap className="h-4 w-4 mr-2" />
                          Test Connection
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {dataSources.length === 0 && (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No database connections configured yet.</p>
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Database
                      </Button>
                    </div>
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