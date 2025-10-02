import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

type MpsRow = {
  id: string
  name: string
  mps_number: number
  summary: string | null
  intent_statement: string | null
}

type CriteriaRow = {
  id: string
  mps_id: string
  criteria_number: string
  statement: string
}

type MaturityLevel = {
  level: 'basic' | 'reactive' | 'compliant' | 'proactive' | 'resilient'
  descriptor: string
}

// Map internal enum to desired UI labels if needed later
const ORDERED_LEVELS: Array<MaturityLevel['level']> = ['basic', 'reactive', 'compliant', 'proactive', 'resilient']

function levelToLabel(level: MaturityLevel['level']) {
  switch (level) {
    case 'basic': return 'Basic'
    case 'reactive': return 'Reactive'
    case 'compliant': return 'Compliant'
    case 'proactive': return 'Proactive'
    case 'resilient': return 'Resilient'
  }
}

export default function MPSDashboard({ domainName, orgId }: { domainName: string; orgId: string }) {
  const [domainUuid, setDomainUuid] = useState<string>('')
  const [mps, setMps] = useState<MpsRow[]>([])
  const [criteria, setCriteria] = useState<CriteriaRow[]>([])
  const [expandedMps, setExpandedMps] = useState<Record<string, boolean>>({})
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({})
  const [levelsByCriteria, setLevelsByCriteria] = useState<Record<string, MaturityLevel[]>>({})
  const [evidenceStatus, setEvidenceStatus] = useState<Record<string, 'submitted' | 'pending' | 'missing'>>({})

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

  // Fetch MPS and Criteria
  useEffect(() => {
    (async () => {
      if (!domainUuid) return
      const { data: mpsRows } = await supabase
        .from('maturity_practice_statements')
        .select('id,name,mps_number,summary,intent_statement')
        .eq('domain_id', domainUuid)
        .order('mps_number', { ascending: true })
      setMps(mpsRows || [])

      const { data: critRows } = await supabase
        .from('criteria')
        .select('id,mps_id,criteria_number,statement')
        .in('mps_id', (mpsRows || []).map(r => r.id))
        .order('criteria_number', { ascending: true })
      setCriteria(critRows || [])

      // Optionally fetch maturity levels per criterion (placeholder: we’ll map to ordered levels if rows exist later)
      // For now, leave empty and show bands that can be expanded when real descriptors exist
      const lvMap: Record<string, MaturityLevel[]> = {}
      for (const c of critRows || []) {
        lvMap[c.id] = ORDERED_LEVELS.map(l => ({ level: l, descriptor: '' }))
      }
      setLevelsByCriteria(lvMap)

      // Evidence placeholder: mark all as pending for now; we will wire counts later
      const evMap: Record<string, 'submitted' | 'pending' | 'missing'> = {}
      for (const c of critRows || []) evMap[c.id] = 'pending'
      setEvidenceStatus(evMap)
    })()
  }, [domainUuid])

  const criteriaByMps = useMemo(() => {
    const map: Record<string, CriteriaRow[]> = {}
    for (const c of criteria) {
      if (!map[c.mps_id]) map[c.mps_id] = []
      map[c.mps_id].push(c)
    }
    return map
  }, [criteria])

  const evaluatedCounts = (mpsId: string) => {
    const items = criteriaByMps[mpsId] || []
    return { total: items.length, rated: 0, statusCounts: { basic: 0, reactive: 0, compliant: 0, proactive: 0, resilient: 0 } }
  }

  const evidenceCounts = (mpsId: string) => {
    const items = criteriaByMps[mpsId] || []
    const counts = { submitted: 0, pending: 0, missing: 0 }
    for (const c of items) {
      const st = evidenceStatus[c.id] || 'pending'
      counts[st] += 1
    }
    return counts
  }

  return (
    <div className="space-y-6">
      {mps.map(m => {
        const crit = criteriaByMps[m.id] || []
        const ev = evidenceCounts(m.id)
        const evalC = evaluatedCounts(m.id)
        const progress = crit.length > 0 ? Math.round((evalC.rated / crit.length) * 100) : 0
        const expanded = !!expandedMps[m.id]
        
        return (
          <Card key={m.id}>
            <CardHeader onClick={() => setExpandedMps(s => ({ ...s, [m.id]: !s[m.id] }))} className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">MPS {m.mps_number}</Badge>
                  <CardTitle className="text-lg">{m.name}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{crit.length} criteria</Badge>
                  <Badge variant="outline">Rated: {evalC.rated}/{crit.length}</Badge>
                </div>
              </div>
              {/* Intent & Rationale (summary) */}
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {m.intent_statement && <div><span className="font-medium">Intent:</span> {m.intent_statement}</div>}
                {m.summary && <div><span className="font-medium">Rationale:</span> {m.summary}</div>}
              </div>
              {/* Progress bar */}
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
              </div>
              {/* Evidence summary */}
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                <span>Evidence:</span>
                <Badge variant="secondary">Submitted {ev.submitted}</Badge>
                <Badge variant="outline">Pending {ev.pending}</Badge>
                <Badge variant="destructive">Missing {ev.missing}</Badge>
              </div>
            </CardHeader>
            {expanded && (
              <CardContent>
                <div className="space-y-3">
                  {crit.map(c => {
                    const cExpanded = !!expandedCriteria[c.id]
                    const levels = levelsByCriteria[c.id] || ORDERED_LEVELS.map(l => ({ level: l, descriptor: '' }))
                    return (
                      <div key={c.id} className="border rounded p-3">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCriteria(s => ({ ...s, [c.id]: !s[c.id] }))}>
                          <div className="font-medium">{c.criteria_number} {c.statement}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{evidenceStatus[c.id]}</Badge>
                            <Button size="sm" variant="outline">Upload Evidence</Button>
                          </div>
                        </div>
                        {cExpanded && (
                          <div className="mt-3 space-y-2">
                            {levels.map((lv, idx) => (
                              <div key={idx} className="rounded border p-2">
                                <div className="text-sm font-medium">
                                  {levelToLabel(lv.level)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {lv.descriptor || 'Descriptor not defined yet'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
