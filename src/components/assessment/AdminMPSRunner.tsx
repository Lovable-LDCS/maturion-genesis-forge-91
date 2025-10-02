import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface Domain { id: string; name: string; organization_id: string }
interface MPSGenItem { number?: string | number; title: string; intent?: string; rationale?: string; summary?: string }

export default function AdminMPSRunner() {
  const { toast } = useToast()
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [genItems, setGenItems] = useState<MPSGenItem[]>([])
  const [saveInfo, setSaveInfo] = useState<any>(null)
  const [autoNumber, setAutoNumber] = useState<boolean>(true)

  const selectedDomain = useMemo(() => domains.find(d => d.id === selectedDomainId) || null, [domains, selectedDomainId])

  useEffect(() => { (async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data: om } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.user.id)
        .maybeSingle()
      if (om?.organization_id) setOrgId(om.organization_id)

      const { data: doms, error: domErr } = await supabase
        .from('domains')
        .select('id,name,organization_id')
        .eq('organization_id', om?.organization_id || '')
        .order('display_order')
      if (domErr) throw domErr
      setDomains(doms || [])
      if (doms?.[0]) setSelectedDomainId(doms[0].id)
    } catch (e: any) {
      console.error('AdminMPSRunner init error', e)
      toast({ title: 'Error', description: e?.message || 'Failed to load domains', variant: 'destructive' })
    }
  })() }, [])

  const handleGenerate = async () => {
    if (!selectedDomain || !orgId) return
    setLoading(true)
    setGenItems([])
    setSaveInfo(null)
    try {
      const { data, error } = await supabase.functions.invoke('generate-mps-list', {
        body: { organizationId: orgId, domainName: selectedDomain.name }
      })
      if (error) throw error
      const items: MPSGenItem[] = (data?.mps || []).map((x: any) => ({
        number: x.number, title: x.title, intent: x.intent, summary: x.rationale || x.summary || null
      }))
      setGenItems(items)
      toast({ title: 'MPS generated', description: `${items.length} items ready to save` })
    } catch (e: any) {
      console.error('generate-mps error', e)
      toast({ title: 'Error', description: e?.message || 'Failed to generate MPS', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!selectedDomain || !orgId || genItems.length === 0) return
    setLoading(true)
    setSaveInfo(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id

      // Fetch existing numbers for this domain to avoid collisions
      const { data: existingMps, error: existErr } = await supabase
        .from('maturity_practice_statements')
        .select('mps_number')
        .eq('domain_id', selectedDomain.id)
      if (existErr) throw existErr
      const used = new Set<number>((existingMps || []).map((r: any) => Number(r.mps_number)).filter((n: number) => Number.isFinite(n)))

      const nextFree = () => {
        let n = 1
        while (used.has(n)) n++
        used.add(n)
        return n
      }

      const itemsWithNumbers = genItems.map((it) => {
        let num = Number(it.number)
        if (!autoNumber) {
          return { ...it, number: Number.isFinite(num) && num > 0 ? num : nextFree() }
        }
        // Auto-number on: assign next free if missing or colliding
        if (!Number.isFinite(num) || num <= 0 || used.has(num)) {
          num = nextFree()
        } else {
          used.add(num)
        }
        return { ...it, number: num }
      })

      const { data, error } = await supabase.functions.invoke('save-mps-list', {
        body: { organizationId: orgId, domainId: selectedDomain.id, userId, items: itemsWithNumbers, upsert: true }
      })
      if (error) throw error
      setSaveInfo(data)
      toast({ title: 'MPS saved', description: `Saved ${data?.count ?? 0} item(s)` })
    } catch (e: any) {
      console.error('save-mps error', e)
      toast({ title: 'Error', description: e?.message || 'Failed to save MPS', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin MPS Runner (Server‑side Generate → Save)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Domain</label>
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
              <SelectContent>
                {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button disabled={!selectedDomain || loading} onClick={handleGenerate}>Generate</Button>
            <Button disabled={!selectedDomain || loading || genItems.length === 0} variant="secondary" onClick={handleSave}>Save</Button>
          </div>
          <div className="flex items-end">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" className="accent-primary" checked={autoNumber} onChange={e => setAutoNumber(e.currentTarget.checked)} />
              Auto-number to next available (avoid collisions)
            </label>
          </div>
        </div>

        {genItems.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Preview ({genItems.length})</div>
            <div className="border rounded p-3 max-h-64 overflow-auto text-sm">
              {genItems.map((it, i) => (
                <div key={i} className="py-1 border-b last:border-b-0">
                  <div className="font-medium">MPS {String(it.number)} — {it.title}</div>
                  {it.intent && <div className="text-muted-foreground">Intent: {it.intent}</div>}
                  {it.summary && <div className="text-muted-foreground">Summary: {it.summary}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {saveInfo && (
          <div className="text-sm">
            <div className="font-medium">Save Result</div>
            <pre className="bg-muted p-2 rounded overflow-auto text-xs">{JSON.stringify(saveInfo, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
