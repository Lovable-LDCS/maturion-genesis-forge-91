import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, XCircle, FileText, Download } from 'lucide-react';

interface ComplianceStandard {
  id: string;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
}

interface ComplianceRequirement {
  id: string;
  clause: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-assessed';
  coverage: number;
  gaps: string[];
  recommendations: string[];
}

interface ComplianceReport {
  standard: string;
  overallScore: number;
  compliantRequirements: number;
  totalRequirements: number;
  criticalGaps: number;
  recommendations: string[];
  heatmapData: { category: string; score: number; requirements: number }[];
}

const ISO_STANDARDS: ComplianceStandard[] = [
  {
    id: 'iso31000',
    name: 'ISO 31000:2018',
    description: 'Risk Management - Guidelines',
    requirements: [
      {
        id: 'iso31000-5.2',
        clause: '5.2',
        title: 'Leadership and commitment',
        description: 'Top management shall demonstrate leadership and commitment to risk management',
        category: 'Leadership',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      },
      {
        id: 'iso31000-5.3',
        clause: '5.3',
        title: 'Risk management policy',
        description: 'Organization shall establish a risk management policy',
        category: 'Policy',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      },
      {
        id: 'iso31000-6.2',
        clause: '6.2',
        title: 'Risk management framework design',
        description: 'Design of risk management framework',
        category: 'Framework',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      }
    ]
  },
  {
    id: 'iso27001',
    name: 'ISO 27001:2022',
    description: 'Information Security Management Systems',
    requirements: [
      {
        id: 'iso27001-5.1',
        clause: '5.1',
        title: 'Leadership and commitment',
        description: 'Top management shall demonstrate leadership and commitment to the ISMS',
        category: 'Leadership',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      },
      {
        id: 'iso27001-6.1',
        clause: '6.1',
        title: 'Actions to address risks and opportunities',
        description: 'Determine risks and opportunities that need to be addressed',
        category: 'Risk Management',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      },
      {
        id: 'iso27001-8.1',
        clause: '8.1',
        title: 'Operational planning and control',
        description: 'Plan, implement and control processes needed to meet ISMS requirements',
        category: 'Operations',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      }
    ]
  },
  {
    id: 'nist',
    name: 'NIST Cybersecurity Framework',
    description: 'Framework for Improving Critical Infrastructure Cybersecurity',
    requirements: [
      {
        id: 'nist-id',
        clause: 'ID',
        title: 'Identify',
        description: 'Develop organizational understanding to manage cybersecurity risk',
        category: 'Identify',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      },
      {
        id: 'nist-pr',
        clause: 'PR',
        title: 'Protect',
        description: 'Develop and implement appropriate safeguards',
        category: 'Protect',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      },
      {
        id: 'nist-de',
        clause: 'DE',
        title: 'Detect',
        description: 'Develop and implement activities to identify cybersecurity events',
        category: 'Detect',
        mandatory: true,
        status: 'not-assessed',
        coverage: 0,
        gaps: [],
        recommendations: []
      }
    ]
  }
];

