-- Create table for daily women's health tracking (symptoms, mood, flow)
-- This allows tracking daily data separately from cycle periods

CREATE TABLE IF NOT EXISTS public.womens_health_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  flow_intensity TEXT CHECK (flow_intensity IN ('light', 'moderate', 'heavy')),
  moods TEXT[], -- Array of mood IDs (calm, happy, anxious, etc.)
  symptoms TEXT[], -- Array of symptom IDs
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_womens_health_daily_logs_user_date ON public.womens_health_daily_logs(user_id, date DESC);

-- Enable RLS
ALTER TABLE public.womens_health_daily_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily logs" 
  ON public.womens_health_daily_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily logs" 
  ON public.womens_health_daily_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily logs" 
  ON public.womens_health_daily_logs FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily logs" 
  ON public.womens_health_daily_logs FOR DELETE 
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_womens_health_daily_logs_updated_at
  BEFORE UPDATE ON public.womens_health_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

