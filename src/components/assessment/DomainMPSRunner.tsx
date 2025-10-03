import { useMemo, useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type MpsItem = { number?: number | string; title: string; intent?: string; rationale?: string; summary?: string }

type Props = { domainName: string; orgId: string }

export default function DomainMPSRunner({ domainName, orgId }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [max, setMax] = useState<number>(8)
  const [items, setItems] = useState<MpsItem[]>([])
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [domainUuid, setDomainUuid] = useState<string>('')
  const [domainLocked, setDomainLocked] = useState<boolean>(false)
  const [mpsCount, setMpsCount] = useState<number>(0)
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false)
  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected])

  // Resolve domain UUID by (orgId, domainName) with synonyms fallback
  useEffect(() => {
    (async () => {
      if (!orgId || !domainName) return

      const DOMAIN_SYNONYMS: Record<string, string[]> = {
        'Leadership & Governance': ['Leadership and Governance', 'Leadership & Governance'],
        'People & Culture': ['People and Culture', 'People & Culture'],
        'Process Integrity': ['Process Integrity'],
        'Protection': ['Protection'],
        'Proof it Works': ['Proof it Works', 'Proof It Works']
      }

      // Try exact first
      let { data, error } = await supabase
        .from('domains')
        .select('id, status, name')
        .eq('organization_id', orgId)
        .eq('name', domainName)
        .maybeSingle()

      // If not found, try synonyms (case-insensitive)
      if ((!data || error) && DOMAIN_SYNONYMS[domainName]) {
        const names = Array.from(new Set([domainName, ...DOMAIN_SYNONYMS[domainName]]))
        const { data: list } = await supabase
          .from('domains')
          .select('id, status, name')
          .eq('organization_id', orgId)
          .in('name', names)
          .limit(1)
        if (list && list.length > 0) {
          data = list[0]
          error = null as any
        }
      }

      // Final fallback: ilike loose match removing symbol differences
      if (!data) {
        const loose = domainName.replace('&', '').replace('  ', ' ').trim()
        const { data: list2 } = await supabase
          .from('domains')
          .select('id, status, name')
          .eq('organization_id', orgId)
          .ilike('name', `%${loose.split(' ').join('%')}%`)
          .limit(1)
        if (list2 && list2.length > 0) {
          data = list2[0]
        }
      }

      if (data?.id) {
        setDomainUuid(data.id)
        setDomainLocked(data.status === 'approved_locked' || data.status === 'completed')
      } else {
        setDomainUuid('')
        setDomainLocked(false)
      }
    })()
  }, [orgId, domainName])

  // Load MPS count
  useEffect(() => {
    (async () => {
      if (!domainUuid) return
      const { count } = await supabase
        .from('maturity_practice_statements')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('domain_id', domainUuid)
      setMpsCount(count || 0)
    })()
  }, [domainUuid])

  const handleGenerate = async (extra = false) => {
    if (domainLocked) { toast({ title: 'Domain is locked', description: 'This domain has been signed off and cannot be modified.' }); return }
    if (mpsCount > 0) { setShowResetConfirm(true); return }

    try {
      setLoading(true)
      const cap = extra ? Math.min(max + 3, 15) : max
      const { data, error } = await supabase.functions.invoke('generate-mps-list', {
        body: { organizationId: orgId, domainName, max: cap }
      })
      if (error) throw error
      const raw = (data as { mps?: Array<Partial<MpsItem>> } | null)
      const list: MpsItem[] = (raw?.mps || []).map((x) => ({
        number: x.number, title: String(x.title || ''), intent: x.intent ? String(x.intent) : undefined, rationale: x.rationale ? String(x.rationale) : undefined, summary: x.summary ? String(x.summary) : undefined
      }))
      setItems(list)
      setSelected({})
      setEditing({})
      setMax(cap)
      toast({ title: 'MPS generated', description: `${list.length} proposals` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate MPS'
      console.error('DomainMPSRunner generate error', e)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      if (!domainUuid) {
        toast({ title: 'Domain not resolved', description: 'Please wait a moment and try again', variant: 'destructive' })
        return
      }
      // Fetch existing numbers for this domain to avoid collisions
      const { data: existing, error: existErr } = await supabase
        .from('maturity_practice_statements')
        .select('mps_number')
        .eq('domain_id', domainUuid)
      if (existErr) throw existErr
      const used = new Set<number>((existing || []).map((r: { mps_number: number }) => Number(r.mps_number)).filter((n: number) => Number.isFinite(n)))
      const nextFree = () => { let n = 1; while (used.has(n)) n++; used.add(n); return n }

      const chosen = items
        .map((it, idx) => ({ it, idx }))
        .filter(({ idx }) => selected[idx])
        .map(({ it }) => ({
          number: Number.isFinite(Number(it.number)) ? Number(it.number) : nextFree(),
          title: it.title,
          intent: it.intent,
          summary: it.rationale || it.summary || null
        }))

      if (chosen.length === 0) {
        toast({ title: 'Nothing selected', description: 'Select one or more MPS to save', variant: 'destructive' })
        return
      }

      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id

      const { data, error } = await supabase.functions.invoke('save-mps-list', {
        body: { organizationId: orgId, domainId: domainUuid, userId, items: chosen, upsert: true }
      })
      if (error) throw error
      const payload = data as { count?: number } | null
      toast({ title: 'MPS saved', description: `Saved ${payload?.count ?? 0} item(s)` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save MPS'
      console.error('DomainMPSRunner save error', e)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain MPS Runner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Debug info to ensure correct domain is resolved */}
        <div className="text-xs text-muted-foreground">Domain resolved: {domainName} ({domainUuid || 'unresolved'}) • DB MPS count: {mpsCount}</div>

        {domainLocked && (
          <div className="p-3 border rounded bg-muted text-sm">
            This domain has been signed off or completed and is locked. MPS generation is disabled.
          </div>
        )}
        {!domainLocked && mpsCount > 0 && items.length === 0 && (
          <div className="p-3 border rounded bg-muted text-sm flex items-center justify-between">
            <span>You already created {mpsCount} MPS for {domainName}. Rerun MPS creator?</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowResetConfirm(true)}>Rerun</Button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button disabled={loading || domainLocked} onClick={() => handleGenerate(false)}>Generate</Button>
          <Button disabled={loading || domainLocked} variant="secondary" onClick={() => handleGenerate(true)}>Generate more</Button>
          <Button disabled={loading || !anySelected || domainLocked} variant="outline" onClick={handleSave}>Save selected</Button>
          <Button disabled={loading || items.length === 0} variant="ghost" onClick={() => setItems([])}>Clear proposals</Button>
        </div>
        {items.length > 0 && (
          <div className="border rounded p-3 max-h-96 overflow-auto text-sm">
            {items.map((it, idx) => (
              <div key={idx} className="py-3 border-b last:border-b-0">
                <div className="flex items-start gap-2">
                  <Checkbox checked={!!selected[idx]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [idx]: !!v }))} />
                  <div className="flex-1">
                    {!editing[idx] ? (
                      <>
                        <div className="font-medium">{it.title}</div>
                        {it.intent && <div className="text-muted-foreground">Intent: {it.intent}</div>}
                        {it.rationale && <div className="text-muted-foreground">Rationale: {it.rationale}</div>}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Input value={it.title} onChange={(e) => setItems(arr => arr.map((x, i) => i===idx ? ({ ...x, title: e.target.value }) : x))} />
                        <Input placeholder="Intent (optional)" value={it.intent || ''} onChange={(e) => setItems(arr => arr.map((x, i) => i===idx ? ({ ...x, intent: e.target.value }) : x))} />
                        <Textarea placeholder="Rationale (optional)" value={it.rationale || ''} onChange={(e) => setItems(arr => arr.map((x, i) => i===idx ? ({ ...x, rationale: e.target.value }) : x))} rows={2} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s => ({ ...s, [idx]: !s[idx] }))}>{editing[idx] ? 'Done' : 'Edit'}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Reset confirmation modal */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rerun MPS Creator?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Creating new MPS will delete previously created MPS and their criteria for this domain. Proceed?</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  if (!domainUuid) {
                    toast({ title: 'Please wait', description: 'Resolving domain… try again in a moment', variant: 'destructive' })
                    return
                  }
                  if (domainLocked) {
                    toast({ title: 'Domain locked', description: 'This domain is completed/signed off and cannot be reset.' })
                    return
                  }
                  const { data: sess } = await supabase.auth.getSession()
                  const userId = sess.session?.user?.id
                  // Use v2 reset to avoid delete triggers and status enums
                  const { error } = await supabase.functions.invoke('reset-domain-mps-v2', {
                    body: { organizationId: orgId, domainId: domainUuid, userId }
                  })
                  if (error) throw error

                  // Re-count from DB to ensure UI reflects true state
                  const { count, error: countErr } = await supabase
                    .from('maturity_practice_statements')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', orgId)
                    .eq('domain_id', domainUuid)
                  if (countErr) console.warn('DomainMPSRunner: recount error', countErr)

                  setShowResetConfirm(false)
                  setItems([])
                  setSelected({})
                  setEditing({})
                  setMpsCount(count || 0)
                  // Notify other components (e.g., MPSDashboard) to refresh
                  try { window.dispatchEvent(new CustomEvent('domain-mps-reset', { detail: { domainId: domainUuid } })); } catch {}
                  toast({ title: 'Domain reset', description: (count ?? 0) === 0 ? 'Previous MPS removed. You can generate new MPS now.' : `Some MPS remain (${count}). Please refresh or contact support.` })
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Failed to reset domain'
                  toast({ title: 'Error', description: msg, variant: 'destructive' })
                }
              }}>Proceed</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
