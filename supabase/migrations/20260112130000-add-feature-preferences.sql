-- Add feature preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_preferences JSONB DEFAULT '{}';

-- Update RLS policy to allow users to update their preferences
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();