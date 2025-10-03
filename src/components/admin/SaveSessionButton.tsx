import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function SaveSessionButton({ orgId, route }: { orgId: string; route?: string }) {
  const { toast } = useToast()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!orgId || !notes.trim()) {
      toast({ title: 'Missing info', description: 'Please enter a brief note before saving', variant: 'destructive' })
      return
    }
    try {
      setLoading(true)
      const sess = await supabase.auth.getSession()
      const userId = sess.data.session?.user?.id
      const { data, error } = await supabase.functions.invoke('save-session-summary', {
        body: { organizationId: orgId, userId, route, notes }
      })
      if (error) throw error
      toast({ title: 'Session saved', description: data?.file || 'Saved to chat-logs bucket' })
      setNotes('')
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save session', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <div className="border rounded p-3 space-y-2">
      <Textarea
        placeholder="Brief summary or notes to append to session log"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || !notes.trim()}>
          {loading ? 'Saving…' : 'Save Session Summary'}
        </Button>
      </div>
    </div>
  )
}

