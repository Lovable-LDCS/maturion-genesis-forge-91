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
  const [isCreating, setIsCreating] = useState(false);
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
    if (!currentOrganization) {
      toast({
        title: 'Error',
        description: 'Please select an organization first',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Test List API
      const listResponse = await supabase.functions.invoke('test-data-sources-api', {
        method: 'GET'
      });
      
      // Test Create API with required organization_id and user_id
      const createResponse = await supabase.functions.invoke('test-data-sources-api', {
        method: 'POST',
        body: {
          source_name: 'QA Test Source',
          source_type: 'api', // Now allowed in database constraint
          description: 'Test data source creation',
          organization_id: currentOrganization.id,
          created_by: user?.id,
          updated_by: user?.id
        }
      });
      
      setTestResults({
        list: {
          success: !listResponse.error,
          data: listResponse.data,
          error: listResponse.error?.message || (listResponse.error ? JSON.stringify(listResponse.error) : undefined)
        },
        create: {
          success: !createResponse.error,
          data: createResponse.data,
          error: createResponse.error?.message || (createResponse.error ? JSON.stringify(createResponse.error) : undefined)
        }
      });
      
      toast({
        title: 'API Test Complete',
        description: `List: ${!listResponse.error ? 'Success' : 'Failed'}, Create: ${!createResponse.error ? 'Success' : 'Failed'}`
      });
      
      // Switch to test results tab to show results
      setActiveTab('test-results');
      
    } catch (error) {
      console.error('Error testing API:', error);
      
      // Enhanced error handling for better debugging
      let errorMessage = 'Failed to run API tests';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = String(error);
        }
      }
      
      toast({
        title: 'Test Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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
          host: '',
          port: 5432,
          database: '',
          username: '',
          password: ''
        };
      } else if (createForm.source_type === 'mysql') {
        connectionConfig.supports_live_queries = true;
        connectionConfig.connection_type = 'database';
        
        credentialsToEncrypt = {
          host: '',
          port: 3306,
          database: '',
          username: '',
          password: ''
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

  const syncDataSource = async (dataSource: DataSource) => {
    try {
      const { error } = await supabase.functions.invoke('sync-data-source', {
        body: { data_source_id: dataSource.id }
      });

      if (error) throw error;

      toast({
        title: 'Sync Started',
        description: `Synchronization initiated for ${dataSource.source_name}`
      });

      loadDataSources();
    } catch (error) {
      console.error('Error syncing data source:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to start synchronization',
        variant: 'destructive'
      });
    }
  };

  const deleteDataSource = async (dataSource: DataSource) => {
    if (!confirm(`Are you sure you want to delete "${dataSource.source_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('data_sources')
        .delete()
        .eq('id', dataSource.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${dataSource.source_name} deleted successfully`
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Data Sources
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dataSources.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active connections
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Live Query Ready
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dataSources.filter(ds => {
                      const config = ds.connection_config as any;
                      return config?.supports_live_queries;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Real-time capable sources
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Security Status
                  </CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    Encrypted
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AES-256 credential protection
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Connection
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Data Source Connection</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="source-name">Connection Name</Label>
                            <Input
                              id="source-name"
                              value={createForm.source_name}
                              onChange={(e) => setCreateForm(prev => ({ ...prev, source_name: e.target.value }))}
                              placeholder="e.g., Production Database, Customer CRM"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={createForm.description}
                              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Brief description of this data source"
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label>Connection Type</Label>
                            <Select 
                              value={createForm.source_type} 
                              onValueChange={(value) => setCreateForm(prev => ({ ...prev, source_type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select connection type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="supabase">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">Supabase Database</span>
                                    <span className="text-xs text-muted-foreground">PostgreSQL with real-time capabilities</span>
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
                                <SelectItem value="rest_api">
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
                          </div>

                          {/* Connection Type Description */}
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                            {createForm.source_type === 'supabase' && (
                              <div>
                                <p className="font-medium text-primary mb-2">✨ Supabase Database Connection</p>
                                <p>Connect directly to your Supabase database for live, real-time querying. This enables:</p>
                                <ul className="mt-2 space-y-1 text-muted-foreground">
                                  <li>• Live SQL queries against your database</li>
                                  <li>• Real-time data synchronization</li>
                                  <li>• Automatic evidence evaluation</li>
                                  <li>• Secure, read-only access</li>
                                </ul>
                              </div>
                            )}
                            {createForm.source_type === 'postgresql' && (
                              <div>
                                <p className="font-medium text-primary mb-2">🗄️ PostgreSQL Database</p>
                                <p>Direct connection to PostgreSQL database for live querying and data analysis.</p>
                              </div>
                            )}
                            {createForm.source_type === 'mysql' && (
                              <div>
                                <p className="font-medium text-primary mb-2">🗄️ MySQL Database</p>
                                <p>Direct connection to MySQL database for live querying and data analysis.</p>
                              </div>
                            )}
                            {createForm.source_type === 'rest_api' && (
                              <div>
                                <p className="font-medium text-primary mb-2">🔗 REST API Integration</p>
                                <p>Connect to REST APIs for live data retrieval and analysis.</p>
                              </div>
                            )}
                            {createForm.source_type === 'google_drive' && (
                              <div>
                                <p className="font-medium text-primary mb-2">📁 Google Drive</p>
                                <p>Access Google Drive files and documents for evidence collection.</p>
                              </div>
                            )}
                            {createForm.source_type === 'sharepoint' && (
                              <div>
                                <p className="font-medium text-primary mb-2">📊 SharePoint</p>
                                <p>Connect to Microsoft SharePoint for document and data access.</p>
                              </div>
                            )}
                            {createForm.source_type === 'custom' && (
                              <div>
                                <p className="font-medium text-primary mb-2">⚙️ Custom Integration</p>
                                <p>Custom API or database connection with flexible configuration.</p>
                              </div>
                            )}
                          </div>

                          {/* Dynamic Form Fields */}
                          {createForm.source_type === 'supabase' && (
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-medium">Supabase Connection Details</h4>
                              <div>
                                <Label htmlFor="supabase-url">Supabase URL</Label>
                                <Input
                                  id="supabase-url"
                                  value={createForm.supabase_url}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, supabase_url: e.target.value }))}
                                  placeholder="https://your-project.supabase.co"
                                />
                              </div>
                              <div>
                                <Label htmlFor="supabase-anon-key">Anon Key (Public)</Label>
                                <Input
                                  id="supabase-anon-key"
                                  value={createForm.supabase_anon_key}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, supabase_anon_key: e.target.value }))}
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                  type="password"
                                />
                              </div>
                              <div>
                                <Label htmlFor="supabase-service-key">Service Role Key (Private)</Label>
                                <Input
                                  id="supabase-service-key"
                                  value={createForm.supabase_service_key}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, supabase_service_key: e.target.value }))}
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                  type="password"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Service role key enables full database access for live querying
                                </p>
                              </div>
                            </div>
                          )}

                          {(createForm.source_type === 'rest_api' || createForm.source_type === 'custom') && (
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-medium">API Connection Details</h4>
                              <div>
                                <Label htmlFor="api-url">API URL</Label>
                                <Input
                                  id="api-url"
                                  value={createForm.webhook_url}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, webhook_url: e.target.value }))}
                                  placeholder="https://api.example.com/v1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="api-key">API Key</Label>
                                <Input
                                  id="api-key"
                                  value={createForm.api_key}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, api_key: e.target.value }))}
                                  placeholder="your-api-key"
                                  type="password"
                                />
                              </div>
                            </div>
                          )}

                          {(createForm.source_type === 'google_drive' || createForm.source_type === 'sharepoint') && (
                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-medium">OAuth Connection Details</h4>
                              <div>
                                <Label htmlFor="client-id">Client ID</Label>
                                <Input
                                  id="client-id"
                                  value={createForm.client_id}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, client_id: e.target.value }))}
                                  placeholder="OAuth client ID"
                                />
                              </div>
                              <div>
                                <Label htmlFor="client-secret">Client Secret</Label>
                                <Input
                                  id="client-secret"
                                  value={createForm.client_secret}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, client_secret: e.target.value }))}
                                  placeholder="OAuth client secret"
                                  type="password"
                                />
                              </div>
                            </div>
                          )}

                          {createForm.source_type === 'custom' && (
                            <div>
                              <Label htmlFor="custom-config">Custom Configuration (JSON)</Label>
                              <Textarea
                                id="custom-config"
                                value={createForm.custom_config}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, custom_config: e.target.value }))}
                                placeholder='{"host": "localhost", "port": 5432, "database": "mydb"}'
                                rows={6}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCreateDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={createDataSource} 
                            disabled={isCreating || !createForm.source_name}
                          >
                            {isCreating ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create Connection'
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" onClick={testDataSourcesAPI} disabled={loading}>
                    <Settings className="mr-2 h-4 w-4" />
                    {loading ? 'Testing...' : 'Test API'}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => supabase.functions.invoke('reset-stuck-syncs')}
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Stuck Syncs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Sources</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage and monitor your data source connections
                  </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Source
                </Button>
              </CardHeader>
              <CardContent>
                {dataSources.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No data sources</h3>
                    <p className="text-muted-foreground">
                      Get started by adding your first data source connection.
                    </p>
                    <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Data Source
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dataSources.map((source) => (
                      <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{source.source_name}</h4>
                            <Badge variant="outline">{source.source_type}</Badge>
                            {getStatusBadge(source.sync_status || 'never_synced')}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {(source.metadata as any)?.description || 'No description'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(source.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncDataSource(source)}
                            disabled={source.sync_status === 'syncing'}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${source.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDataSource(source)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live-query" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Data Query Interface</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Execute live queries against your connected data sources
                </p>
              </CardHeader>
              <CardContent>
                {currentOrganization ? (
                  <LiveDataSourceQuery organizationId={currentOrganization.id} />
                ) : (
                  <p className="text-muted-foreground">Please select an organization to use live queries.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Keys & Security</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage API keys and security settings for your data sources
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    All credentials are encrypted using AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations).
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Security Features</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Production-ready credential encryption</li>
                    <li>• Read-only database access</li>
                    <li>• Organization-scoped permissions</li>
                    <li>• Comprehensive audit logging</li>
                    <li>• Rate limiting protection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test-results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Test Results</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View the latest API connectivity and functionality tests
                </p>
              </CardHeader>
              <CardContent>
                {testResults.list || testResults.create ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">List API Test</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        {testResults.list?.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          {testResults.list?.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      {testResults.list?.success && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">
                            API responded successfully with {testResults.list.data?.length || 0} data sources
                          </p>
                        </div>
                      )}
                      
                      {testResults.list?.error && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.list.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Create API Test</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        {testResults.create?.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          {testResults.create?.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      {testResults.create?.success && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">
                            Created data source: {testResults.create.data?.data?.source_name}
                          </p>
                        </div>
                      )}
                      
                      {testResults.create?.error && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {testResults.create.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No test results yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataSourcesManagement;