import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  expires_at: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email?: string;
  } | null;
}

const TeamManagement: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  
  const { currentOrganization, hasPermission } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchTeamData();
    }
  }, [currentOrganization]);

  const fetchTeamData = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      // Fetch pending invitations with all required fields
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('organization_invitations')
        .select(`
          id,
          email,
          role,
          status,
          invited_by,
          expires_at,
          created_at
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
        toast({
          title: "Warning",
          description: "Could not load pending invitations",
          variant: "destructive"
        });
        setInvitations([]); // Set empty array instead of keeping old data
      } else {
        setInvitations(invitationsData || []);
      }

      // Fetch current members with profile data
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error('Error fetching members:', membersError);
        toast({
          title: "Warning", 
          description: "Could not load team members",
          variant: "destructive"
        });
        setMembers([]);
      } else if (membersData && membersData.length > 0) {
        // Fetch profile data separately
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combine member data with profile data
        const membersWithProfiles = membersData.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.user_id === member.user_id) || null
        }));
        
        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!currentOrganization || !inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      // First, create the invitation in the database
      const { data, error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: currentOrganization.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Detailed invitation error:', error);
        console.log('Attempted values:', {
          organization_id: currentOrganization.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: user?.id
        });
        
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Invitation already exists",
            description: "This email has already been invited to this organization",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to send invitation: ${error.message}`,
            variant: "destructive"
          });
        }
        return;
      }

      // Send invitation email via edge function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation', {
          body: {
            email: inviteEmail.trim().toLowerCase(),
            organizationName: currentOrganization.name,
            role: inviteRole,
            inviterName: user?.user_metadata?.full_name || user?.email || 'Someone',
            invitationToken: data.invitation_token,
            expiresAt: data.expires_at
          }
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
          toast({
            title: "Invitation created but email failed",
            description: "The invitation was created but the email could not be sent. You can extend the invitation later.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Invitation sent successfully",
            description: `Invitation sent to ${inviteEmail}`,
          });
        }
      } catch (emailError) {
        console.error('Email function error:', emailError);
        toast({
          title: "Invitation created but email failed",
          description: "The invitation was created but the email could not be sent.",
          variant: "destructive"
        });
      }

      setInviteEmail('');
      setInviteRole('viewer');
      setShowInviteDialog(false);
      fetchTeamData(); // Refresh the data
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!currentOrganization) return;
    
    try {
      // First check if the invitation exists and is cancellable
      const { data: invitation, error: fetchError } = await supabase
        .from('organization_invitations')
        .select('id, status, email, organization_id')
        .eq('id', invitationId)
        .single();

      if (fetchError) {
        console.error('Fetch invitation error:', fetchError);
        toast({
          title: "Error",
          description: `Cannot access invitation: ${fetchError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!invitation) {
        toast({
          title: "Error",
          description: "Invitation not found",
          variant: "destructive"
        });
        return;
      }

      if (invitation.organization_id !== currentOrganization.id) {
        toast({
          title: "Error",
          description: "You don't have permission to cancel this invitation",
          variant: "destructive"
        });
        return;
      }

      if (invitation.status !== 'pending') {
        toast({
          title: "Cannot cancel invitation",
          description: `This invitation is already ${invitation.status} and cannot be cancelled`,
          variant: "destructive"
        });
        fetchTeamData(); // Refresh to show current state
        return;
      }

      // Proceed with cancellation
      const { error: updateError } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', invitationId)
        .eq('status', 'pending'); // Extra safety check

      if (updateError) {
        console.error('Cancel invitation error:', updateError);
        toast({
          title: "Error",
          description: `Failed to cancel invitation: ${updateError.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Invitation cancelled",
        description: `Invitation to ${invitation.email} has been cancelled successfully`,
      });

      // Refresh the data to show updated state
      fetchTeamData();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      // Update the expiry date to extend the invitation
      const { error } = await supabase
        .from('organization_invitations')
        .update({ 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Invitation extended",
        description: "The invitation has been extended for 7 more days",
      });

      fetchTeamData();
    } catch (error) {
      console.error('Error extending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to extend invitation",
        variant: "destructive"
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "The team member has been removed",
      });

      fetchTeamData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, expiresAt?: string) => {
    // Check if invitation is expired
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    
    if (isExpired && status === 'pending') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Accepted</Badge>;
      case 'expired':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const configs = {
      'owner': { variant: 'default' as const, className: 'bg-purple-500 hover:bg-purple-600' },
      'admin': { variant: 'default' as const, className: 'bg-blue-500 hover:bg-blue-600' },
      'assessor': { variant: 'secondary' as const, className: '' },
      'viewer': { variant: 'outline' as const, className: '' }
    };
    
    const config = configs[role as keyof typeof configs] || configs.viewer;
    return (
      <Badge variant={config.variant} className={config.className}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const canManageMembers = hasPermission('admin');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Team Management</span>
              </CardTitle>
              <CardDescription>
                Manage team members and invitations for {currentOrganization?.name}
              </CardDescription>
            </div>
            {canManageMembers && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join {currentOrganization?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer - Can view assessments</SelectItem>
                          <SelectItem value="assessor">Assessor - Can create and edit assessments</SelectItem>
                          <SelectItem value="admin">Admin - Can manage team and settings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={sendInvitation} 
                      disabled={!inviteEmail.trim() || inviting}
                      className="w-full"
                    >
                      {inviting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending Invitation...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
          <CardDescription>Current members of the organization</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManageMembers && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    {member.profiles?.full_name || 'Unknown User'}
                  </TableCell>
                  <TableCell>{member.profiles?.email}</TableCell>
                  <TableCell>
                    {getRoleBadge(member.role)}
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell>
                      {member.role !== 'owner' && member.user_id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => removeMember(member.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
            <CardDescription>Invitations waiting for acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  {canManageMembers && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      {getRoleBadge(invitation.role)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => resendInvitation(invitation.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Extend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManagement;