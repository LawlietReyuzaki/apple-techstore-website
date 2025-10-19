-- Phase B: Admin Dashboard Database Setup (Fixed)

-- Step 1: Create enum for app roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'customer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles
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
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 4: Create technicians table
CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- Step 5: Add assigned_to column to repairs
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.technicians(id);

-- Step 6: Create repair_notes table
CREATE TABLE IF NOT EXISTS public.repair_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id UUID REFERENCES public.repairs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  note TEXT NOT NULL,
  type TEXT DEFAULT 'note' CHECK (type IN ('note', 'status_change', 'assignment', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.repair_notes ENABLE ROW LEVEL SECURITY;

-- Step 7: Migrate existing role data to user_roles if role column still exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT id, role::app_role
    FROM public.profiles
    WHERE role IS NOT NULL
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Drop all dependent policies
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own repairs" ON public.repairs;
    DROP POLICY IF EXISTS "Users can update own repairs" ON public.repairs;
    
    -- Drop the role column
    ALTER TABLE public.profiles DROP COLUMN role CASCADE;
  END IF;
END $$;

-- Step 8: Drop and recreate all policies to ensure consistency
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 9: User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Step 10: Technicians policies
DROP POLICY IF EXISTS "Admins can manage technicians" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can view self" ON public.technicians;

CREATE POLICY "Admins can manage technicians" ON public.technicians
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians can view self" ON public.technicians
FOR SELECT USING (auth.uid() = user_id);

-- Step 11: Recreate repair policies
DROP POLICY IF EXISTS "Users can view own repairs" ON public.repairs;
DROP POLICY IF EXISTS "Users can create repairs" ON public.repairs;
DROP POLICY IF EXISTS "Admins and assigned techs can update repairs" ON public.repairs;

CREATE POLICY "Users can view own repairs" ON public.repairs
FOR SELECT USING (
  auth.uid() = user_id 
  OR auth.uid() IS NULL
  OR public.has_role(auth.uid(), 'admin')
  OR assigned_to IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create repairs" ON public.repairs
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) 
  OR auth.uid() IS NULL
);

CREATE POLICY "Admins and assigned techs can update repairs" ON public.repairs
FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin')
  OR assigned_to IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);

-- Step 12: Repair notes policies
DROP POLICY IF EXISTS "Users can view notes on own repairs" ON public.repair_notes;
DROP POLICY IF EXISTS "Admins and techs can insert notes" ON public.repair_notes;

CREATE POLICY "Users can view notes on own repairs" ON public.repair_notes
FOR SELECT USING (
  repair_id IN (
    SELECT id FROM public.repairs 
    WHERE user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR assigned_to IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admins and techs can insert notes" ON public.repair_notes
FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR repair_id IN (
    SELECT r.id FROM public.repairs r
    INNER JOIN public.technicians t ON r.assigned_to = t.id
    WHERE t.user_id = auth.uid()
  )
);

-- Step 13: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- Step 14: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON public.technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_repairs_assigned_to ON public.repairs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_repair_notes_repair_id ON public.repair_notes(repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_notes_user_id ON public.repair_notes(user_id);