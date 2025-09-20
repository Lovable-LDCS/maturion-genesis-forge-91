import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import APITestRunner from '@/components/qa/APITestRunner';

const QATestDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4">
            Maturion API QA Dashboard
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Comprehensive post-implementation quality assurance testing for the multi-data source API.
            This dashboard validates database schema, API endpoints, security policies, and data integrity.
          </p>
        </div>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>QA Checklist Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Database & Schema</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Table creation and structure</li>
                    <li>• Foreign key relationships</li>
                    <li>• RLS policies and security</li>
                    <li>• Constraints and defaults</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">API Functionality</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Data sources CRUD operations</li>
                    <li>• Evidence submissions</li>
                    <li>• Usage logging</li>
                    <li>• Learning feedback</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Security & Permissions</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Unauthorized access blocking</li>
                    <li>• RLS policy enforcement</li>
                    <li>• Superuser bypass functionality</li>
                    <li>• Data exposure protection</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Data Integrity</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Referential integrity</li>
                    <li>• Timestamp automation</li>
                    <li>• Constraint validation</li>
                    <li>• Cascade operations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <APITestRunner />
        </div>
      </div>
    </div>
  );
};

export default QATestDashboard;