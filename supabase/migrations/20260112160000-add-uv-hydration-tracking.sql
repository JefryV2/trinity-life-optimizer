-- Create tables for UV index and hydration tracking

-- UV Index tracking table
CREATE TABLE IF NOT EXISTS public.uv_index_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  uv_index DECIMAL(3,1) NOT NULL CHECK (uv_index >= 0 AND uv_index <= 15),
  location TEXT,
  exposure_duration_minutes INTEGER DEFAULT 0,
  protection_used BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Hydration tracking table
CREATE TABLE IF NOT EXISTS public.hydration_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  water_intake_ml INTEGER NOT NULL DEFAULT 0 CHECK (water_intake_ml >= 0),
  target_ml INTEGER DEFAULT 2000 CHECK (target_ml >= 0),
  cups_consumed INTEGER DEFAULT 0 CHECK (cups_consumed >= 0),
  last_drink_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.uv_index_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for UV index records
CREATE POLICY "Users can view their own UV index records" ON public.uv_index_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own UV index records" ON public.uv_index_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own UV index records" ON public.uv_index_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own UV index records" ON public.uv_index_records FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for hydration records
CREATE POLICY "Users can view their own hydration records" ON public.hydration_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own hydration records" ON public.hydration_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own hydration records" ON public.hydration_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own hydration records" ON public.hydration_records FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uv_index_user_date ON public.uv_index_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_hydration_user_date ON public.hydration_records(user_id, date);