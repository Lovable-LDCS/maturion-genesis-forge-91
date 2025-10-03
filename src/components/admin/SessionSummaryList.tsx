import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/hooks/useOrganization'
import { useToast } from '@/hooks/use-toast'

interface Item { name: string; path: string; signedUrl?: string }

export default function SessionSummaryList() {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!currentOrganization?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('list-session-summaries', {
        body: { organizationId: currentOrganization.id, limit: 20 }
      })
      if (error) throw error
      setItems(data?.items || [])
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load session summaries', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentOrganization?.id])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Chat Session Summaries</CardTitle>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No session summaries found yet.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((it) => (
              <li key={it.path} className="flex items-center justify-between">
                <span>{it.name}</span>
                {it.signedUrl ? (
                  <a href={it.signedUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
                ) : (
                  <span className="text-muted-foreground">No link</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
