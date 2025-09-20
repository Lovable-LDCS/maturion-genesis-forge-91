import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, RefreshCw, Eye, EyeOff, Database, Cloud, HardDrive, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

interface DataSource {
  id: string;
  source_name: string;
  source_type: string;
  is_active: boolean;
  sync_status: string;
  last_sync_at: string | null;
  connection_config: any;
  created_at: string;
  updated_at: string;
  sync_error_message?: string;
}

const SOURCE_TYPE_OPTIONS = [
  { value: 'supabase', label: 'Supabase', icon: Database },
  { value: 'google_drive', label: 'Google Drive', icon: Cloud },
  { value: 'sharepoint', label: 'SharePoint', icon: HardDrive },
  { value: 'onedrive', label: 'OneDrive', icon: Cloud },
  { value: 'dropbox', label: 'Dropbox', icon: Cloud },
  { value: 'api_endpoint', label: 'API Endpoint', icon: Globe },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'file_system', label: 'File System', icon: HardDrive },
  { value: 'other', label: 'Other', icon: Globe }
];

export const DataSourceManagement: React.FC = () => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    source_name: '',
    source_type: '',
    connection_config: '{}',
    credentials: '',
    description: ''
  });

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDataSources();
    }
  }, [currentOrganization?.id]);

  const fetchDataSources = async () => {
    if (!currentOrganization?.id) return;
    
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
      console.error('Error fetching data sources:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data sources",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSource = async () => {
    if (!currentOrganization?.id) return;

    try {
      let connectionConfig;
      try {
        connectionConfig = JSON.parse(formData.connection_config);
      } catch {
        connectionConfig = { description: formData.description };
      }

      const { data, error } = await supabase.functions.invoke('test-data-sources-api', {
        method: 'POST',
        body: {
          organization_id: currentOrganization.id,
          source_name: formData.source_name,
          source_type: formData.source_type,
          connection_config: connectionConfig,
          credentials_encrypted: formData.credentials || null,
          created_by: currentOrganization.owner_id,
          updated_by: currentOrganization.owner_id
        }
      });

      if (error || !data.success) {
        throw new Error(error?.message || data?.error || 'Failed to create data source');
      }

      toast({
        title: "Success",
        description: "Data source created successfully",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchDataSources();
    } catch (error) {
      console.error('Error creating data source:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create data source',
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (source: DataSource) => {
    try {
      const { error } = await supabase
        .from('data_sources')
        .update({ is_active: !source.is_active })
        .eq('id', source.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Data source ${!source.is_active ? 'activated' : 'deactivated'}`,
      });

      fetchDataSources();
    } catch (error) {
      console.error('Error toggling data source:', error);
      toast({
        title: "Error",
        description: "Failed to update data source",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (source: DataSource) => {
    try {
      // Update sync status to 'syncing'
      const { error } = await supabase
        .from('data_sources')
        .update({ 
          sync_status: 'syncing',
          last_sync_at: new Date().toISOString() 
        })
        .eq('id', source.id);

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: `Syncing data from ${source.source_name}`,
      });

      // Simulate sync completion (in real implementation, this would be handled by background job)
      setTimeout(async () => {
        await supabase
          .from('data_sources')
          .update({ sync_status: 'success' })
          .eq('id', source.id);
        
        fetchDataSources();
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${source.source_name}`,
        });
      }, 3000);

      fetchDataSources();
    } catch (error) {
      console.error('Error syncing data source:', error);
      toast({
        title: "Error",
        description: "Failed to start sync",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      source_name: '',
      source_type: '',
      connection_config: '{}',
      credentials: '',
      description: ''
    });
    setEditingSource(null);
  };

  const getSourceIcon = (type: string) => {
    const sourceType = SOURCE_TYPE_OPTIONS.find(opt => opt.value === type);
    const Icon = sourceType?.icon || Globe;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      never_synced: 'bg-gray-100 text-gray-800',
      syncing: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.never_synced}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading data sources...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Data Source Connections
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                        value={formData.source_name}
                        onChange={(e) => setFormData({...formData, source_name: e.target.value})}
                        placeholder="My Google Drive"
                      />
                    </div>
                    <div>
                      <Label htmlFor="source_type">Source Type</Label>
                      <Select value={formData.source_type} onValueChange={(value) => 
                        setFormData({...formData, source_type: value})
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                <option.icon className="h-4 w-4 mr-2" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Description of this data source"
                    />
                  </div>

                  <div>
                    <Label htmlFor="connection_config">Connection Configuration (JSON)</Label>
                    <Textarea
                      id="connection_config"
                      value={formData.connection_config}
                      onChange={(e) => setFormData({...formData, connection_config: e.target.value})}
                      placeholder='{"client_id": "your_client_id", "scope": "drive.readonly"}'
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="credentials">Credentials (Encrypted)</Label>
                    <Input
                      id="credentials"
                      type="password"
                      value={formData.credentials}
                      onChange={(e) => setFormData({...formData, credentials: e.target.value})}
                      placeholder="API keys, tokens, etc."
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSource} disabled={!formData.source_name || !formData.source_type}>
                      Create Data Source
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dataSources.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No data sources configured</p>
              <p className="text-sm text-gray-400">Add your first data source to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name & Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getSourceIcon(source.source_type)}
                        <div>
                          <div className="font-medium">{source.source_name}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {source.source_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(source.sync_status)}
                    </TableCell>
                    <TableCell>
                      {source.last_sync_at ? (
                        <div className="text-sm">
                          {new Date(source.last_sync_at).toLocaleDateString()}
                          <div className="text-xs text-gray-500">
                            {new Date(source.last_sync_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.is_active ? "default" : "secondary"}>
                        {source.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(source)}
                          disabled={!source.is_active || source.sync_status === 'syncing'}
                        >
                          <RefreshCw className={`h-3 w-3 ${source.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(source)}
                        >
                          {source.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSource(source)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataSourceManagement;