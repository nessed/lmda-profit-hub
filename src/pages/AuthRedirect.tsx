import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export default function AuthRedirect() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }

    if (role === 'manager') {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/employee/setup', { replace: true });
    }
  }, [user, role, authLoading, roleLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
