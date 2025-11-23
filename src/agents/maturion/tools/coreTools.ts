/**
 * Maturion Core Tools
 * Implementation of the 13 core tool categories
 */

import { toolRegistry, type ToolDefinition, type ToolResult } from './toolInterface';
import type { MaturionContext } from '../context/contextProvider';
import { supabase } from '@/integrations/supabase/client';

/**
 * 1. Policy Writer/Updater
 */
const policyWriterTool: ToolDefinition = {
  name: 'policy_writer',
  description: 'Generates or updates security policies based on industry standards and organizational requirements',
  category: 'policy_management',
  parameters: [
    {
      name: 'policy_type',
      type: 'string',
      description: 'Type of policy (e.g., "Information Security", "Access Control", "Data Protection")',
      required: true,
    },
    {
      name: 'compliance_framework',
      type: 'array',
      description: 'Compliance frameworks to align with (e.g., ["ISO 27001", "NIST", "PCI DSS"])',
      required: false,
      default: [],
    },
    {
      name: 'existing_policy',
      type: 'string',
      description: 'Existing policy text to update (optional)',
      required: false,
    },
  ],
  execute: async (args, context): Promise<ToolResult> => {
    const { policy_type, compliance_framework = [], existing_policy } = args;

    try {
      // Call AI to generate policy
      const prompt = `Generate a ${policy_type} policy for ${context.organizationName}.
      
Compliance frameworks: ${(compliance_framework as string[]).join(', ') || 'General best practices'}
Industry: ${context.industryTags.join(', ')}
${existing_policy ? `\nUpdate this existing policy:\n${existing_policy}` : ''}

Provide a comprehensive policy document with:
1. Purpose and scope
2. Roles and responsibilities
3. Policy statements
4. Procedures
5. Compliance requirements
6. Review and update schedule`;

      // In production, this would call the AI model
      const generatedPolicy = `[Generated ${policy_type} Policy]\n${prompt}`;

      // Store in database
      if (context.organizationId) {
        await supabase.from('documents').insert({
          organization_id: context.organizationId,
          file_name: `${policy_type.replace(/\s+/g, '_')}_Policy.md`,
          file_type: 'policy',
          content: generatedPolicy,
          created_by: context.userId,
        });
      }

      return {
        success: true,
        data: { policy: generatedPolicy },
        message: `${policy_type} policy ${existing_policy ? 'updated' : 'generated'} successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Policy generation failed',
      };
    }
  },
};

/**
 * 2. Procedure Builder
 */
const procedureBuilderTool: ToolDefinition = {
  name: 'procedure_builder',
  description: 'Creates step-by-step procedures for implementing security controls',
  category: 'procedure_building',
  parameters: [
    {
      name: 'control_objective',
      type: 'string',
      description: 'The security control objective to achieve',
      required: true,
    },
    {
      name: 'domain',
      type: 'string',
      description: 'Six Domains category (e.g., "Protection", "Process Integrity")',
      required: true,
    },
    {
      name: 'detail_level',
      type: 'string',
      description: 'Level of detail: "basic", "intermediate", "advanced"',
      required: false,
      default: 'intermediate',
    },
  ],
  execute: async (args, context): Promise<ToolResult> => {
    const { control_objective, domain, detail_level = 'intermediate' } = args;

    try {
      const procedure = {
        title: `Procedure: ${control_objective}`,
        domain,
        detailLevel: detail_level,
        steps: [
          {
            step: 1,
            title: 'Preparation',
            description: 'Gather required resources and documentation',
            responsible: 'Security Team',
          },
          {
            step: 2,
            title: 'Implementation',
            description: 'Execute the control measures',
            responsible: 'Operations Team',
          },
          {
            step: 3,
            title: 'Verification',
            description: 'Verify control effectiveness',
            responsible: 'QA Team',
          },
          {
            step: 4,
            title: 'Documentation',
            description: 'Document evidence and outcomes',
            responsible: 'Compliance Team',
          },
        ],
        reviewSchedule: 'Quarterly',
      };

      return {
        success: true,
        data: procedure,
        message: `Procedure for "${control_objective}" created successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Procedure creation failed',
      };
    }
  },
};

/**
 * 3. Threat Modelling Assistant
 */
