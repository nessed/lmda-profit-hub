-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('manager', 'employee');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  UNIQUE (user_id, role)
);

-- Create staff_attendance table
CREATE TABLE public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

-- Staff attendance policies
CREATE POLICY "Employees can insert own attendance" ON public.staff_attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own attendance" ON public.staff_attendance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Employees can view own attendance" ON public.staff_attendance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all attendance" ON public.staff_attendance
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

-- Update workshops policies for role-based access
DROP POLICY IF EXISTS "Users can view their own workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can create their own workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can update their own workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can delete their own workshops" ON public.workshops;

CREATE POLICY "Managers can view all workshops" ON public.workshops
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view own workshops" ON public.workshops
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create workshops" ON public.workshops
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own workshops" ON public.workshops
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Managers can update all workshops" ON public.workshops
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete workshops" ON public.workshops
  FOR DELETE USING (public.has_role(auth.uid(), 'manager'));

-- Update financial_snapshots policies - managers only
DROP POLICY IF EXISTS "Users can view snapshots of their workshops" ON public.financial_snapshots;
DROP POLICY IF EXISTS "Users can create snapshots for their workshops" ON public.financial_snapshots;
DROP POLICY IF EXISTS "Users can delete snapshots of their workshops" ON public.financial_snapshots;

CREATE POLICY "Managers can view all snapshots" ON public.financial_snapshots
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can create snapshots" ON public.financial_snapshots
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete snapshots" ON public.financial_snapshots
  FOR DELETE USING (public.has_role(auth.uid(), 'manager'));

-- Update registrations policies
DROP POLICY IF EXISTS "Users can view registrations of their workshops" ON public.registrations;
DROP POLICY IF EXISTS "Users can create registrations for their workshops" ON public.registrations;
DROP POLICY IF EXISTS "Users can update registrations of their workshops" ON public.registrations;
DROP POLICY IF EXISTS "Users can delete registrations of their workshops" ON public.registrations;

CREATE POLICY "Managers can view all registrations" ON public.registrations
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Anyone can create registrations" ON public.registrations
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM workshops WHERE workshops.id = registrations.workshop_id AND workshops.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update registrations" ON public.registrations
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete registrations" ON public.registrations
  FOR DELETE USING (public.has_role(auth.uid(), 'manager'));

-- Update other_costs policies - managers only
DROP POLICY IF EXISTS "Users can view costs of their workshops" ON public.other_costs;
DROP POLICY IF EXISTS "Users can create costs for their workshops" ON public.other_costs;
DROP POLICY IF EXISTS "Users can update costs of their workshops" ON public.other_costs;
DROP POLICY IF EXISTS "Users can delete costs of their workshops" ON public.other_costs;

CREATE POLICY "Managers can view all costs" ON public.other_costs
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can create costs" ON public.other_costs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update costs" ON public.other_costs
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete costs" ON public.other_costs
  FOR DELETE USING (public.has_role(auth.uid(), 'manager'));

-- Trigger to create profile and default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();