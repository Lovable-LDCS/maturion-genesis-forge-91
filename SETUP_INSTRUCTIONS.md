# Setup Instructions

This document provides detailed instructions for setting up and configuring the Maturion Genesis Forge application.

## Table of Contents
- [GitHub Pages Deployment](#github-pages-deployment)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Supabase Workflow Setup](#supabase-workflow-setup)
- [One-Time Build Agent](#one-time-build-agent)
- [Troubleshooting](#troubleshooting)

---

## GitHub Pages Deployment

### Step 1: Enable GitHub Pages

1. Go to your repository settings: `https://github.com/Lovable-LDCS/maturion-genesis-forge-91/settings/pages`
2. Under **"Build and deployment"**, select **"Source"** → **"GitHub Actions"**
3. Save the changes

### Step 2: Trigger Deployment

The deployment will automatically trigger when you push to the `main` branch. You can also manually trigger it:

1. Go to **Actions** tab
2. Select **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

### Step 3: Access Your Application

Once deployed, your application will be available at:
```
https://lovable-ldcs.github.io/maturion-genesis-forge-91/
```

**Note:** It may take a few minutes for the deployment to complete. You can monitor the progress in the Actions tab.

---

## GitHub Secrets Configuration

The application requires certain GitHub Secrets to be configured for workflows to function properly.

### Required Secrets

#### For Supabase Database Push Workflow (`db-push.yml`)

Navigate to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

1. **`SUPABASE_ACCESS_TOKEN`**
   - **Description:** Personal access token for Supabase CLI
   - **How to get it:**
     1. Go to https://supabase.com/dashboard/account/tokens
     2. Click "Generate new token"
     3. Give it a name (e.g., "GitHub Actions")
     4. Copy the token
   - **Value:** Your Supabase access token
   - **Required for:** Database migrations and schema push operations

### Optional Secrets (for alternative configurations)

The following secrets are optional but can be used if you want to manage environment variables through GitHub Secrets:

2. **`SUPABASE_DB_URL`** (Optional - currently not used)
   - **Value:** `https://dmhlxhatogrrrvuruayv.supabase.co`
   - **Note:** The deploy workflow now uses hardcoded values from `.env.example`

3. **`SUPABASE_ANON_KEY`** (Optional - currently not used)
   - **Value:** Your Supabase anonymous key
   - **Note:** The deploy workflow now uses hardcoded values from `.env.example`

### Why Some Values Are Not Secrets

The Supabase URL and Anon Key are **public by design**. They are meant to be used in client-side applications:
- The URL is the public endpoint for your Supabase project
- The Anon Key is a public key that provides limited, row-level security access
- True security is enforced through Supabase Row Level Security (RLS) policies

Therefore, these values are safe to include directly in the workflow file and do not need to be stored as secrets.

---

## Supabase Workflow Setup

### Fixing "Unauthorized" Error

If you encounter this error:
```
Unexpected error retrieving remote project status: {"message":"Unauthorized"}
Error: Process completed with exit code 1.
```

**Solution:**

1. **Generate a Supabase Access Token:**
   - Visit: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Name it "GitHub Actions"
   - Copy the token immediately (it won't be shown again)

2. **Add the Token to GitHub Secrets:**
   - Go to your repository: `https://github.com/Lovable-LDCS/maturion-genesis-forge-91/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Value: Paste your Supabase access token
   - Click "Add secret"

3. **Verify the Configuration:**
   - The `db-push.yml` workflow should now work correctly
   - Test by manually triggering the workflow or pushing changes to `supabase/` directory

---

## One-Time Build Agent

### About the Agent

The repository includes a One-Time Build Agent configuration at `.github/agents/my-agent.agent.md`.

### Agent Purpose

This agent implements a comprehensive build philosophy that includes:
- **True North Architecture:** Architecture-first development approach
- **One Time Build:** Complete implementation with GREEN QA before handover
- **Strict Wiring:** All code must be wired and functional in the UI
- **No Legacy Code:** Automated cleanup of unused components
- **Health Checker:** In-app QA system for non-technical verification

### Agent Activation

The agent is **automatically activated** when:
1. The file exists at `.github/agents/my-agent.agent.md`
2. A GitHub Copilot or compatible AI assistant reads the repository
3. The agent's instructions guide the AI's behavior for code changes

**No manual activation is required.** The agent's instructions are followed by AI assistants that have access to the `.github/agents/` directory.

### Verifying Agent Configuration

To verify the agent is properly configured:

```bash
# Check that the agent file exists
ls -la .github/agents/my-agent.agent.md

# View the agent configuration
cat .github/agents/my-agent.agent.md
```

The agent file should contain comprehensive build instructions and should be version-controlled with the repository.

---

## Troubleshooting

### GitHub Pages Shows 404 Error

**Possible Causes:**
1. GitHub Pages is not enabled with "GitHub Actions" as the source
2. The deployment workflow hasn't run successfully
3. You're accessing the wrong URL

**Solutions:**
1. Verify GitHub Pages settings (see [Enable GitHub Pages](#step-1-enable-github-pages))
2. Check the Actions tab for deployment status
3. Ensure you're using the correct URL: `https://lovable-ldcs.github.io/maturion-genesis-forge-91/`
4. Wait a few minutes after deployment completes

### Deployment Workflow Fails

**Check the following:**
1. Ensure `node_modules` and `dist` are in `.gitignore` (they are)
2. Verify that `package-lock.json` is committed
3. Check the Actions logs for specific error messages
4. Ensure all required npm packages can be installed

### Database Push Workflow Fails

**Common issues:**
1. **Unauthorized Error:** Missing or invalid `SUPABASE_ACCESS_TOKEN` secret
2. **Migration Errors:** Invalid migration files in `supabase/migrations/`
3. **Project Reference Error:** Incorrect project reference in workflow

**Solutions:**
1. Add/update the `SUPABASE_ACCESS_TOKEN` secret (see [Supabase Workflow Setup](#supabase-workflow-setup))
2. Ensure migration files follow the format: `YYYYMMDDHHMMSS_description.sql`
3. Verify the project reference matches your Supabase project

### Local Development Issues

**Setup local environment:**

```bash
# Install dependencies
npm ci

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Merge Conflicts

If you encounter merge conflicts:
1. Review the `MERGE_CONFLICT_RESOLUTION.md` file for guidance
2. Use the GitHub web editor to resolve conflicts
3. Or use git command line:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git merge main
   # Resolve conflicts
   git add .
   git commit -m "Resolve merge conflicts"
   git push
   ```

---

## Additional Resources

- [SETUP_GITHUB_PAGES.md](./SETUP_GITHUB_PAGES.md) - Detailed GitHub Pages setup
- [GITHUB_PAGES_DEPLOYMENT.md](./GITHUB_PAGES_DEPLOYMENT.md) - Deployment compatibility analysis
- [MERGE_CONFLICT_RESOLUTION.md](./MERGE_CONFLICT_RESOLUTION.md) - Merge conflict resolution guide
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) - Complete project overview
- [Supabase Documentation](https://supabase.com/docs) - Official Supabase docs
- [GitHub Pages Documentation](https://docs.github.com/en/pages) - Official GitHub Pages docs
- [Vite Documentation](https://vitejs.dev/) - Official Vite documentation

---

## Support

For issues or questions:
1. Check the GitHub Actions logs for detailed error messages
2. Review the documentation files in the repository
3. Ensure all required secrets are configured
4. Test builds locally before pushing
5. Contact the development team for assistance