const threatModellingTool: ToolDefinition = {
  name: 'threat_modelling',
  description: 'Analyzes potential threats and creates threat models for assets and processes',
  category: 'threat_analysis',
  parameters: [
    {
      name: 'asset_type',
      type: 'string',
      description: 'Type of asset to model (e.g., "application", "data", "infrastructure")',
      required: true,
    },
    {
      name: 'asset_description',
      type: 'string',
      description: 'Description of the asset',
      required: true,
    },
    {
      name: 'methodology',
      type: 'string',
      description: 'Threat modelling methodology: "STRIDE", "PASTA", "DREAD"',
      required: false,
      default: 'STRIDE',
    },
  ],
  execute: async (args, context): Promise<ToolResult> => {
    const { asset_type, asset_description, methodology = 'STRIDE' } = args;

    try {
      const threatModel = {
        asset: {
          type: asset_type,
          description: asset_description,
        },
        methodology,
        threats: [
          {
            category: 'Spoofing',
            description: 'Unauthorized access through identity spoofing',
            likelihood: 'Medium',
            impact: 'High',
            mitigation: 'Implement MFA and strong authentication',
          },
          {
            category: 'Tampering',
            description: 'Data modification by unauthorized parties',
            likelihood: 'Low',
            impact: 'High',
            mitigation: 'Implement data integrity checks and audit logging',
          },
          // Additional threats would be AI-generated in production
        ],
        riskScore: 7.5,
        priorityActions: [
          'Implement multi-factor authentication',
          'Enable comprehensive audit logging',
          'Conduct regular security assessments',
        ],
      };

      return {
        success: true,
        data: threatModel,
        message: `Threat model created for ${asset_type}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Threat modelling failed',
      };
    }
  },
};

/**
 * 4. Maturity Gap Explainer
 */
const maturityGapTool: ToolDefinition = {
  name: 'maturity_gap_explainer',
  description: 'Explains maturity gaps and provides actionable recommendations',
  category: 'maturity_assessment',
  parameters: [
    {
      name: 'domain',
      type: 'string',
      description: 'Domain name (e.g., "Leadership & Governance")',
      required: true,
    },
    {
      name: 'current_level',
      type: 'number',
      description: 'Current maturity level (1-5)',
      required: true,
    },
    {
      name: 'target_level',
      type: 'number',
      description: 'Target maturity level (1-5)',
      required: true,
    },
  ],
  execute: async (args, context): Promise<ToolResult> => {
    const { domain, current_level, target_level } = args as { domain: string; current_level: number; target_level: number };

    if (current_level >= target_level) {
      return {
        success: true,
        message: 'Already at or above target maturity level',
        data: { gap: 0 },
      };
    }

    const gap = target_level - current_level;

    const analysis = {
      domain,
      currentLevel: current_level,
      targetLevel: target_level,
      gap,
      gapAnalysis: `You need to improve ${gap} maturity level(s) in ${domain}.`,
      keyMissingCapabilities: [
        'Documented processes and procedures',
        'Regular training and awareness programs',
        'Continuous monitoring and measurement',
        'Management oversight and accountability',
      ],
      recommendedActions: [
        {
          priority: 1,
          action: 'Establish baseline documentation',
          timeframe: '1-2 months',
          effort: 'Medium',
        },
        {
          priority: 2,
          action: 'Implement training program',
          timeframe: '2-3 months',
          effort: 'High',
        },
        {
          priority: 3,
          action: 'Deploy monitoring tools',
          timeframe: '1 month',
          effort: 'Medium',
        },
      ],
      estimatedTimeToClose: `${gap * 3}-${gap * 4} months`,
    };

    return {
      success: true,
      data: analysis,
      message: `Maturity gap analysis complete for ${domain}`,
    };
  },
};

/**
 * 5. Template Generator
 */
const templateGeneratorTool: ToolDefinition = {
  name: 'template_generator',
  description: 'Generates templates for SOPs, logs, registers, checklists',
  category: 'template_generation',
  parameters: [
    {
      name: 'template_type',
      type: 'string',
      description: 'Type of template: "SOP", "log", "register", "checklist", "form"',
      required: true,
    },
    {
      name: 'purpose',
      type: 'string',
      description: 'Purpose of the template',
      required: true,
    },
    {
      name: 'domain',
      type: 'string',
      description: 'Related domain (optional)',
      required: false,
    },
  ],
  execute: async (args, context): Promise<ToolResult> => {
    const { template_type, purpose, domain } = args;

    try {
      const template = {
        type: template_type,
        purpose,
        domain,
        organizationName: context.organizationName,
        createdDate: new Date().toISOString(),
        sections: [
          {
            title: 'Header',
            fields: ['Document Title', 'Document Number', 'Version', 'Effective Date', 'Owner'],
          },
          {
            title: 'Purpose',
            fields: ['Objective', 'Scope', 'Applicability'],
          },
          {
            title: 'Content',
            fields: ['Detailed content specific to template type'],
          },
          {
            title: 'Footer',
            fields: ['Approval', 'Review Schedule', 'References'],
          },
        ],
      };

      return {
        success: true,
        data: template,
        message: `${template_type} template generated for: ${purpose}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template generation failed',
      };
    }
  },
};

// Register all tools
export function registerCoreTools(): void {
  toolRegistry.register(policyWriterTool);
  toolRegistry.register(procedureBuilderTool);
  toolRegistry.register(threatModellingTool);
  toolRegistry.register(maturityGapTool);
  toolRegistry.register(templateGeneratorTool);

  console.log('[Maturion Tools] Core tools registered');
}
