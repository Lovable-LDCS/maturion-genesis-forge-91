import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DomainManagement } from '@/components/assessment/DomainManagement';
import { MPSManagement } from '@/components/assessment/MPSManagement';
import { CriteriaManagement } from '@/components/assessment/CriteriaManagement';
import { BulkImportExport } from '@/components/assessment/BulkImportExport';
import { ISOComplianceValidation } from '@/components/assessment/ISOComplianceValidation';
import { Settings, Database, CheckSquare, Upload, Shield } from 'lucide-react';

export default function AssessmentFramework() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Assessment Framework</h1>
        <p className="text-lg text-muted-foreground">
          Configure and manage your organizational assessment framework
        </p>
      </div>

      <Tabs defaultValue="domains" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="mps" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            MPS
          </TabsTrigger>
          <TabsTrigger value="criteria" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Criteria
          </TabsTrigger>
          <TabsTrigger value="import-export" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import/Export
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            ISO Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Management</CardTitle>
              <CardDescription>
                Create and manage assessment domains with AI-assisted intent statements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DomainManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maturity Practice Statements (MPS)</CardTitle>
              <CardDescription>
                Configure MPS with auto-numbering and AI-generated summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MPSManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Criteria Configuration</CardTitle>
              <CardDescription>
                Define assessment criteria with maturity levels and AI-generated descriptors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CriteriaManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import & Export</CardTitle>
              <CardDescription>
                Import and export assessment frameworks using CSV/XLSX files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkImportExport />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ISO Compliance Validation</CardTitle>
              <CardDescription>
                Verify framework alignment with ISO 31000, NIST, and ISO 27001 standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ISOComplianceValidation />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}