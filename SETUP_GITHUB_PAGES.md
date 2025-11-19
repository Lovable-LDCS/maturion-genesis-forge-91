# GitHub Pages Setup Instructions

This guide will walk you through deploying the Maturion Genesis Forge application to GitHub Pages.

## Prerequisites

- GitHub repository with push access
- Supabase project credentials
- Node.js 20+ installed (for local testing)

---

## Step 1: Configure GitHub Repository Settings

### 1.1 Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Build and deployment**:
   - Source: Select **GitHub Actions**
4. Save the settings

### 1.2 Add Environment Variables (Secrets)

**Good news!** If you already have the following secrets configured, you don't need to add new ones:

| Your Existing Secret | Used For | Notes |
|---------------------|----------|-------|
| `SUPABASE_PROJECT_REF` | Project ID | Already configured ✅ |
| `SUPABASE_ANON_KEY` | Anon/public key | Already configured ✅ |
| `SUPABASE_DB_URL` | Supabase URL | Already configured ✅ |

The deployment workflow has been configured to use your existing secret names, so **no additional secrets are needed**.

<details>
<summary>If you need to add these secrets (click to expand)</summary>

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `SUPABASE_PROJECT_REF` | Your Supabase project ID | Supabase Dashboard → Project Settings |
| `SUPABASE_ANON_KEY` | Your anon/public key | Supabase Dashboard → API Settings |
| `SUPABASE_DB_URL` | Your Supabase URL | Supabase Dashboard → API Settings |

**Example values:**
```
SUPABASE_PROJECT_REF: dmhlxhatogrrrvuruayv
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL: https://dmhlxhatogrrrvuruayv.supabase.co
```

> ⚠️ **Important**: These are **public** keys that will be exposed in the client-side code. Never use secret/service keys here.

</details>

---

## Step 2: Deploy the Application

### Option A: Automatic Deployment (Recommended)

The workflow is configured to automatically deploy when you push to the `main` branch.

```bash
# Make sure you're on the main branch
git checkout main

# Pull latest changes
git pull origin main

# Push to trigger deployment
git push origin main
```

### Option B: Manual Deployment

You can also trigger the deployment manually:

1. Go to **Actions** tab in your GitHub repository
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

---

## Step 3: Verify Deployment

1. Wait for the workflow to complete (usually 2-3 minutes)
2. Go to **Actions** tab to monitor progress
3. Once completed, visit your site at:
   ```
   https://<username>.github.io/maturion-genesis-forge-91/
   ```

4. Check that:
   - ✅ The homepage loads correctly
   - ✅ Navigation works (all routes)
   - ✅ Supabase connection is working
   - ✅ Authentication works

---

## Step 4: Custom Domain (Optional)

If you want to use a custom domain instead of `username.github.io/repo-name`:

### 4.1 Update Vite Configuration

Edit `vite.config.ts` and change the base path:

```typescript
base: process.env.GITHUB_PAGES === 'true' 
  ? '/'  // Changed from '/maturion-genesis-forge-91/'
  : '/',
```

### 4.2 Configure GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Custom domain**, enter your domain (e.g., `maturion.example.com`)
3. Click **Save**
4. Wait for DNS check to complete

### 4.3 Update DNS Records

Add a CNAME record in your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | maturion | `<username>.github.io` |

Or for apex domain:

| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

### 4.4 Update 404.html

Edit `public/404.html` and change the redirect URL:

```javascript
window.location.replace('/'); // Changed from '/maturion-genesis-forge-91/'
```

---

## Step 5: Configure Supabase for GitHub Pages

### 5.1 Add Redirect URLs

In your Supabase project:

1. Go to **Authentication** → **URL Configuration**
2. Add your GitHub Pages URL to **Redirect URLs**:
   ```
   https://<username>.github.io/maturion-genesis-forge-91/
   https://<username>.github.io/maturion-genesis-forge-91/auth
   ```

3. Or if using custom domain:
   ```
   https://maturion.example.com/
   https://maturion.example.com/auth
   ```

