-- Create repairs table for repair ticket management
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tracking_code TEXT UNIQUE NOT NULL,
  device_make TEXT NOT NULL,
  device_model TEXT NOT NULL,
  issue TEXT NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'created',
  estimated_cost INTEGER,
  final_cost INTEGER,
  assigned_to UUID,
  notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Users can view their own repairs
CREATE POLICY "Users can view own repairs"
  ON public.repairs
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Users can create their own repairs
CREATE POLICY "Users can create repairs"
  ON public.repairs
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own repairs (for approval/notes)
CREATE POLICY "Users can update own repairs"
  ON public.repairs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_repairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_repairs_timestamp
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_repairs_updated_at();

-- Create index for faster queries
CREATE INDEX idx_repairs_user_id ON public.repairs(user_id);
CREATE INDEX idx_repairs_status ON public.repairs(status);
CREATE INDEX idx_repairs_tracking_code ON public.repairs(tracking_code);