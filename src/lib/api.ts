import { supabase } from '@/integrations/supabase/client';

export interface Workshop {
  id: string;
  user_id: string;
  title: string;
  date: string;
  ticket_price: number;
  sheet_url: string | null;
  status: string;
  created_at: string;
}

export interface Registration {
  id: string;
  workshop_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  payment_confirmed: string | null;
  amount_rs: number;
  raw_row_index: number | null;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  workshop_id: string;
  revenue: number;
  meta_spend: number;
  other_costs_total: number;
  profit: number;
  profit_margin: number;
  created_at: string;
}

export interface OtherCost {
  id: string;
  workshop_id: string;
  label: string;
  amount: number;
  created_at: string;
}

// Workshops
export async function getWorkshops() {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data as Workshop[];
}

export async function getWorkshop(id: string) {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data as Workshop | null;
}

export async function createWorkshop(workshop: {
  title: string;
  date: string;
  ticket_price?: number;
  sheet_url?: string;
  user_id: string;
}) {
  const { data, error } = await supabase
    .from('workshops')
    .insert([workshop])
    .select()
    .single();
  
  if (error) throw error;
  return data as Workshop;
}

export async function updateWorkshop(id: string, updates: Partial<Workshop>) {
  const { data, error } = await supabase
    .from('workshops')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Workshop;
}

// Registrations
export async function getRegistrations(workshopId: string) {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('raw_row_index', { ascending: true });
  
  if (error) throw error;
  return data as Registration[];
}

export async function upsertRegistration(registration: {
  workshop_id: string;
  raw_row_index: number;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  payment_confirmed?: string | null;
  amount_rs?: number;
}) {
  const { data, error } = await supabase
    .from('registrations')
    .upsert([registration], {
      onConflict: 'workshop_id,raw_row_index',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Registration;
}

export async function deleteRegistrationsByWorkshop(workshopId: string) {
  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('workshop_id', workshopId);
  
  if (error) throw error;
}

// Financial Snapshots
export async function getFinancialSnapshots(workshopId: string) {
  const { data, error } = await supabase
    .from('financial_snapshots')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as FinancialSnapshot[];
}

export async function createFinancialSnapshot(snapshot: {
  workshop_id: string;
  revenue: number;
  meta_spend: number;
  other_costs_total: number;
  profit: number;
  profit_margin: number;
}) {
  const { data, error } = await supabase
    .from('financial_snapshots')
    .insert([snapshot])
    .select()
    .single();
  
  if (error) throw error;
  return data as FinancialSnapshot;
}

// Other Costs
export async function getOtherCosts(workshopId: string) {
  const { data, error } = await supabase
    .from('other_costs')
    .select('*')
    .eq('workshop_id', workshopId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as OtherCost[];
}

export async function createOtherCost(cost: {
  workshop_id: string;
  label: string;
  amount: number;
}) {
  const { data, error } = await supabase
    .from('other_costs')
    .insert([cost])
    .select()
    .single();
  
  if (error) throw error;
  return data as OtherCost;
}

export async function updateOtherCost(id: string, updates: { label?: string; amount?: number }) {
  const { data, error } = await supabase
    .from('other_costs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as OtherCost;
}

export async function deleteOtherCost(id: string) {
  const { error } = await supabase
    .from('other_costs')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Helper functions
export function isPaid(paymentStatus: string | null): boolean {
  return paymentStatus?.toLowerCase().trim() === 'yes';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('₹', 'Rs ');
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
