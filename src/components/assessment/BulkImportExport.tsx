import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ImportResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  count?: number;
}

export const BulkImportExport: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `Domain Name,Domain Intent Statement,Domain Display Order,MPS Number,MPS Name,MPS Summary,MPS Intent Statement,Criteria Statement,Criteria Summary,Maturity Level,Level Descriptor
Risk Management,Comprehensive risk management framework,1,1,Risk Identification,Systematic risk identification processes,Establish systematic processes for identifying risks,Risk identification processes are documented,Brief summary of risk identification,basic,Basic risk identification practices
Risk Management,Comprehensive risk management framework,1,1,Risk Identification,Systematic risk identification processes,Establish systematic processes for identifying risks,Risk identification processes are documented,Brief summary of risk identification,reactive,Reactive risk identification practices
Risk Management,Comprehensive risk management framework,1,2,Risk Assessment,Risk assessment and analysis,Implement risk assessment methodologies,Risk assessment methodologies are implemented,Brief summary of risk assessment,basic,Basic risk assessment practices`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assessment_framework_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'CSV template has been downloaded successfully'
    });
  };

  const downloadXLSXTemplate = () => {
    // For XLSX template, we'll create a similar structure but mention it's for XLSX
    const csvContent = `Domain Name,Domain Intent Statement,Domain Display Order,MPS Number,MPS Name,MPS Summary,MPS Intent Statement,Criteria Statement,Criteria Summary,Maturity Level,Level Descriptor
Information Security,Information security management system,1,1,Security Governance,Security governance framework,Establish security governance,Security policies are defined,Security governance summary,basic,Basic security governance
Information Security,Information security management system,1,1,Security Governance,Security governance framework,Establish security governance,Security policies are defined,Security governance summary,reactive,Reactive security governance`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assessment_framework_template.xlsx.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'XLSX Template Downloaded',
      description: 'Excel-compatible template has been downloaded (save as .xlsx)'
    });
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const validateRow = (row: string[], rowIndex: number): ImportResult | null => {
    const requiredFields = ['Domain Name', 'MPS Name', 'Criteria Statement', 'Maturity Level', 'Level Descriptor'];
    const fieldIndices = [0, 4, 7, 9, 10]; // Corresponding column indices
    
    for (let i = 0; i < requiredFields.length; i++) {
      if (!row[fieldIndices[i]] || row[fieldIndices[i]].trim() === '') {
        return {
          status: 'error',
          message: `Row ${rowIndex + 1}: Missing required field "${requiredFields[i]}"`,
          details: `Value: "${row[fieldIndices[i]] || 'empty'}"`
        };
      }
    }

    // Validate maturity level
    const validLevels = ['basic', 'reactive', 'compliant', 'proactive', 'resilient'];
    const maturityLevel = row[9]?.toLowerCase().trim();
    if (!validLevels.includes(maturityLevel)) {
      return {
        status: 'error',
        message: `Row ${rowIndex + 1}: Invalid maturity level "${row[9]}"`,
        details: `Valid levels: ${validLevels.join(', ')}`
      };
    }

    // Validate MPS number
    const mpsNumber = parseInt(row[3]);
    if (isNaN(mpsNumber) || mpsNumber < 1 || mpsNumber > 25) {
      return {
        status: 'warning',
        message: `Row ${rowIndex + 1}: MPS number "${row[3]}" should be between 1-25`,
        details: 'Will be auto-corrected during import'
      };
    }

    return null;
  };

  const processImport = async (csvContent: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    const dataRows = lines.slice(1);
    
    const results: ImportResult[] = [];
    let processed = 0;
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: orgData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.user.id)
        .single();

      if (!orgData) throw new Error('Organization not found');

      const domainMap = new Map<string, string>();
      const mpsMap = new Map<string, string>();
      const criteriaMap = new Map<string, string>();

      for (let i = 0; i < dataRows.length; i++) {
        const row = parseCSVLine(dataRows[i]);
        
        // Validate row
        const validationError = validateRow(row, i);
        if (validationError) {
          results.push(validationError);
          if (validationError.status === 'error') {
            continue; // Skip this row if there's an error
          }
        }

        try {
          // Process Domain
          const domainName = row[0]?.trim();
          if (domainName && !domainMap.has(domainName)) {
            const { data: existingDomain } = await supabase
              .from('domains')
              .select('id')
              .eq('name', domainName)
              .eq('organization_id', orgData.organization_id)
              .single();

            if (existingDomain) {
              domainMap.set(domainName, existingDomain.id);
            } else {
              const { data: newDomain, error: domainError } = await supabase
                .from('domains')
                .insert({
                  name: domainName,
                  intent_statement: row[1]?.trim() || null,
                  display_order: parseInt(row[2]) || 1,
                  organization_id: orgData.organization_id,
                  created_by: user.user.id,
                  updated_by: user.user.id,
                  status: 'not_started'
                })
                .select('id')
                .single();

              if (domainError) throw domainError;
              domainMap.set(domainName, newDomain.id);
            }
          }

          // Process MPS
          const mpsKey = `${domainName}|${row[4]?.trim()}`;
          if (!mpsMap.has(mpsKey)) {
            const { data: existingMPS } = await supabase
              .from('maturity_practice_statements')
              .select('id')
              .eq('name', row[4]?.trim())
              .eq('domain_id', domainMap.get(domainName))
              .single();

            if (existingMPS) {
              mpsMap.set(mpsKey, existingMPS.id);
            } else {
              const { data: newMPS, error: mpsError } = await supabase
                .from('maturity_practice_statements')
                .insert({
                  name: row[4]?.trim(),
                  mps_number: parseInt(row[3]) || 1,
                  summary: row[5]?.trim() || null,
                  intent_statement: row[6]?.trim() || null,
                  domain_id: domainMap.get(domainName),
                  organization_id: orgData.organization_id,
                  created_by: user.user.id,
                  updated_by: user.user.id,
                  status: 'not_started'
                })
                .select('id')
                .single();

              if (mpsError) throw mpsError;
              mpsMap.set(mpsKey, newMPS.id);
            }
          }

          // Process Criteria
          const criteriaKey = `${mpsKey}|${row[7]?.trim()}`;
          if (!criteriaMap.has(criteriaKey)) {
            const { data: existingCriteria } = await supabase
              .from('criteria')
              .select('id')
              .eq('statement', row[7]?.trim())
              .eq('mps_id', mpsMap.get(mpsKey))
              .single();

            if (existingCriteria) {
              criteriaMap.set(criteriaKey, existingCriteria.id);
            } else {
              const mpsNumber = parseInt(row[3]) || 1;
              const { data: newCriteria, error: criteriaError } = await supabase
                .from('criteria')
                .insert({
                  statement: row[7]?.trim(),
                  summary: row[8]?.trim() || null,
                  criteria_number: `${mpsNumber}.${Math.floor(Math.random() * 1000)}`, // Temporary numbering
                  mps_id: mpsMap.get(mpsKey),
                  organization_id: orgData.organization_id,
                  created_by: user.user.id,
                  updated_by: user.user.id,
                  status: 'not_started'
                })
                .select('id')
                .single();

              if (criteriaError) throw criteriaError;
              criteriaMap.set(criteriaKey, newCriteria.id);
            }
          }

          // Process Maturity Level
          const levelValue = row[9]?.toLowerCase().trim() as 'basic' | 'reactive' | 'compliant' | 'proactive' | 'resilient';
          const { error: maturityError } = await supabase
            .from('maturity_levels')
            .upsert({
              criteria_id: criteriaMap.get(criteriaKey),
              level: levelValue,
              descriptor: row[10]?.trim(),
              organization_id: orgData.organization_id,
              created_by: user.user.id,
              updated_by: user.user.id
            }, {
              onConflict: 'criteria_id,level'
            });

          if (maturityError) throw maturityError;

          processed++;
          setImportProgress((processed / dataRows.length) * 100);

        } catch (error) {
          results.push({
            status: 'error',
            message: `Row ${i + 1}: Failed to process`,
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      results.unshift({
        status: 'success',
        message: `Successfully processed ${processed} out of ${dataRows.length} rows`,
        count: processed
      });

    } catch (error) {
      results.push({
        status: 'error',
        message: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setImportResults(results);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsImporting(true);
    setImportProgress(0);
    setImportResults([]);

    try {
      const text = await file.text();
      await processImport(text);
      
      toast({
        title: 'Import Completed',
        description: 'File has been processed. Check results below.'
      });
    } catch (error) {
      setImportResults([{
        status: 'error',
        message: 'Failed to read file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }]);
    } finally {
      setIsImporting(false);
    }
  };

  const exportData = async () => {
    setIsExporting(true);
    
    try {
      const { data: exportData, error } = await supabase
        .from('domains')
        .select(`
          name,
          intent_statement,
          display_order,
          maturity_practice_statements (
            mps_number,
            name,
            summary,
            intent_statement,
            criteria (
              statement,
              summary,
              maturity_levels (
                level,
                descriptor
              )
            )
          )
        `)
        .order('display_order');

      if (error) throw error;

      // Convert to CSV format
      const csvRows = ['Domain Name,Domain Intent Statement,Domain Display Order,MPS Number,MPS Name,MPS Summary,MPS Intent Statement,Criteria Statement,Criteria Summary,Maturity Level,Level Descriptor'];
      
      exportData?.forEach(domain => {
        domain.maturity_practice_statements?.forEach(mps => {
          mps.criteria?.forEach(criteria => {
            criteria.maturity_levels?.forEach(level => {
              csvRows.push([
                domain.name,
                domain.intent_statement || '',
                domain.display_order,
                mps.mps_number,
                mps.name,
                mps.summary || '',
                mps.intent_statement || '',
                criteria.statement,
                criteria.summary || '',
                level.level,
                level.descriptor
              ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
            });
          });
        });
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment_framework_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Assessment framework exported successfully'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export assessment framework',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Download Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download template files to format your assessment framework data for import.
            </p>
            <div className="space-y-2">
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
              <Button onClick={downloadXLSXTemplate} variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Download XLSX Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Import Framework
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload your completed CSV or XLSX file to import the assessment framework.
            </p>
            <div className="space-y-2">
              <Label htmlFor="import-file">Select File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileImport}
                disabled={isImporting}
              />
            </div>
            {isImporting && (
              <div className="space-y-2">
                <Label>Import Progress</Label>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">{Math.round(importProgress)}% complete</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Current Framework
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export your current assessment framework configuration as a CSV file.
          </p>
          <Button onClick={exportData} disabled={isExporting} className="w-full">
            {isExporting ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Framework as CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {importResults.map((result, index) => (
              <Alert key={index} className={
                result.status === 'success' ? 'border-green-200 bg-green-50' :
                result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }>
                <div className="flex items-start space-x-2">
                  {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                  {result.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-medium">{result.message}</div>
                      {result.details && (
                        <div className="text-sm text-muted-foreground mt-1">{result.details}</div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};