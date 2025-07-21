import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAILS = ['johan.ras@apginc.ca', 'jorrie.jordaan@apginc.ca'];

export const useAdminAccess = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', user.id)
          .single();

        const hasAdminAccess = profile?.email && ADMIN_EMAILS.includes(profile.email);
        setIsAdmin(hasAdminAccess);
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user]);

  return { isAdmin, loading };
};