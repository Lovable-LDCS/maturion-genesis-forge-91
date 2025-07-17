import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Wand2, Check, X } from 'lucide-react';
import { StatusBadge } from '@/components/milestones/StatusBadge';

interface MPS {
  id: string;
  name: string;
  mps_number: number;
  summary: string | null;
  intent_statement: string | null;
  ai_suggested_intent: string | null;
  domain_id: string;
  status: string;
  intent_approved_at: string | null;
  intent_approved_by: string | null;
  created_at: string;
  updated_at: string;
  domain?: {
    name: string;
  };
}

interface Domain {
  id: string;
  name: string;
}

export const MPSManagement: React.FC = () => {
  const [mpsList, setMpsList] = useState<MPS[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMPS, setEditingMPS] = useState<MPS | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    summary: '',
    intent_statement: '',
    domain_id: '',
    mps_number: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch domains first
      const { data: domainsData, error: domainsError } = await supabase
        .from('domains')
        .select('id, name')
        .order('display_order');

      if (domainsError) throw domainsError;
      setDomains(domainsData || []);

      // Fetch MPS with domain information
      const { data: mpsData, error: mpsError } = await supabase
        .from('maturity_practice_statements')
        .select(`
          *,
          domain:domains(name)
        `)
        .order('domain_id, mps_number');

      if (mpsError) throw mpsError;
      setMpsList(mpsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getNextMPSNumber = (domainId: string) => {
    const domainMPS = mpsList.filter(mps => mps.domain_id === domainId);
    return domainMPS.length > 0 ? Math.max(...domainMPS.map(mps => mps.mps_number)) + 1 : 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: orgData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.user.id)
        .single();

      if (!orgData) throw new Error('Organization not found');

      if (editingMPS) {
        // Update existing MPS
        const { error } = await supabase
          .from('maturity_practice_statements')
          .update({
            ...formData,
            updated_by: user.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMPS.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'MPS updated successfully' });
      } else {
        // Create new MPS
        const { error } = await supabase
          .from('maturity_practice_statements')
          .insert({
            ...formData,
            organization_id: orgData.organization_id,
            created_by: user.user.id,
            updated_by: user.user.id,
            status: 'not_started'
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'MPS created successfully' });
      }

      setIsDialogOpen(false);
      setEditingMPS(null);
      setFormData({ name: '', summary: '', intent_statement: '', domain_id: '', mps_number: 1 });
      fetchData();
    } catch (error) {
      console.error('Error saving MPS:', error);
      toast({
        title: 'Error',
        description: 'Failed to save MPS',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (mpsId: string) => {
    if (!confirm('Are you sure you want to delete this MPS?')) return;

    try {
      const { error } = await supabase
        .from('maturity_practice_statements')
        .delete()
        .eq('id', mpsId);

      if (error) throw error;
      toast({ title: 'Success', description: 'MPS deleted successfully' });
      fetchData();
    } catch (error) {
      console.error('Error deleting MPS:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete MPS',
        variant: 'destructive'
      });
    }
  };

  const generateAISummary = async (mpsId: string, mpsName: string) => {
    try {
      // Mock AI summary generation - in a real implementation, this would call an AI service
      const summary = `This maturity practice statement focuses on ${mpsName.toLowerCase()} implementation and governance, ensuring systematic approach to organizational capability development and continuous improvement.`;
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('maturity_practice_statements')
        .update({
          ai_suggested_intent: summary,
          updated_by: user.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', mpsId);

      if (error) throw error;
      toast({ title: 'Success', description: 'AI summary generated' });
      fetchData();
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI summary',
        variant: 'destructive'
      });
    }
  };

  const approveIntent = async (mpsId: string, useAISuggestion: boolean = false) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const mps = mpsList.find(m => m.id === mpsId);
      if (!mps) return;

      const intentStatement = useAISuggestion ? mps.ai_suggested_intent : mps.intent_statement;

      const { error } = await supabase
        .from('maturity_practice_statements')
        .update({
          intent_statement: intentStatement,
          intent_approved_at: new Date().toISOString(),
          intent_approved_by: user.user.id,
          ai_suggested_intent: useAISuggestion ? null : mps.ai_suggested_intent,
          status: 'approved_locked',
          updated_by: user.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', mpsId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Intent statement approved' });
      fetchData();
    } catch (error) {
      console.error('Error approving intent:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve intent statement',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (mps: MPS) => {
    setEditingMPS(mps);
    setFormData({
      name: mps.name,
      summary: mps.summary || '',
      intent_statement: mps.intent_statement || '',
      domain_id: mps.domain_id,
      mps_number: mps.mps_number
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingMPS(null);
    setFormData({
      name: '',
      summary: '',
      intent_statement: '',
      domain_id: '',
      mps_number: 1
    });
    setIsDialogOpen(true);
  };

  const handleDomainChange = (domainId: string) => {
    const nextNumber = getNextMPSNumber(domainId);
    setFormData(prev => ({
      ...prev,
      domain_id: domainId,
      mps_number: nextNumber
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading MPS...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Maturity Practice Statements</h3>
          <p className="text-sm text-muted-foreground">
            Define and manage MPS with auto-numbering and AI-assisted content
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add MPS
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                {editingMPS ? 'Edit MPS' : 'Create New MPS'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="domain_id">Domain</Label>
                  <Select
                    value={formData.domain_id}
                    onValueChange={handleDomainChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id}>
                          {domain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mps_number">MPS Number</Label>
                  <Input
                    id="mps_number"
                    type="number"
                    value={formData.mps_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, mps_number: parseInt(e.target.value) }))}
                    min="1"
                    max="25"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">MPS Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter MPS name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief summary of the MPS"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intent_statement">Intent Statement</Label>
                <Textarea
                  id="intent_statement"
                  value={formData.intent_statement}
                  onChange={(e) => setFormData(prev => ({ ...prev, intent_statement: e.target.value }))}
                  placeholder="Detailed intent and scope of the MPS"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMPS ? 'Update' : 'Create'} MPS
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {mpsList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">No MPS configured yet</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First MPS
              </Button>
            </CardContent>
          </Card>
        ) : (
          mpsList.map((mps) => (
            <Card key={mps.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">MPS {mps.mps_number}</Badge>
                    <CardTitle className="text-lg">{mps.name}</CardTitle>
                    <StatusBadge status={mps.status} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(mps)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(mps.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Domain: {mps.domain?.name}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mps.summary && (
                  <div>
                    <Label className="text-sm font-medium">Summary</Label>
                    <p className="text-sm text-muted-foreground mt-1">{mps.summary}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Intent Statement</Label>
                  {mps.intent_statement ? (
                    <div className="mt-1">
                      <p className="text-sm text-muted-foreground">{mps.intent_statement}</p>
                      {mps.intent_approved_at && (
                        <Badge variant="default" className="mt-2">
                          <Check className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No intent statement defined</p>
                  )}
                </div>

                {mps.ai_suggested_intent && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium flex items-center">
                        <Wand2 className="h-4 w-4 mr-1" />
                        AI Summary Suggestion
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{mps.ai_suggested_intent}</p>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveIntent(mps.id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve AI Suggestion
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveIntent(mps.id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {!mps.ai_suggested_intent && !mps.intent_approved_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAISummary(mps.id, mps.name)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate AI Summary
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};