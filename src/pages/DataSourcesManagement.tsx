import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Upload, BarChart3, Settings } from 'lucide-react';
import DataSourceManagement from '@/components/admin/DataSourceManagement';
import EvidenceSubmissionInterface from '@/components/admin/EvidenceSubmissionInterface';

const DataSourcesManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4">
            Data Sources & API Management
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto">
            Connect and manage external data sources, submit evidence, and monitor API integrations. 
            This operational interface allows you to configure connections to Google Drive, SharePoint, 
            APIs, and other data sources for comprehensive evidence collection.
          </p>
        </div>
        
        <Tabs defaultValue="sources" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Sources
            </TabsTrigger>
            <TabsTrigger value="evidence" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Evidence
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="mt-6">
            <DataSourceManagement />
          </TabsContent>

          <TabsContent value="evidence" className="mt-6">
            <EvidenceSubmissionInterface />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="text-2xl font-bold text-blue-600">24</h3>
                    <p className="text-sm text-muted-foreground">API Calls Today</p>
                  </div>
                  <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h3 className="text-2xl font-bold text-green-600">156</h3>
                    <p className="text-sm text-muted-foreground">Evidence Submissions</p>
                  </div>
                  <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h3 className="text-2xl font-bold text-purple-600">98.5%</h3>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-4">Recent API Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span>Google Drive sync completed</span>
                      <span className="text-green-600">Success</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span>Evidence submission processed</span>
                      <span className="text-green-600">Success</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span>SharePoint connection established</span>
                      <span className="text-blue-600">Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>API & Integration Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Security Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Encryption at Rest</span>
                        <span className="text-green-600 font-medium">Enabled</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>API Rate Limiting</span>
                        <span className="text-green-600 font-medium">Active</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Audit Logging</span>
                        <span className="text-green-600 font-medium">Comprehensive</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Integration Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Maturion AI Chat</span>
                        <span className="text-green-600 font-medium">Connected</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Evidence Processing</span>
                        <span className="text-green-600 font-medium">Operational</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded">
                        <span>Learning Feedback Loop</span>
                        <span className="text-blue-600 font-medium">Active</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">System Health</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600">100%</div>
                        <div className="text-sm text-muted-foreground">API Uptime</div>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">145ms</div>
                        <div className="text-sm text-muted-foreground">Avg Response Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DataSourcesManagement;