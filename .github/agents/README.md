# GitHub Copilot Custom Agents

This directory contains custom agent definitions for GitHub Copilot.

## Available Agents

### Maturion Build Agent (`my-agent.agent.md`)

**Description:** Full-stack build agent specialized in One Time Build philosophy with True North architecture-first approach.

**Expertise:**
- Architecture-first development
- True North requirements encoding
- Comprehensive QA automation
- Database migrations and schema management
- UI/UX verification workflows
- Admin functionality implementation
- Workflow design and integration
- Organizational hierarchy management

**When to Use:**
Use this agent when you need to:
- Implement new features following the One Time Build process
- Update architecture and QA requirements
- Build admin functionality with proper wiring
- Integrate workflows into the application
- Manage organizational hierarchies and user matrices
- Ensure all components are properly wired and tested

**Philosophy:**
This agent follows a strict architecture-first approach where:
1. Architecture is updated first (ARCHITECTURE.md)
2. QA checks are encoded (qa/requirements.json)
3. Implementation follows
4. Full QA must pass (GREEN) before handover

## How to Use Custom Agents

### In GitHub Copilot Chat
1. Open the Copilot Chat panel
2. Use the `@` symbol followed by the agent name
3. Example: `@maturion-build-agent please implement the workflow sidebar`

### In GitHub Copilot Workspace
1. When creating a new task or issue
2. Select "Assign to agent" option
3. Choose "Maturion Build Agent" from the dropdown
4. Provide your requirements in plain English

## Adding New Agents

To add a new custom agent:

1. Create a new `.agent.md` file in this directory
2. Add proper frontmatter with metadata:
   ```yaml
   ---
   name: "Agent Name"
   description: "Agent description"
   version: "1.0.0"
   tags: ["tag1", "tag2"]
   capabilities:
     - "Capability 1"
     - "Capability 2"
   ---
   ```
3. Document the agent's instructions and philosophy
4. Update `.github/copilot/agents.yml` to register the agent
5. Commit the changes

## Troubleshooting

If the agent is not appearing:
1. Verify the agent file has proper frontmatter
2. Check that the agent is registered in `.github/copilot/agents.yml`
3. Ensure the file follows the `.agent.md` naming convention
4. Try refreshing your GitHub Copilot session
5. Check GitHub Copilot settings to ensure custom agents are enabled

## Documentation

For more information on GitHub Copilot custom agents, see:
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Custom Agents Guide](https://docs.github.com/en/copilot/customizing-copilot)