### 5.2 Update Site URL

Set the **Site URL** to your GitHub Pages URL:
```
https://<username>.github.io/maturion-genesis-forge-91/
```

---

## Troubleshooting

### Issue: 404 Errors on Direct Route Access

**Symptom**: Routes like `/dashboard` show 404 when accessed directly

**Solution**: 
- Verify `404.html` exists in `public/` folder
- Check that the redirect script in `404.html` has correct base path
- Ensure the script in `index.html` is present

### Issue: Assets Not Loading (404 on CSS/JS files)

**Symptom**: Blank page, CSS/JS files return 404

**Solution**:
- Verify `base` path in `vite.config.ts` matches your deployment URL
- For repo deployment: `base: '/maturion-genesis-forge-91/'`
- For custom domain: `base: '/'`
- Rebuild and redeploy

### Issue: Supabase Connection Fails

**Symptom**: "Unable to connect to database" or authentication errors

**Solution**:
- Verify GitHub Secrets are set correctly
- Check Supabase redirect URLs include your GitHub Pages URL
- Verify CORS settings in Supabase

### Issue: Workflow Fails to Build

**Symptom**: GitHub Actions workflow shows build errors

**Solution**:
- Check workflow logs in **Actions** tab
- Verify all secrets are set correctly
- Check for TypeScript errors: run `npm run build` locally
- Ensure `package-lock.json` is committed

### Issue: Authentication Redirect Loops

**Symptom**: After login, redirects back to login page

**Solution**:
- Add exact redirect URLs to Supabase (including trailing slashes)
- Check browser console for errors
- Verify Site URL in Supabase matches deployment URL

---

## Testing Locally with GitHub Pages Configuration

To test the build with GitHub Pages base path locally:

```bash
# Build with GitHub Pages configuration
GITHUB_PAGES=true npm run build

# Preview the build
npm run preview
```

Then visit: `http://localhost:4173/maturion-genesis-forge-91/`

---

## Monitoring & Maintenance

### Check Deployment Status
- Monitor deployments in **Actions** tab
- Set up email notifications for failed deployments

### Update Environment Variables
- Update secrets in **Settings** → **Secrets and variables** → **Actions**
- Trigger new deployment after updating secrets

### Rollback Deployment
If a deployment fails or has issues:

1. Go to **Actions** tab
2. Find last successful deployment
3. Click **Re-run jobs** → **Re-run all jobs**

---

## Performance Optimization

For better performance on GitHub Pages:

### Enable Caching
GitHub Pages automatically caches static assets.

### Optimize Bundle Size
Consider these improvements:

1. **Code Splitting**: Implement route-based code splitting
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. **Manual Chunks**: Configure in `vite.config.ts`:
   ```typescript
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'vendor': ['react', 'react-dom', 'react-router-dom'],
           'supabase': ['@supabase/supabase-js'],
           'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
         }
       }
     }
   }
   ```

3. **Analyze Bundle**: 
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   ```

---

## Alternative: Deploy to Custom Branch

If you want to keep `main` for development:

1. Change workflow trigger:
   ```yaml
   on:
     push:
       branches: ["production"]  # or "gh-pages"
   ```

2. Create and push to production branch:
   ```bash
   git checkout -b production
   git push origin production
   ```

---

## Security Considerations

### ✅ Safe Practices
- Only use **public/anon** Supabase keys in GitHub Secrets
- Enable RLS (Row Level Security) in Supabase
- Use HTTPS (GitHub Pages provides this automatically)

### ⚠️ Never Expose
- Supabase service role key
- Private API keys
- Database passwords
- Admin credentials

---

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Verify Supabase configuration
3. Test build locally
4. Review browser console errors
5. Check this guide's troubleshooting section

---

## Next Steps

After successful deployment:

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring and analytics
3. ✅ Configure custom domain (optional)
4. ✅ Set up automated testing
5. ✅ Create deployment notifications
6. ✅ Document any custom configurations

---

**Deployment Status**: Ready to deploy! Follow the steps above to get your application live on GitHub Pages.
