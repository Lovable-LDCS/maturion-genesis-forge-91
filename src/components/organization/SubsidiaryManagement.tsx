import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationHierarchy } from '@/hooks/useOrganizationHierarchy';
import { useOrganization } from '@/hooks/useOrganization';
import { Building2, Plus, Users, Mail } from 'lucide-react';

interface SubsidiaryManagementProps {
  organizationId?: string;
}

export const SubsidiaryManagement: React.FC<SubsidiaryManagementProps> = ({ 
  organizationId 
}) => {
  const { currentOrganization, hasPermission } = useOrganization();
  const { createSubsidiary, refetch } = useOrganizationHierarchy();
  const { toast } = useToast();
  
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [subsidiaryForm, setSubsidiaryForm] = useState({
    name: '',
    description: '',
    inviteEmail: ''
  });

  const parentOrgId = organizationId || currentOrganization?.id;

  const canCreateSubsidiaries = hasPermission('owner') || hasPermission('admin');

  const handleCreateSubsidiary = async () => {
    if (!parentOrgId || !subsidiaryForm.name.trim()) return;

    try {
      setIsCreating(true);
      
      await createSubsidiary(parentOrgId, {
        name: subsidiaryForm.name.trim(),
        description: subsidiaryForm.description.trim() || undefined,
        inviteEmail: subsidiaryForm.inviteEmail.trim() || undefined
      });

      toast({
        title: 'Subsidiary created successfully',
        description: subsidiaryForm.inviteEmail 
          ? `${subsidiaryForm.name} created and invitation sent to ${subsidiaryForm.inviteEmail}`
          : `${subsidiaryForm.name} created successfully`
      });

      // Reset form and close dialog
      setSubsidiaryForm({ name: '', description: '', inviteEmail: '' });
      setCreateDialogOpen(false);
      
      // Refresh the hierarchy
      await refetch();
    } catch (error: any) {
      toast({
        title: 'Failed to create subsidiary',
        description: error.message || 'An error occurred while creating the subsidiary',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!canCreateSubsidiaries) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Subsidiary Management
          </CardTitle>
          <CardDescription>
            Only organization owners and admins can manage subsidiaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You don't have permission to manage subsidiaries.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Subsidiary Management
            </CardTitle>
            <CardDescription>
              Create and manage subsidiaries and departments under your organization.
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Subsidiary
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subsidiary</DialogTitle>
                <DialogDescription>
                  Create a subsidiary organization and optionally invite someone to manage it.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subsidiary-name">Subsidiary Name *</Label>
                  <Input
                    id="subsidiary-name"
                    value={subsidiaryForm.name}
                    onChange={(e) => setSubsidiaryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter subsidiary name (e.g., Regional Office, Department)"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subsidiary-description">Description</Label>
                  <Textarea
                    id="subsidiary-description"
                    value={subsidiaryForm.description}
                    onChange={(e) => setSubsidiaryForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional: Brief description of this subsidiary's purpose or scope"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invite-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Invite Manager (Optional)
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={subsidiaryForm.inviteEmail}
                    onChange={(e) => setSubsidiaryForm(prev => ({ ...prev, inviteEmail: e.target.value }))}
                    placeholder="Email of person to invite as subsidiary owner"
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, an invitation will be sent to this email address
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSubsidiary}
                  disabled={isCreating || !subsidiaryForm.name.trim()}
                >
                  {isCreating ? 'Creating...' : 'Create Subsidiary'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>
              Subsidiaries allow you to organize your maturity assessments by divisions, 
              departments, or regional offices. Each subsidiary can have its own documents 
              and team members while inheriting best practices from the parent organization.
            </p>
          </div>
          
          {/* Current Organization Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Parent Organization
              </span>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{currentOrganization?.name}</strong>
              <br />
              All subsidiaries will inherit access to global best practices and can upload 
              their own organization-specific documents.
            </div>
          </div>
          
          {/* Benefits of Subsidiaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Team Management</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Each subsidiary can have its own team members with specific roles and permissions.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Context-Aware AI</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Maturion AI will provide tailored recommendations based on subsidiary-specific documents and global best practices.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubsidiaryManagement;