# Continue Proxy Usage Notes (Schema v1)

This workspace uses the Continue proxy model provider. Keep config schema-valid and never commit API keys.

Key rules
- Global models live in .continue/config.yaml with provider: continue-proxy
- Agent files (.continue/agents/*.yaml) are minimal: name/version/schema only (no models, no instructions)
- All secrets are stored in VS Code User settings (continue.secrets), not in the repo

Example .continue/config.yaml

name: Maturion Workspace
version: 1.0.0
schema: v1

models:
  - name: openai/gpt-5
    provider: continue-proxy
    model: gpt-5

  - name: openai/gpt-4
    provider: continue-proxy
    model: gpt-4o

mcpServers: []

Do not add in config.yaml (rejected by your schema)
- apiKey
- proxy/onPrem fields (orgScopeId, onPremProxyUrl)
- instructions in agent files

Secrets (User settings JSON)
Add to C:\Users\<you>\AppData\Roaming\Code\User\settings.json

"continue.secrets": {
  "OPENAI_API_KEY": "sk-...",
  "OPENAI_PROJECT": "proj_..."  // optional if your proxy supports it
}

Troubleshooting
- If Continue logs show ${...} literals, a template string wasn’t resolved. Search for ${secret or ${secrets and correct to ${secrets.NAME} in the right file, or remove disallowed fields.
- Use scripts/abbot-gap-analysis.ps1 -Fix to auto-correct drift.
