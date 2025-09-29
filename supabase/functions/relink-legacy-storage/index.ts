import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Status = 'found_and_relinked' | 'found_but_failed' | 'not_found' | 'already_exists'

interface RelinkResult {
  documentId: string
  fileName: string
  title?: string
  oldPath: string
  newPath?: string
  status: Status
  bucket?: string
  error?: string
  error_code?:
    | 'file_not_found'
    | 'permission_denied'
    | 'download_failed'
    | 'upload_failed'
    | 'db_update_failed'
    | 'processing_trigger_failed'
    | 'unknown'
  processingTriggered?: boolean
  attemptedBuckets: string[]
}

interface RelinkReport {
  totalDocuments: number
  successfulRelinks: number
  failedRelinks: number
  notFound: number
  alreadyExists: number
  results: RelinkResult[]
  scanTime: string
  executedBy: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const adminClient = createClient(supabaseUrl, serviceKey)
    const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })

    // Validate user and ensure superuser
    const { data: userData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id
    const { data: isSuperuser } = await adminClient.rpc('is_superuser', { user_id_param: userId })
    if (!isSuperuser) {
      return new Response(JSON.stringify({ error: 'Forbidden: superuser access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { organizationId = null, dryRun = true } = await req.json()

    console.log(`🔍 Relink legacy storage ${dryRun ? '(DRY RUN)' : ''} org=${organizationId ?? 'ALL'}`)

    // Fetch candidate docs (exclude soft-deleted)
    let query = adminClient
      .from('ai_documents')
      .select('id, file_name, file_path, title, organization_id, checksum, metadata')
      .is('deleted_at', null)

    if (organizationId) query = query.eq('organization_id', organizationId)

    const { data: documents, error: docsError } = await query
    if (docsError) {
      console.error('Docs fetch error', docsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: RelinkResult[] = []
    const buckets = ['ai-documents', 'documents', 'ai_documents', 'chunk-tester']

    for (const doc of documents || []) {
      const attempted: string[] = []
      const base: RelinkResult = {
        documentId: doc.id,
        fileName: doc.file_name,
        title: doc.title,
        oldPath: doc.file_path,
        status: 'not_found',
        attemptedBuckets: attempted,
      }

      try {
        // Check if current path already present in target bucket
        attempted.push('ai-documents')
        const parent = doc.file_path?.split('/')?.slice(0, -1).join('/') || ''
        const leaf = doc.file_path?.split('/')?.pop() || doc.file_name
        const { data: currentExists, error: curErr } = await adminClient.storage
          .from('ai-documents')
          .list(parent, { search: leaf })
        if (curErr) console.warn('Check current path error', curErr)

        if (currentExists && currentExists.some((f) => f.name === leaf)) {
          base.status = 'already_exists'
          base.bucket = 'ai-documents'
          results.push(base)
          continue
        }

        // Search other buckets: exact folder/leaf, then common paths, then case-insensitive in these paths
        let foundBucket: string | null = null
        let foundPath: string | null = null

        const candidatePaths = new Set<string>()
        const parentFolder = parent
        if (parentFolder) candidatePaths.add(parentFolder)
        ;['', 'uploads', 'documents', userId].forEach((p) => candidatePaths.add(p))

        for (const bucket of buckets) {
          if (bucket === 'ai-documents') continue
          attempted.push(bucket)
          const listAndMatch = async (p: string) => {
            const { data: files, error: listErr } = await adminClient.storage.from(bucket).list(p)
            if (listErr) {
              console.warn(`List error bucket=${bucket} path=${p}`, listErr)
              return false
            }
            if (!files || files.length === 0) return false
            const byName = files.find((f) => f.name === leaf)
            const byNameCI = byName || files.find((f) => f.name.toLowerCase() === leaf.toLowerCase())
            if (byNameCI) {
              foundBucket = bucket
              foundPath = p ? `${p}/${byNameCI.name}` : byNameCI.name
              return true
            }
            return false
          }

          // Try parentFolder and common paths
          const paths = Array.from(candidatePaths)
          let matched = false
          for (const p of paths) {
             
            if (await listAndMatch(p)) {
              matched = true
              break
            }
          }
          if (matched) break
        }

        if (foundBucket && foundPath) {
          base.bucket = foundBucket
          base.newPath = foundPath

          if (dryRun) {
            base.status = 'found_and_relinked'
            results.push(base)
            continue
          }

          // Move file to ai-documents if needed
          let finalPath = foundPath
          if (foundBucket !== 'ai-documents') {
            const { data: fileData, error: dlErr } = await adminClient.storage.from(foundBucket).download(foundPath)
            if (dlErr) {
              base.status = 'found_but_failed'
              base.error_code = 'download_failed'
              base.error = dlErr.message
              results.push(base)
              continue
            }

            const targetPath = `${userId}/${Date.now()}-${leaf}`
            const { error: upErr } = await adminClient.storage.from('ai-documents').upload(targetPath, fileData, { upsert: true })
            if (upErr) {
              base.status = 'found_but_failed'
              base.error_code = 'upload_failed'
              base.error = upErr.message
              results.push(base)
              continue
            }

            // Remove from source bucket (best effort)
            await adminClient.storage.from(foundBucket).remove([foundPath])
            finalPath = targetPath
          }

          // Update DB
          const { error: updErr } = await adminClient
            .from('ai_documents')
            .update({
              file_path: finalPath,
              updated_at: new Date().toISOString(),
              metadata: { ...(typeof doc.metadata === 'object' ? doc.metadata : {}), relinked_at: new Date().toISOString(), relinked_by: userId, relink_source: `${foundBucket}:${foundPath}` },
            })
            .eq('id', doc.id)

          if (updErr) {
            base.status = 'found_but_failed'
            base.error_code = 'db_update_failed'
            base.error = updErr.message
            results.push(base)
            continue
          }

          // Re-trigger processing (best effort)
          try {
            await adminClient.functions.invoke('process-ai-document', { body: { documentId: doc.id, forceReprocess: true } })
            base.processingTriggered = true
          } catch (pe: any) {
            base.processingTriggered = false
            base.error_code = 'processing_trigger_failed'
            base.error = pe?.message
          }

          base.status = 'found_and_relinked'
          base.newPath = finalPath
          results.push(base)
        } else {
          base.status = 'not_found'
          base.error_code = 'file_not_found'
          base.error = 'File not found in any known bucket and paths'
          results.push(base)
        }
      } catch (e: any) {
        base.status = 'found_but_failed'
        base.error_code = 'unknown'
        base.error = e?.message || String(e)
        results.push(base)
      }
    }

    const report: RelinkReport = {
      totalDocuments: documents?.length || 0,
      successfulRelinks: results.filter((r) => r.status === 'found_and_relinked').length,
      failedRelinks: results.filter((r) => r.status === 'found_but_failed').length,
      notFound: results.filter((r) => r.status === 'not_found').length,
      alreadyExists: results.filter((r) => r.status === 'already_exists').length,
      results,
      scanTime: new Date().toISOString(),
      executedBy: userId,
    }

    console.log('📊 Relink report', report.successfulRelinks, report.failedRelinks, report.notFound)

    return new Response(JSON.stringify({ success: true, report, dryRun }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Relink legacy storage error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})