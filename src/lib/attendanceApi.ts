import { supabase } from '@/integrations/supabase/client';

export interface StaffAttendance {
  id: string;
  user_id: string;
  shift_date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  created_at: string;
}

export interface AttendanceWithProfile extends StaffAttendance {
  profiles?: {
    email: string | null;
  };
}

export async function getActiveShift(userId: string) {
  const { data, error } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('user_id', userId)
    .is('clock_out_time', null)
    .order('clock_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as StaffAttendance | null;
}

export async function clockIn(userId: string) {
  const { data, error } = await supabase
    .from('staff_attendance')
    .insert([{
      user_id: userId,
      shift_date: new Date().toISOString().split('T')[0],
      clock_in_time: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data as StaffAttendance;
}

export async function clockOut(attendanceId: string) {
  const { data, error } = await supabase
    .from('staff_attendance')
    .update({ clock_out_time: new Date().toISOString() })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) throw error;
  return data as StaffAttendance;
}

export async function getAllAttendance(): Promise<AttendanceWithProfile[]> {
  const { data: attendance, error } = await supabase
    .from('staff_attendance')
    .select('*')
    .order('shift_date', { ascending: false })
    .order('clock_in_time', { ascending: false });

  if (error) throw error;
  
  // Fetch profiles for each unique user
  const userIds = [...new Set(attendance.map(a => a.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds);
  
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  
  return attendance.map(a => ({
    ...a,
    profiles: profileMap.get(a.user_id) || { email: null },
  }));
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateHours(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return 'Active';
  
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}
