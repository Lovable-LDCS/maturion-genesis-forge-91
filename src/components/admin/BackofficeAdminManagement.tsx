import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, UserPlus, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface BackofficeAdmin {
  id: string;
  user_id: string;
  email: string;
  granted_by: string;
  granted_at: string;
  created_at: string;
}

export const BackofficeAdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<BackofficeAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUserId, setNewAdminUserId] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();

  const fetchBackofficeAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backoffice_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching backoffice admins:', error);
      toast({
        title: "Error",
        description: "Failed to fetch backoffice admins",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBackofficeAdmin = async () => {
    if (!newAdminEmail || !newAdminUserId) {
      toast({
        title: "Invalid Input",
        description: "Please provide both email and user ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('add_backoffice_admin', {
        admin_email: newAdminEmail,
        admin_user_id: newAdminUserId
      });

      if (error) {
        throw error;
      }

      if (data) {
        toast({
          title: "Success",
          description: "Backoffice admin added successfully",
          variant: "default",
        });
        
        setNewAdminEmail('');
        setNewAdminUserId('');
        fetchBackofficeAdmins();
      } else {
        throw new Error('Failed to add backoffice admin');
      }
    } catch (error) {
      console.error('Error adding backoffice admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add backoffice admin",
        variant: "destructive",
      });
    }
  };

  const removeBackofficeAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('backoffice_admins')
        .delete()
        .eq('id', adminId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Backoffice admin removed successfully",
        variant: "default",
      });
      
      fetchBackofficeAdmins();
    } catch (error) {
      console.error('Error removing backoffice admin:', error);
      toast({
        title: "Error",
        description: "Failed to remove backoffice admin",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchBackofficeAdmins();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Backoffice Admin Management
          </CardTitle>
          <CardDescription>Access restricted to system administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage backoffice administrators.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Backoffice Admin Management
          </CardTitle>
          <CardDescription>
            Manage users who have elevated upload permissions for internal operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Admin */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Backoffice Admin</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Email address"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                type="email"
              />
              <Input
                placeholder="User ID (UUID)"
                value={newAdminUserId}
                onChange={(e) => setNewAdminUserId(e.target.value)}
              />
              <Button
                onClick={addBackofficeAdmin}
                disabled={!newAdminEmail || !newAdminUserId || loading}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add Admin
              </Button>
            </div>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Backoffice admins can upload documents to any organization they belong to, 
                bypassing normal permission checks. Use this feature carefully for internal operations only.
              </AlertDescription>
            </Alert>
          </div>

          {/* Current Admins List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Current Backoffice Admins</h3>
              <Badge variant="outline">
                {admins.length} admin{admins.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading admins...</p>
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backoffice admins configured</p>
                <p className="text-sm mt-2">Add users above to grant elevated upload permissions</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Granted At</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.email}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {admin.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {new Date(admin.granted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {admin.granted_by?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBackofficeAdmin(admin.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};