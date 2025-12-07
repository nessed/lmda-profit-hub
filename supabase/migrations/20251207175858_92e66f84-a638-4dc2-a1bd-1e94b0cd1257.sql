-- Create workshops table
CREATE TABLE public.workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  ticket_price NUMERIC DEFAULT 0,
  sheet_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'running', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  payment_confirmed TEXT DEFAULT 'Pending',
  amount_rs NUMERIC DEFAULT 0,
  raw_row_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workshop_id, raw_row_index)
);

-- Create financial_snapshots table
CREATE TABLE public.financial_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  revenue NUMERIC DEFAULT 0,
  meta_spend NUMERIC DEFAULT 0,
  other_costs_total NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  profit_margin NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create other_costs table
CREATE TABLE public.other_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workshops (users can only access their own workshops)
CREATE POLICY "Users can view their own workshops" 
ON public.workshops FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workshops" 
ON public.workshops FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workshops" 
ON public.workshops FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workshops" 
ON public.workshops FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for registrations (via workshop ownership)
CREATE POLICY "Users can view registrations of their workshops" 
ON public.registrations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = registrations.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can create registrations for their workshops" 
ON public.registrations FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = registrations.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can update registrations of their workshops" 
ON public.registrations FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = registrations.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can delete registrations of their workshops" 
ON public.registrations FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = registrations.workshop_id 
  AND workshops.user_id = auth.uid()
));

-- RLS Policies for financial_snapshots
CREATE POLICY "Users can view snapshots of their workshops" 
ON public.financial_snapshots FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = financial_snapshots.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can create snapshots for their workshops" 
ON public.financial_snapshots FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = financial_snapshots.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can delete snapshots of their workshops" 
ON public.financial_snapshots FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = financial_snapshots.workshop_id 
  AND workshops.user_id = auth.uid()
));

-- RLS Policies for other_costs
CREATE POLICY "Users can view costs of their workshops" 
ON public.other_costs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = other_costs.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can create costs for their workshops" 
ON public.other_costs FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = other_costs.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can update costs of their workshops" 
ON public.other_costs FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = other_costs.workshop_id 
  AND workshops.user_id = auth.uid()
));

CREATE POLICY "Users can delete costs of their workshops" 
ON public.other_costs FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workshops 
  WHERE workshops.id = other_costs.workshop_id 
  AND workshops.user_id = auth.uid()
));