import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building, 
  Mail,
  UserCheck,
  AlertCircle,
  LogIn,
  UserPlus,
  ArrowRight
} from 'lucide-react';

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
    description?: string;
  };
}

type ViewState = 'loading' | 'invitation_valid' | 'email_mismatch' | 'sign_in_required' | 'error';

const InvitationAcceptance: React.FC = () => {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [accepting, setAccepting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sign-in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, signIn, signUp, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    } else {
      setError('No invitation token provided');
      setViewState('error');
    }
  }, [token, user]);

  const fetchInvitationDetails = async () => {
    if (!token) return;
    
    try {
      setViewState('loading');
      
      // Fetch invitation details
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          id,
          email,
          role,
          status,
          expires_at,
          created_at,
          organization_id
        `)
        .eq('invitation_token', token)
        .single();

      if (error || !data) {
        setError('Invitation not found or invalid');
        setViewState('error');
        return;
      }

      if (data.status !== 'pending') {
        setError(`This invitation has already been ${data.status}`);
        setViewState('error');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setViewState('error');
        return;
      }

      // Fetch organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, description')
        .eq('id', data.organization_id)
        .single();

      if (orgError || !orgData) {
        setError('Organization not found');
        setViewState('error');
        return;
      }

      const invitationData = {
        ...data,
        organizations: orgData
      };
      
      setInvitation(invitationData);
      setEmail(data.email); // Pre-fill the email

      // Determine the view state based on user authentication
      if (!user) {
        setViewState('sign_in_required');
      } else if (user.email !== data.email) {
        setViewState('email_mismatch');
      } else {
        setViewState('invitation_valid');
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Failed to load invitation details');
      setViewState('error');
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    if (email !== invitation?.email) {
      toast({
        title: "Error",
        description: `Please sign in with ${invitation?.email} to accept this invitation`,
        variant: "destructive"
      });
      return;
    }

    setSigningIn(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Signed in successfully",
          description: "You can now accept the invitation"
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (email !== invitation?.email) {
      toast({
        title: "Error",
        description: `Please sign up with ${invitation?.email} to accept this invitation`,
        variant: "destructive"
      });
      return;
    }

    setSigningUp(true);
    try {
      const { error } = await signUp(email, password, email.split('@')[0]); // Use email prefix as default name
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Account created successfully",
          description: "You can now accept the invitation"
        });
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSigningUp(false);
    }
  };

  const handleSignOutAndRedirect = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: `Please sign in with ${invitation?.email} to accept this invitation`
    });
  };

  const acceptInvitation = async () => {
    if (!invitation || !user) return;
    
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_token_param: token
      });

      if (error) {
        throw error;
      }

      const result = data as { 
        success: boolean; 
        error?: string; 
        organization_name?: string;
        role?: string; 
      };

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to accept invitation",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${result.organization_name || invitation.organizations.name} as ${result.role}`,
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const configs = {
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

  // Loading State
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <CardTitle>Loading Invitation...</CardTitle>
            <CardDescription>Verifying invitation details</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Error State
  if (viewState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sign In Required State
  if (viewState === 'sign_in_required') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <UserCheck className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>You're Invited to {invitation?.organizations.name}!</CardTitle>
            <CardDescription>
              Please {showSignUp ? 'create an account' : 'sign in'} with <strong>{invitation?.email}</strong> to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invitation Preview */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Invited as</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                {invitation && getRoleBadge(invitation.role)}
                <span className="text-sm">in {invitation?.organizations.name}</span>
              </div>
            </div>

            {/* Auth Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={invitation?.email}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              {showSignUp && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {showSignUp ? (
                <Button 
                  onClick={handleSignUp} 
                  disabled={signingUp}
                  className="w-full"
                >
                  {signingUp ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account & Accept Invitation
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleSignIn} 
                  disabled={signingIn}
                  className="w-full"
                >
                  {signingIn ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In & Accept Invitation
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={() => setShowSignUp(!showSignUp)} 
                variant="outline"
                className="w-full"
              >
                {showSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Mismatch State
  if (viewState === 'email_mismatch') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Wrong Account</CardTitle>
            <CardDescription>
              You're signed in as <strong>{user?.email}</strong>, but this invitation was sent to <strong>{invitation?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Invitation for</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                {invitation && getRoleBadge(invitation.role)}
                <span className="text-sm">in {invitation?.organizations.name}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleSignOutAndRedirect} 
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Sign Out & Sign In as {invitation?.email}
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid Invitation State (User authenticated with correct email)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <UserCheck className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{invitation?.organizations.name}</span>
            </div>
            {invitation?.organizations.description && (
              <p className="text-sm text-muted-foreground">
                {invitation.organizations.description}
              </p>
            )}
          </div>

          {/* Invitation Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <div className="flex items-center space-x-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{invitation?.email}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              {invitation && getRoleBadge(invitation.role)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires:</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {invitation && new Date(invitation.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={acceptInvitation} 
              disabled={accepting}
              className="w-full"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting Invitation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationAcceptance;