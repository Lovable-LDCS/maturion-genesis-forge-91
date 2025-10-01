# Working Agreement and Runbook (Maturion)

This document captures how we work together so you never need to re-explain preferences. It also includes step‑by‑step playbooks for common tasks.

1) How I will communicate with you
- Always step-by-step, specific, and non-technical where possible
- Always include exact file paths when referring to files
- Provide ready-to-run PowerShell commands in START COPY/END COPY blocks (one command per block)
- Explain where to click in the UI and how to verify success
- Offer rollback or safe fallback when applicable

2) If I need to read your uploaded documents (Supabase)
- Why I can’t “directly” read them from chat: This chat environment can’t access your live Supabase project or secrets. But your app is already connected, and we have server-side (Edge) functions that can fetch exactly what we need from your Supabase project.
- What I will do instead of saying “I can’t read files”: I will give you precise steps to either:
  a) Preview document content from your browser (logged in) using existing Edge functions; or
  b) Export or download the documents/chunks to your computer so I can read them locally in the repo.

3) Quick preview methods (no new code required)
- Confirm connectivity and table visibility
  - Run in browser console while logged into the app:
    - check-database-access
      - Shows that the app is connected and lists key tables and counts.
- List documents you uploaded
  - list-all-documents
    - Returns titles/metadata for uploaded documents.
- Preview chunk content used by AI grounding
  - search-ai-context
    - Returns the exact text snippets Maturion uses for generation.

4) Exporting documents to your computer (local copies)
- Goal: Pull documents and/or chunk content locally so I can read them in the repo.
- Options:
  - Use existing UI: In the app’s Document Management screens, use the Download actions (where available) to save files locally.
  - If you want a one-click “Export All”:
    - I will add a new Edge function export-org-documents that creates a ZIP of:
      - ai_documents metadata (JSON)
      - Original files from storage
      - Optional: a CSV/JSON of ai_document_chunks
    - You will run one PowerShell command (provided by me) or click a button, and then share the exported files back into the repo under _ai-uploads-KEEP-LOCAL/ for me to read.

5) Standard workflow for code and database changes
- Supabase-first (safe migrations)
  - All schema changes are written as timestamped SQL in supabase/migrations/ (format: YYYYMMDDHHMMSS_name.sql)
  - After writing migrations, I will provide exact commands to apply and generate types.
- Commands you will run (PowerShell)
  - Apply migrations to the linked project
    START COPY
    supabase db push
    END COPY
  - Regenerate TypeScript types using your project ref from supabase/config.toml
    START COPY
    supabase gen types typescript --project-id dmhlxhatogrrrvuruayv > src/types/supabase.ts
    END COPY
- Rebuild and smoke check
  - I will give you explicit UI steps to verify the new feature works.

6) File and function navigation help (how I’ll guide you)
- I will always include the exact path and a short description:
  - Example: “supabase/functions/search-ai-context/index.ts — server function that returns text snippets used for AI grounding.”
- When adding new files, I will specify where they live and what they do.

7) Verification steps (always included)
- I will always include:
  - What to run (exact command or where to click)
  - What success looks like (output or UI state)
  - What to do if it fails

8) Rollback and safety
- I will:
  - Avoid destructive migrations; if unavoidable, I’ll provide a reversible plan or a backup note
  - Use feature flags for risky changes
  - Never request plaintext secrets; I’ll reference env variables and Supabase secrets instead

9) Commitment about reading your documents
- I will not say “I can’t read files.”
- I will state “Here is how we will fetch or export your Supabase documents/chunks so I can read them locally,” and provide the exact steps or offer to implement an export Edge function.

10) Optional: “Export All Documents” feature (proposal)
- If you agree, I will:
  - Add a new Edge function export-org-documents that packages:
    - ai_documents metadata as JSON
    - Original files from storage (ai-documents or documents bucket)
    - Optional ai_document_chunks as a CSV/JSON
  - Provide a single PowerShell or in-app button to download
  - Provide instructions on where to save the exported ZIP in the repo so I can read it here

11) Common commands you will see from me (PowerShell, one per block)
- Apply migrations
  START COPY
  supabase db push
  END COPY
- Generate types (use project ref in supabase/config.toml)
  START COPY
  supabase gen types typescript --project-id dmhlxhatogrrrvuruayv > src/types/supabase.ts
  END COPY
- Start dev server
  START COPY
  npm run dev
  END COPY

12) What I need from you when something breaks
- Tell me what you clicked and what you expected to happen
- Copy any error toast text or console message (no secrets)
- I will respond with precise steps to diagnose and fix

This document is a living agreement. If any step feels unclear or too technical, tell me and I will rewrite it more simply with screenshots or shorter instructions.