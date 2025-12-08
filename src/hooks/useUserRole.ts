import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'manager' | 'employee' | null;

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching role:', error);
          setRole('employee'); // Default to employee on error
        } else {
          setRole(data?.role as UserRole || 'employee');
        }
      } catch (err) {
        console.error('Error:', err);
        setRole('employee');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  return { role, loading: authLoading || loading, isManager: role === 'manager', isEmployee: role === 'employee' };
}
