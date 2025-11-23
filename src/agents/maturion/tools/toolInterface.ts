/**
 * Maturion Tool Interface
 * Defines the structure for Maturion's tool-based capabilities
 */

import type { MaturionContext } from '../context/contextProvider';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  execute: (args: Record<string, unknown>, context: MaturionContext) => Promise<ToolResult>;
}

export type ToolCategory =
  | 'policy_management'
  | 'procedure_building'
  | 'threat_analysis'
  | 'control_design'
  | 'maturity_assessment'
  | 'implementation_planning'
  | 'template_generation'
  | 'audit_evidence'
  | 'risk_management'
  | 'incident_analysis'
  | 'governance'
  | 'code_assistance'
  | 'log_analysis';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

/**
 * Tool Registry
 * Manages all available tools
 */
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    console.log(`[Maturion Tools] Registered tool: ${tool.name}`);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getByCategory(category: ToolCategory): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  listAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: MaturionContext
  ): Promise<ToolResult> {
    const tool = this.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
      };
    }

    // Validate required parameters
    const missingParams = tool.parameters
      .filter((param) => param.required && !(param.name in args))
      .map((param) => param.name);

    if (missingParams.length > 0) {
      return {
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`,
      };
    }

    try {
      console.log(`[Maturion Tools] Executing tool: ${name}`, args);
      const result = await tool.execute(args, context);
      console.log(`[Maturion Tools] Tool execution complete: ${name}`, result.success);
      return result;
    } catch (error) {
      console.error(`[Maturion Tools] Tool execution failed: ${name}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Global tool registry instance
export const toolRegistry = new ToolRegistry();

/**
 * Helper function to format tool definitions for AI prompt
 */
export function formatToolsForPrompt(tools: ToolDefinition[]): string {
  return tools
    .map((tool) => {
      const params = tool.parameters
        .map(
          (p) =>
            `  - ${p.name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}`
        )
        .join('\n');

      return `Tool: ${tool.name}
Description: ${tool.description}
Category: ${tool.category}
Parameters:
${params}
`;
    })
    .join('\n---\n');
}

/**
 * Parses tool call from AI response
 * Expected format: TOOL_CALL: tool_name(param1=value1, param2=value2)
 */
export function parseToolCall(response: string): {
  toolName: string;
  args: Record<string, unknown>;
} | null {
  const toolCallRegex = /TOOL_CALL:\s*(\w+)\((.*?)\)/;
  const match = response.match(toolCallRegex);

  if (!match) {
    return null;
  }

  const toolName = match[1];
  const argsString = match[2];

  // Parse arguments
  const args: Record<string, unknown> = {};
  if (argsString) {
    const argPairs = argsString.split(',').map((s) => s.trim());
    for (const pair of argPairs) {
      const [key, value] = pair.split('=').map((s) => s.trim());
      if (key && value) {
        // Try to parse value as JSON, fallback to string
        try {
          args[key] = JSON.parse(value);
        } catch {
          // Remove quotes if present
          args[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  return { toolName, args };
}
