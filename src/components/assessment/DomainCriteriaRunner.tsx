import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Props { domainName: string; orgId: string }
interface MpsRow { id: string; name: string; mps_number: number }
interface CriteriaItem { statement: string; summary?: string; original_statement?: string }

export default function DomainCriteriaRunner({ domainName, orgId }: Props) {
  const { toast } = useToast()
  const [domainUuid, setDomainUuid] = useState<string>('')
  const [mpsList, setMpsList] = useState<MpsRow[]>([])
  const [selectedMpsId, setSelectedMpsId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [items, setItems] = useState<CriteriaItem[]>([])
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [existingCriteria, setExistingCriteria] = useState<Set<string>>(new Set())

  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected])

  // Resolve domain UUID
  useEffect(() => {
    (async () => {
      if (!orgId || !domainName) return
      const { data } = await supabase
        .from('domains')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', domainName)
        .maybeSingle()
      if (data?.id) setDomainUuid(data.id)
    })()
  }, [orgId, domainName])

  // Load MPS list for domain
  useEffect(() => {
    (async () => {
      if (!domainUuid) return
      const { data, error } = await supabase
        .from('maturity_practice_statements')
        .select('id,name,mps_number')
        .eq('domain_id', domainUuid)
        .order('mps_number', { ascending: true })
      if (!error && data) {
        setMpsList(data)
        if (data[0]) setSelectedMpsId(data[0].id)
      }
    })()
  }, [domainUuid])

  // Load existing criteria for duplicate detection
  useEffect(() => {
    (async () => {
      if (!selectedMpsId) return
      const { data, error } = await supabase
        .from('criteria')
        .select('statement')
        .eq('mps_id', selectedMpsId)
      if (!error) {
        const set = new Set<string>((data || []).map(r => normalize(r.statement)))
        setExistingCriteria(set)
      }
    })()
  }, [selectedMpsId])

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

  const handleGenerate = async () => {
    if (!selectedMpsId) { toast({ title: 'Select MPS', description: 'Choose an MPS first', variant: 'destructive' }); return }
    setLoading(true)
    setItems([])
    setSelected({})
    setEditing({})
    try {
      const { data, error } = await supabase.functions.invoke('generate-criteria-list', {
        body: { organizationId: orgId, mpsId: selectedMpsId, max: 10 }
      })
      if (error) throw error
      const out = (data?.criteria || []) as Array<{ statement: string; summary?: string }>
      const mapped: CriteriaItem[] = out.map(c => ({ statement: c.statement, summary: c.summary, original_statement: c.statement }))
      setItems(mapped)
      toast({ title: 'Criteria generated', description: `${mapped.length} proposals` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate criteria'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!selectedMpsId) return
    const chosen = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ idx }) => selected[idx])
      .map(({ it }) => it)
    if (chosen.length === 0) {
      toast({ title: 'Nothing selected', description: 'Select one or more criteria to save', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id
      const { data, error } = await supabase.functions.invoke('save-criteria-list', {
        body: { organizationId: orgId, mpsId: selectedMpsId, userId, items: chosen }
      })
      if (error) throw error
      toast({ title: 'Criteria saved', description: `Saved ${data?.count ?? 0} item(s)` })
      // Refresh duplicates set
      const merged = new Set(existingCriteria)
      chosen.forEach(c => merged.add(normalize(c.statement)))
      setExistingCriteria(merged)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save criteria'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Criteria Runner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">MPS</label>
            <Select value={selectedMpsId} onValueChange={setSelectedMpsId}>
              <SelectTrigger><SelectValue placeholder="Select MPS" /></SelectTrigger>
              <SelectContent>
                {mpsList.map(m => <SelectItem key={m.id} value={m.id}>{`MPS ${m.mps_number} — ${m.name}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button disabled={!selectedMpsId || loading} onClick={handleGenerate}>Generate</Button>
            <Button disabled={!selectedMpsId || loading || !anySelected} variant="secondary" onClick={handleSave}>Save selected</Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="border rounded p-3 max-h-96 overflow-auto text-sm">
            {items.map((it, idx) => {
              const isDuplicate = existingCriteria.has(normalize(it.statement))
              return (
                <div key={idx} className="py-3 border-b last:border-b-0">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={!!selected[idx]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [idx]: !!v }))} />
                    <div className="flex-1">
                      {!editing[idx] ? (
                        <>
                          <div className="font-medium flex items-center gap-2">
                            <span>{it.statement}</span>
                            {isDuplicate && <Badge variant="destructive">Duplicate?</Badge>}
                          </div>
                          {it.summary && <div className="text-muted-foreground">{it.summary}</div>}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Textarea value={it.statement} onChange={(e) => setItems(arr => arr.map((x, i) => i===idx ? ({ ...x, statement: e.target.value }) : x))} rows={3} />
                          <Input placeholder="Summary (optional)" value={it.summary || ''} onChange={(e) => setItems(arr => arr.map((x, i) => i===idx ? ({ ...x, summary: e.target.value }) : x))} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s => ({ ...s, [idx]: !s[idx] }))}>{editing[idx] ? 'Done' : 'Edit'}</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
