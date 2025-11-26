# GitHub Copilot Custom Agents

This directory contains custom agent definitions for GitHub Copilot.

## Available Agents

### Foreman (Supervisor AI) (`foreman.md`)

**Description:** Supervisor-level AI for oversight, PR review, architecture alignment, and QA tasks.

**Role:** Supervisor

**Expertise:**
- PR Review & Verification
- Architecture Oversight & Enforcement
- QA Enforcement & Compliance
- UX/UI Verification
- Builder Agent Coordination
- Owner Communication

**When to Use:**
Use this agent when you need to:
- Review Pull Requests for correctness and compliance
- Validate architecture alignment
- Enforce QA requirements
- Verify UX/UI compliance
- Coordinate with the Builder Agent
- Escalate issues to the repository owner

**DO NOT use for:**
- Module-specific user help
- General questions
- Content drafting
- Basic user guidance

---

### Maturion Assistant (Module AI) (`module-agent.md`)

**Description:** Module-level AI assistant for user questions, contextual help, explanations, and content drafting. This is the default inline help agent.

**Role:** Module Assistant

**Expertise:**
- Answer user questions about module features
- Provide contextual help and explanations
- Explain fields, statuses, and page content
- Draft content and documentation
- Guide users through basic module-level tasks
- Maturity assessment framework guidance
- Compliance management assistance

**When to Use:**
Use this agent when you need to:
- Get help understanding a feature or field
- Draft content or documentation
- Understand maturity assessment concepts
- Navigate the platform
- Get contextual explanations

**This agent will escalate to the Foreman or Owner when:**
- System changes are requested
- Architecture modifications are needed
- Business decisions are required

---

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

---

## Agent Role Separation

| Aspect | Foreman (Supervisor AI) | Maturion Assistant (Module AI) |
|--------|------------------------|-------------------------------|
| **Role** | Supervisor, PR reviewer | In-app helper, explainer |
| **Focus** | Code quality, architecture | User assistance, guidance |
| **Scope** | Repository-wide | Module features |
| **Actions** | Review, approve, reject | Explain, draft, guide |
| **Target Users** | Developers, maintainers | End users |
| **Default** | No | Yes (inline help) |

---

## How to Use Custom Agents

### In GitHub Copilot Chat
1. Open the Copilot Chat panel
2. Use the `@` symbol followed by the agent name
3. Examples:
   - `@foreman please review this PR for architecture compliance`
   - `@maturion-assistant explain what the maturity levels mean`

### In GitHub Copilot Workspace
1. When creating a new task or issue
2. Select "Assign to agent" option
3. Choose the appropriate agent from the dropdown
4. Provide your requirements in plain English

---

## Adding New Agents

To add a new custom agent:

1. Create a new `.md` file in this directory
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
   role: "role-type"
   ---
   ```
3. Document the agent's instructions and philosophy
4. Update `.github/copilot/agents.yml` to register the agent
5. Update this README.md to document the agent
6. Commit the changes

---

## Troubleshooting

If the agent is not appearing:
1. Verify the agent file has proper frontmatter
2. Check that the agent is registered in `.github/copilot/agents.yml`
3. Ensure the file follows proper markdown format
4. Try refreshing your GitHub Copilot session
5. Check GitHub Copilot settings to ensure custom agents are enabled

---

## Documentation

For more information on GitHub Copilot custom agents, see:
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Custom Agents Guide](https://docs.github.com/en/copilot/customizing-copilot)
