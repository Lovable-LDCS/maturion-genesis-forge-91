import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RelinkResult {
  documentId: string
  fileName: string
  title?: string
  oldPath: string
  newPath?: string
  status: 'found_and_relinked' | 'found_but_failed' | 'not_found' | 'already_exists'
  bucket?: string
  error?: string
  processingTriggered?: boolean
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

    // Validate user and check superuser status
    const { data: userData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = userData.user.id

    // Check if user is superuser
    const { data: isSuperuser, error: suError } = await adminClient
      .rpc('is_superuser', { user_id_param: userId })

    if (suError || !isSuperuser) {
      return new Response(JSON.stringify({ error: 'Forbidden: superuser access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { organizationId, dryRun = true } = await req.json()

    console.log(`🔍 Starting legacy storage relink scan${dryRun ? ' (DRY RUN)' : ''} for org: ${organizationId || 'ALL'}`)

    // Get documents that might have storage issues
    let query = adminClient
      .from('ai_documents')
      .select('id, file_name, file_path, title, organization_id, processing_status')
      .is('deleted_at', null)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: documents, error: docsError } = await query

    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`📄 Found ${documents?.length || 0} documents to scan`)

    const results: RelinkResult[] = []
    const buckets = ['ai-documents', 'documents', 'ai_documents', 'chunk-tester']

    for (const doc of documents || []) {
      console.log(`🔍 Scanning document: ${doc.file_name} (${doc.id})`)
      
      const result: RelinkResult = {
        documentId: doc.id,
        fileName: doc.file_name,
        title: doc.title,
        oldPath: doc.file_path,
        status: 'not_found'
      }

      // First, check if current path exists
      const { data: currentExists } = await adminClient.storage
        .from('ai-documents')
        .list(doc.file_path.split('/').slice(0, -1).join('/'), {
          search: doc.file_path.split('/').pop()
        })

      if (currentExists && currentExists.length > 0) {
        result.status = 'already_exists'
        result.bucket = 'ai-documents'
        results.push(result)
        continue
      }

      // Search across all buckets for the file
      let foundInBucket: string | null = null
      let foundPath: string | null = null

      for (const bucket of buckets) {
        if (bucket === 'ai-documents') continue // Already checked

        try {
          // Try to find by exact path first
          const { data: exactMatch } = await adminClient.storage
            .from(bucket)
            .list(doc.file_path.split('/').slice(0, -1).join('/'), {
              search: doc.file_path.split('/').pop()
            })

          if (exactMatch && exactMatch.length > 0) {
            foundInBucket = bucket
            foundPath = doc.file_path
            break
          }

          // Try to find by filename in root or common paths
          const commonPaths = ['', 'uploads', 'documents', userId]
          
          for (const path of commonPaths) {
            const { data: files } = await adminClient.storage
              .from(bucket)
              .list(path, { search: doc.file_name })

            if (files && files.length > 0) {
              const matchingFile = files.find(f => f.name === doc.file_name)
              if (matchingFile) {
                foundInBucket = bucket
                foundPath = path ? `${path}/${matchingFile.name}` : matchingFile.name
                break
              }
            }
          }

          if (foundInBucket) break
        } catch (error) {
          console.warn(`Error searching bucket ${bucket}:`, error)
        }
      }

      if (foundInBucket && foundPath) {
        console.log(`✅ Found ${doc.file_name} in bucket ${foundInBucket} at ${foundPath}`)
        
        result.bucket = foundInBucket
        result.newPath = foundPath

        if (!dryRun) {
          try {
            // Move file to ai-documents bucket if needed
            let finalPath = foundPath
            
            if (foundInBucket !== 'ai-documents') {
              // Download from source bucket
              const { data: fileData, error: downloadError } = await adminClient.storage
                .from(foundInBucket)
                .download(foundPath)

              if (downloadError) {
                throw new Error(`Failed to download from ${foundInBucket}: ${downloadError.message}`)
              }

              // Upload to ai-documents
              const targetPath = `${userId}/${Date.now()}-${doc.file_name}`
              const { error: uploadError } = await adminClient.storage
                .from('ai-documents')
                .upload(targetPath, fileData, { upsert: true })

              if (uploadError) {
                throw new Error(`Failed to upload to ai-documents: ${uploadError.message}`)
              }

              finalPath = targetPath

              // Delete from source bucket
              await adminClient.storage
                .from(foundInBucket)
                .remove([foundPath])
            }

            // Update database record
            const { error: updateError } = await adminClient
              .from('ai_documents')
              .update({ 
                file_path: finalPath,
                updated_at: new Date().toISOString(),
                metadata: {
                  ...doc.metadata,
                  relinked_at: new Date().toISOString(),
                  relinked_from: `${foundInBucket}:${foundPath}`,
                  relinked_by: userId
                }
              })
              .eq('id', doc.id)

            if (updateError) {
              throw new Error(`Failed to update database: ${updateError.message}`)
            }

            // Re-trigger processing
            try {
              await adminClient.functions.invoke('process-ai-document', {
                body: { documentId: doc.id, forceReprocess: true }
              })
              result.processingTriggered = true
            } catch (processError) {
              console.warn(`Failed to trigger processing for ${doc.id}:`, processError)
            }

            result.status = 'found_and_relinked'
            result.newPath = finalPath

            // Log the relink action
            await adminClient
              .from('ai_upload_audit')
              .insert({
                organization_id: doc.organization_id,
                document_id: doc.id,
                action: 'relink_storage',
                user_id: userId,
                metadata: {
                  old_path: doc.file_path,
                  new_path: finalPath,
                  source_bucket: foundInBucket,
                  relinked_at: new Date().toISOString()
                }
              })

          } catch (error) {
            console.error(`Failed to relink ${doc.file_name}:`, error)
            result.status = 'found_but_failed'
            result.error = error.message
          }
        } else {
          result.status = 'found_and_relinked' // Would be relinked
        }
      }

      results.push(result)
    }

    const report: RelinkReport = {
      totalDocuments: documents?.length || 0,
      successfulRelinks: results.filter(r => r.status === 'found_and_relinked').length,
      failedRelinks: results.filter(r => r.status === 'found_but_failed').length,
      notFound: results.filter(r => r.status === 'not_found').length,
      alreadyExists: results.filter(r => r.status === 'already_exists').length,
      results,
      scanTime: new Date().toISOString(),
      executedBy: userId
    }

    console.log(`📊 Relink scan complete:`, {
      total: report.totalDocuments,
      successful: report.successfulRelinks,
      failed: report.failedRelinks,
      notFound: report.notFound,
      alreadyExists: report.alreadyExists
    })

    return new Response(JSON.stringify({ 
      success: true, 
      report,
      dryRun 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Relink legacy storage error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})