export const ISOComplianceValidation: React.FC = () => {
  const [selectedStandard, setSelectedStandard] = useState<string>('iso31000');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [frameworkData, setFrameworkData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFrameworkData();
  }, []);

  const fetchFrameworkData = async () => {
    try {
      const { data, error } = await supabase
        .from('domains')
        .select(`
          *,
          maturity_practice_statements (
            *,
            criteria (
              *,
              maturity_levels (*)
            )
          )
        `);

      if (error) throw error;
      setFrameworkData(data);
    } catch (error) {
      console.error('Error fetching framework data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch framework data',
        variant: 'destructive'
      });
    }
  };

  const analyzeCompliance = async (standardId: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const standard = ISO_STANDARDS.find(s => s.id === standardId);
      if (!standard || !frameworkData) {
        throw new Error('Standard or framework data not found');
      }

      // Simulate analysis progress
      for (let i = 0; i <= 100; i += 10) {
        setAnalysisProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze framework against standard requirements
      const analyzedRequirements = standard.requirements.map(req => {
        const coverage = analyzeRequirementCoverage(req, frameworkData);
        const gaps = identifyGaps(req, frameworkData);
        const recommendations = generateRecommendations(req, gaps);
        
        let status: ComplianceRequirement['status'] = 'non-compliant';
        if (coverage >= 90) status = 'compliant';
        else if (coverage >= 50) status = 'partial';
        
        return {
          ...req,
          status,
          coverage,
          gaps,
          recommendations
        };
      });

      // Generate compliance report
      const compliantRequirements = analyzedRequirements.filter(r => r.status === 'compliant').length;
      const overallScore = (compliantRequirements / analyzedRequirements.length) * 100;
      const criticalGaps = analyzedRequirements.filter(r => r.mandatory && r.status === 'non-compliant').length;

      // Generate heatmap data by category
      const categories = [...new Set(analyzedRequirements.map(r => r.category))];
      const heatmapData = categories.map(category => {
        const categoryReqs = analyzedRequirements.filter(r => r.category === category);
        const avgScore = categoryReqs.reduce((sum, req) => sum + req.coverage, 0) / categoryReqs.length;
        return {
          category,
          score: avgScore,
          requirements: categoryReqs.length
        };
      });

      const report: ComplianceReport = {
        standard: standard.name,
        overallScore,
        compliantRequirements,
        totalRequirements: analyzedRequirements.length,
        criticalGaps,
        recommendations: generateOverallRecommendations(analyzedRequirements),
        heatmapData
      };

      setComplianceReport(report);
      
      toast({
        title: 'Analysis Complete',
        description: `Compliance analysis for ${standard.name} completed`
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to complete compliance analysis',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeRequirementCoverage = (requirement: ComplianceRequirement, frameworkData: any[]): number => {
    // Mock analysis - in real implementation, this would use NLP/AI to match framework content to requirements
    const relevantDomains = frameworkData.filter(domain => 
      domain.name.toLowerCase().includes(requirement.category.toLowerCase()) ||
      domain.intent_statement?.toLowerCase().includes(requirement.title.toLowerCase())
    );
    
    if (relevantDomains.length === 0) return 0;
    
    let totalCriteria = 0;
    let approvedCriteria = 0;
    
    relevantDomains.forEach(domain => {
      domain.maturity_practice_statements?.forEach((mps: any) => {
        mps.criteria?.forEach((criteria: any) => {
          totalCriteria++;
          if (criteria.status === 'approved_locked') {
            approvedCriteria++;
          }
        });
      });
    });
    
    return totalCriteria > 0 ? (approvedCriteria / totalCriteria) * 100 : 25; // Base coverage if no specific match
  };

  const identifyGaps = (requirement: ComplianceRequirement, frameworkData: any[]): string[] => {
    const gaps: string[] = [];
    
    // Mock gap analysis
    if (requirement.category === 'Leadership') {
      gaps.push('No explicit leadership commitment criteria defined');
      gaps.push('Missing governance framework documentation');
    } else if (requirement.category === 'Policy') {
      gaps.push('Policy approval process not documented');
      gaps.push('Regular policy review cycle not established');
    } else if (requirement.category === 'Framework') {
      gaps.push('Framework implementation metrics missing');
      gaps.push('Risk appetite statement not defined');
    }
    
    return gaps;
  };

  const generateRecommendations = (requirement: ComplianceRequirement, gaps: string[]): string[] => {
    const recommendations: string[] = [];
    
    gaps.forEach(gap => {
      if (gap.includes('leadership')) {
        recommendations.push('Add criteria for leadership commitment and accountability');
      } else if (gap.includes('policy')) {
        recommendations.push('Develop comprehensive policy management criteria');
      } else if (gap.includes('framework')) {
        recommendations.push('Define framework effectiveness measurement criteria');
      } else {
        recommendations.push('Address compliance gap through additional criteria definition');
      }
    });
    
    return recommendations;
  };

  const generateOverallRecommendations = (requirements: ComplianceRequirement[]): string[] => {
    const recommendations: string[] = [];
    
    const nonCompliantReqs = requirements.filter(r => r.status === 'non-compliant');
    const criticalGaps = requirements.filter(r => r.mandatory && r.status !== 'compliant');
    
    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} critical compliance gaps as priority`);
    }
    
    if (nonCompliantReqs.length > 0) {
      recommendations.push('Develop additional criteria to cover non-compliant requirements');
    }
    
    recommendations.push('Implement regular compliance monitoring and review processes');
    recommendations.push('Consider third-party compliance assessment for certification readiness');
    
    return recommendations;
  };

  const exportComplianceReport = () => {
    if (!complianceReport) return;
    
    const reportData = {
      standard: complianceReport.standard,
      analysisDate: new Date().toISOString(),
      overallScore: complianceReport.overallScore,
      summary: {
        compliantRequirements: complianceReport.compliantRequirements,
        totalRequirements: complianceReport.totalRequirements,
        criticalGaps: complianceReport.criticalGaps
      },
      recommendations: complianceReport.recommendations,
      heatmapData: complianceReport.heatmapData
    };
    
    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance_report_${complianceReport.standard.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Report Exported',
      description: 'Compliance report exported successfully'
    });
  };

  const getStatusIcon = (status: ComplianceRequirement['status']) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'non-compliant':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ComplianceRequirement['status']) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non-compliant':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {ISO_STANDARDS.map((standard) => (
          <Card 
            key={standard.id}
            className={`cursor-pointer transition-all ${
              selectedStandard === standard.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedStandard(standard.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                {standard.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{standard.description}</p>
              <Badge variant="outline" className="mt-2">
                {standard.requirements.length} Requirements
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Compliance Analysis
            </CardTitle>
            <Button 
              onClick={() => analyzeCompliance(selectedStandard)}
              disabled={isAnalyzing || !frameworkData}
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAnalyzing && (
            <div className="space-y-2">
              <Label>Analysis Progress</Label>
              <Progress value={analysisProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Analyzing framework against {ISO_STANDARDS.find(s => s.id === selectedStandard)?.name}...
              </p>
            </div>
          )}
          
          {!frameworkData && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No assessment framework data found. Please configure domains, MPS, and criteria first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {complianceReport && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compliance Report - {complianceReport.standard}</CardTitle>
                <Button onClick={exportComplianceReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(complianceReport.overallScore)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {complianceReport.compliantRequirements}
                  </div>
                  <div className="text-sm text-muted-foreground">Compliant</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {complianceReport.totalRequirements}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Requirements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {complianceReport.criticalGaps}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical Gaps</div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold mb-3 block">Compliance Heatmap</Label>
                <div className="grid gap-3">
                  {complianceReport.heatmapData.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{category.category}</span>
                        <span>{Math.round(category.score)}% ({category.requirements} req.)</span>
                      </div>
                      <Progress value={category.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold mb-3 block">Key Recommendations</Label>
                <div className="space-y-2">
                  {complianceReport.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};