-- Create table for heart rate data from wearables
CREATE TABLE IF NOT EXISTS public.heart_rate_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  heart_rate INTEGER NOT NULL, -- BPM (beats per minute)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source_device TEXT DEFAULT 'unknown', -- e.g., 'apple_watch', 'fitbit', 'garmin', etc.
  activity_type TEXT DEFAULT 'general' CHECK (activity_type IN ('resting', 'walking', 'running', 'cycling', 'swimming', 'sleeping', 'general', 'workout')),
  confidence INTEGER DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100), -- Confidence level of the reading
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add resting heart rate to user profiles health table
ALTER TABLE public.user_profiles_health 
ADD COLUMN IF NOT EXISTS resting_heart_rate INTEGER;

-- Enable Row Level Security
ALTER TABLE public.heart_rate_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for heart rate data
CREATE POLICY "Users can view their own heart rate data" ON public.heart_rate_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own heart rate data" ON public.heart_rate_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own heart rate data" ON public.heart_rate_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own heart rate data" ON public.heart_rate_data FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_heart_rate_data_user_timestamp ON public.heart_rate_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heart_rate_data_activity_type ON public.heart_rate_data(activity_type);