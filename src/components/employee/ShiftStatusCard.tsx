import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveShift, clockIn, clockOut, formatTime, StaffAttendance } from '@/lib/attendanceApi';
import { useToast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShiftStatusCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeShift, setActiveShift] = useState<StaffAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (user) {
      loadShift();
    }
  }, [user]);

  async function loadShift() {
    try {
      const shift = await getActiveShift(user!.id);
      setActiveShift(shift);
    } catch (error) {
      console.error('Error loading shift:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockIn() {
    setActing(true);
    try {
      const shift = await clockIn(user!.id);
      setActiveShift(shift);
      toast({ title: 'Clocked in successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to clock in', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setActing(false);
    }
  }

  async function handleClockOut() {
    if (!activeShift) return;
    
    setActing(true);
    try {
      await clockOut(activeShift.id);
      setActiveShift(null);
      toast({ title: 'Clocked out successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to clock out', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
        <div className="h-12 bg-muted rounded" />
      </div>
    );
  }

  const isOnShift = !!activeShift;

  return (
    <div className={cn(
      "rounded-xl p-6 border-2 transition-all",
      isOnShift 
        ? "bg-success/5 border-success/30" 
        : "bg-card border-border"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <Clock className={cn(
          "h-5 w-5",
          isOnShift ? "text-success" : "text-muted-foreground"
        )} />
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Shift Status
        </span>
      </div>

      {isOnShift ? (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-foreground">On Duty</p>
            <p className="text-sm text-muted-foreground">
              Since {formatTime(activeShift.clock_in_time)}
            </p>
          </div>
          <Button
            onClick={handleClockOut}
            disabled={acting}
            variant="destructive"
            size="lg"
            className="w-full min-h-[52px] text-lg font-semibold"
          >
            <LogOut className="h-5 w-5 mr-2" />
            {acting ? 'Clocking Out...' : 'CLOCK OUT'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-muted-foreground">Off Duty</p>
            <p className="text-sm text-muted-foreground">
              Start your shift when ready
            </p>
          </div>
          <Button
            onClick={handleClockIn}
            disabled={acting}
            size="lg"
            className="w-full min-h-[52px] text-lg font-semibold bg-success hover:bg-success/90"
          >
            <LogIn className="h-5 w-5 mr-2" />
            {acting ? 'Clocking In...' : 'CLOCK IN'}
          </Button>
        </div>
      )}
    </div>
  );
}
