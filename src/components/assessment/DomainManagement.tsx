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
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Wand2, Check, X } from 'lucide-react';
import { StatusBadge } from '@/components/milestones/StatusBadge';
import { MaturionComplianceCheck } from '@/components/qa/MaturionComplianceCheck';

interface Domain {
  id: string;
  name: string;
  intent_statement: string | null;
  ai_suggested_intent: string | null;
  display_order: number;
  status: string;
  intent_approved_at: string | null;
  intent_approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DomainManagement: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    intent_statement: '',
    display_order: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch domains',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
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

      if (editingDomain) {
        // Update existing domain
        const { error } = await supabase
          .from('domains')
          .update({
            ...formData,
            updated_by: user.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDomain.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Domain updated successfully' });
      } else {
        // Create new domain
        const { error } = await supabase
          .from('domains')
          .insert({
            ...formData,
            organization_id: orgData.organization_id,
            created_by: user.user.id,
            updated_by: user.user.id,
            status: 'not_started'
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Domain created successfully' });
      }

      setIsDialogOpen(false);
      setEditingDomain(null);
      setFormData({ name: '', intent_statement: '', display_order: 0 });
      fetchDomains();
    } catch (error) {
      console.error('Error saving domain:', error);
      toast({
        title: 'Error',
        description: 'Failed to save domain',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Domain deleted successfully' });
      fetchDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete domain',
        variant: 'destructive'
      });
    }
  };

  const updateDisplayOrder = async (domainId: string, newOrder: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('domains')
        .update({
          display_order: newOrder,
          updated_by: user.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', domainId);

      if (error) throw error;
      fetchDomains();
    } catch (error) {
      console.error('Error updating display order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update display order',
        variant: 'destructive'
      });
    }
  };

  const generateAISuggestion = async (domainId: string, domainName: string) => {
    try {
      // Mock AI suggestion - in a real implementation, this would call an AI service
      const suggestion = `This domain focuses on ${domainName.toLowerCase()} practices and procedures to ensure comprehensive organizational maturity and compliance with industry standards.`;
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('domains')
        .update({
          ai_suggested_intent: suggestion,
          updated_by: user.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', domainId);

      if (error) throw error;
      toast({ title: 'Success', description: 'AI suggestion generated' });
      fetchDomains();
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI suggestion',
        variant: 'destructive'
      });
    }
  };

  const approveIntent = async (domainId: string, useAISuggestion: boolean = false) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const domain = domains.find(d => d.id === domainId);
      if (!domain) return;

      const intentStatement = useAISuggestion ? domain.ai_suggested_intent : domain.intent_statement;

      const { error } = await supabase
        .from('domains')
        .update({
          intent_statement: intentStatement,
          intent_approved_at: new Date().toISOString(),
          intent_approved_by: user.user.id,
          ai_suggested_intent: useAISuggestion ? null : domain.ai_suggested_intent,
          status: 'approved_locked',
          updated_by: user.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', domainId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Intent statement approved' });
      fetchDomains();
    } catch (error) {
      console.error('Error approving intent:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve intent statement',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (domain: Domain) => {
    setEditingDomain(domain);
    setFormData({
      name: domain.name,
      intent_statement: domain.intent_statement || '',
      display_order: domain.display_order
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading domains...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Assessment Domains</h3>
          <p className="text-sm text-muted-foreground">
            Configure the core domains for your assessment framework
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDomain(null);
              setFormData({ name: '', intent_statement: '', display_order: domains.length + 1 });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingDomain ? 'Edit Domain' : 'Create New Domain'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Domain Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter domain name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intent_statement">Intent Statement</Label>
                <Textarea
                  id="intent_statement"
                  value={formData.intent_statement}
                  onChange={(e) => setFormData(prev => ({ ...prev, intent_statement: e.target.value }))}
                  placeholder="Describe the domain's purpose and scope"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDomain ? 'Update' : 'Create'} Domain
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {domains.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground mb-4">No domains configured yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          domains.map((domain, index) => (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">#{domain.display_order}</Badge>
                    <CardTitle className="text-lg">{domain.name}</CardTitle>
                    <StatusBadge status={domain.status} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateDisplayOrder(domain.id, domain.display_order - 1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateDisplayOrder(domain.id, domain.display_order + 1)}
                      disabled={index === domains.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(domain)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(domain.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Intent Statement</Label>
                  {domain.intent_statement ? (
                    <div className="mt-1">
                      <p className="text-sm text-muted-foreground">{domain.intent_statement}</p>
                      {domain.intent_approved_at && (
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

                {domain.ai_suggested_intent && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium flex items-center">
                        <Wand2 className="h-4 w-4 mr-1" />
                        AI Suggestion
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{domain.ai_suggested_intent}</p>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveIntent(domain.id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve AI Suggestion
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveIntent(domain.id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {!domain.ai_suggested_intent && !domain.intent_approved_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAISuggestion(domain.id, domain.name)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate AI Suggestion
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