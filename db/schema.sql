-- Trinity schema for plain Postgres (Neon, Railway, RDS).
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql
-- Includes a minimal auth shim so RLS works without Supabase/Nhost.

-- Minimal, Supabase-compatible auth schema.
--
-- The app's migrations are plain Postgres except for two things: they reference
-- `auth.users` (foreign keys + the signup trigger) and call `auth.uid()` in
-- every RLS policy. Hosts that already provide those (Nhost, Supabase) skip
-- this file; plain Postgres (Neon, Railway, RDS) runs it first.
--
-- `auth.uid()` reads the request-scoped JWT claim that your API layer sets:
--   select set_config('request.jwt.claim.sub', '<user-uuid>', true);
-- This is the same convention PostgREST/Hasura use, so RLS keeps working
-- unchanged when you swap the host.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create or replace function auth.email()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;

grant usage on schema auth to public;
grant select, insert, update, delete on auth.users to public;

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  tier TEXT DEFAULT 'Free' CHECK (tier IN ('Free', 'Premium', 'Advanced', 'Elite')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create tables for comprehensive health tracking

-- Sleep tracking table
CREATE TABLE public.sleep_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bedtime TIMESTAMP WITH TIME ZONE,
  wake_time TIMESTAMP WITH TIME ZONE,
  sleep_duration_hours DECIMAL(4,2),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Diet and nutrition tracking
CREATE TABLE public.user_profiles_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  target_weight_kg DECIMAL(5,2),
  goal_type TEXT CHECK (goal_type IN ('lose', 'gain', 'maintain')) DEFAULT 'maintain',
  daily_caloric_target INTEGER,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')) DEFAULT 'moderate',
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Food intake tracking
CREATE TABLE public.food_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  calories_per_serving DECIMAL(7,2),
  servings DECIMAL(5,2) DEFAULT 1,
  total_calories DECIMAL(7,2),
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  fiber_g DECIMAL(6,2),
  sugar_g DECIMAL(6,2),
  sodium_mg DECIMAL(8,2),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exercise tracking
CREATE TABLE public.exercise_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_type TEXT CHECK (exercise_type IN ('cardio', 'strength', 'flexibility', 'sports')),
  exercise_name TEXT NOT NULL,
  duration_minutes INTEGER,
  calories_burned DECIMAL(6,2),
  intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high')),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily step tracking
CREATE TABLE public.step_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  steps INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Female health tracking
CREATE TABLE public.menstrual_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE,
  cycle_length_days INTEGER,
  period_length_days INTEGER,
  flow_intensity TEXT CHECK (flow_intensity IN ('light', 'moderate', 'heavy')),
  symptoms TEXT[], -- Array of symptoms
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mental health tracking
CREATE TABLE public.mental_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  sleep_quality_rating INTEGER CHECK (sleep_quality_rating >= 1 AND sleep_quality_rating <= 10),
  physical_symptoms TEXT[],
  thoughts TEXT,
  activities TEXT[],
  triggers TEXT[],
  coping_strategies TEXT[],
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Health goals and reminders
CREATE TABLE public.health_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_type TEXT CHECK (goal_type IN ('sleep', 'diet', 'exercise', 'mental_health', 'female_health')),
  title TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2) DEFAULT 0,
  unit TEXT,
  target_date DATE,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications and reminders
CREATE TABLE public.health_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('bedtime', 'caffeine_cutoff', 'screen_time', 'meal', 'exercise', 'medication', 'checkup')),
  title TEXT NOT NULL,
  message TEXT,
  scheduled_time TIME,
  days_of_week INTEGER[], -- Array of integers 0-6 (Sunday-Saturday)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menstrual_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mental_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- Sleep records policies
CREATE POLICY "Users can view their own sleep records" ON public.sleep_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sleep records" ON public.sleep_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sleep records" ON public.sleep_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sleep records" ON public.sleep_records FOR DELETE USING (auth.uid() = user_id);

-- Health profiles policies
CREATE POLICY "Users can view their own health profile" ON public.user_profiles_health FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health profile" ON public.user_profiles_health FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health profile" ON public.user_profiles_health FOR UPDATE USING (auth.uid() = user_id);

-- Food entries policies
CREATE POLICY "Users can view their own food entries" ON public.food_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own food entries" ON public.food_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own food entries" ON public.food_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own food entries" ON public.food_entries FOR DELETE USING (auth.uid() = user_id);

-- Exercise records policies
CREATE POLICY "Users can view their own exercise records" ON public.exercise_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exercise records" ON public.exercise_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise records" ON public.exercise_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercise records" ON public.exercise_records FOR DELETE USING (auth.uid() = user_id);

-- Step records policies
CREATE POLICY "Users can view their own step records" ON public.step_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own step records" ON public.step_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own step records" ON public.step_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own step records" ON public.step_records FOR DELETE USING (auth.uid() = user_id);

-- Menstrual cycles policies
CREATE POLICY "Users can view their own menstrual cycles" ON public.menstrual_cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own menstrual cycles" ON public.menstrual_cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own menstrual cycles" ON public.menstrual_cycles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own menstrual cycles" ON public.menstrual_cycles FOR DELETE USING (auth.uid() = user_id);

-- Mental health logs policies
CREATE POLICY "Users can view their own mental health logs" ON public.mental_health_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own mental health logs" ON public.mental_health_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mental health logs" ON public.mental_health_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mental health logs" ON public.mental_health_logs FOR DELETE USING (auth.uid() = user_id);

-- Health goals policies
CREATE POLICY "Users can view their own health goals" ON public.health_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health goals" ON public.health_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health goals" ON public.health_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health goals" ON public.health_goals FOR DELETE USING (auth.uid() = user_id);

-- Health reminders policies
CREATE POLICY "Users can view their own health reminders" ON public.health_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own health reminders" ON public.health_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health reminders" ON public.health_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own health reminders" ON public.health_reminders FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_sleep_records_updated_at BEFORE UPDATE ON public.sleep_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_profiles_health_updated_at BEFORE UPDATE ON public.user_profiles_health FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menstrual_cycles_updated_at BEFORE UPDATE ON public.menstrual_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_health_goals_updated_at BEFORE UPDATE ON public.health_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_health_reminders_updated_at BEFORE UPDATE ON public.health_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wealth tables
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text check (type in ('cash','checking','savings','brokerage','retirement','credit','loan','other')) default 'checking',
  balance numeric(14,2) default 0,
  currency text default 'USD',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.finance_accounts(id) on delete set null,
  amount numeric(14,2) not null,
  category text,
  direction text check (direction in ('in','out')) not null default 'out',
  occurred_at timestamp with time zone not null default now(),
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  period text check (period in ('monthly','weekly','yearly')) default 'monthly',
  limit_amount numeric(14,2) not null,
  spent_amount numeric(14,2) default 0,
  period_start date not null default current_date,
  period_end date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null,
  units numeric(14,4) default 0,
  avg_cost numeric(14,4) default 0,
  market_value numeric(14,2) default 0,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

-- Relations tables
create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation_type text,
  importance integer check (importance between 1 and 5) default 3,
  last_contact_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id uuid references public.relationships(id) on delete cascade,
  channel text check (channel in ('call','text','video','in_person','email','other')) default 'other',
  duration_minutes integer default 0,
  mood_rating integer check (mood_rating between 1 and 10),
  occurred_at timestamp with time zone not null default now(),
  notes text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.quality_time_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_minutes_per_week integer not null default 120,
  completed_minutes integer not null default 0,
  period_start date not null default current_date,
  period_end date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- RLS
alter table public.finance_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.investments enable row level security;
alter table public.relationships enable row level security;
alter table public.interactions enable row level security;
alter table public.gratitude_entries enable row level security;
alter table public.quality_time_goals enable row level security;

-- Policies: owner-only access
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'finance_accounts',
    'transactions',
    'budgets',
    'investments',
    'relationships',
    'interactions',
    'gratitude_entries',
    'quality_time_goals'
  ])
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)',
      tbl || '_select', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      tbl || '_insert', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id)',
      tbl || '_update', tbl);
  end loop;
end$$;

-- Useful indexes
create index if not exists idx_transactions_user_date on public.transactions(user_id, occurred_at desc);
create index if not exists idx_interactions_user_date on public.interactions(user_id, occurred_at desc);
create index if not exists idx_relationships_user_last_contact on public.relationships(user_id, last_contact_at desc);
create index if not exists idx_budgets_user_period on public.budgets(user_id, period_start, period_end);

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
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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

-- Create tables for daily progress tracking
CREATE TABLE IF NOT EXISTS public.health_daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.wealth_daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.relations_daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create tables for daily goal progress
CREATE TABLE IF NOT EXISTS public.health_goals_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.wealth_goals_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.relations_goals_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.health_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_goals_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_goals_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations_goals_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own health daily scores" ON public.health_daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health daily scores" ON public.health_daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health daily scores" ON public.health_daily_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own wealth daily scores" ON public.wealth_daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wealth daily scores" ON public.wealth_daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wealth daily scores" ON public.wealth_daily_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own relations daily scores" ON public.relations_daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own relations daily scores" ON public.relations_daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relations daily scores" ON public.relations_daily_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own health goals progress" ON public.health_goals_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health goals progress" ON public.health_goals_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health goals progress" ON public.health_goals_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own wealth goals progress" ON public.wealth_goals_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wealth goals progress" ON public.wealth_goals_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wealth goals progress" ON public.wealth_goals_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own relations goals progress" ON public.relations_goals_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own relations goals progress" ON public.relations_goals_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relations goals progress" ON public.relations_goals_progress FOR UPDATE USING (auth.uid() = user_id);

-- Add daily_step_goal column to user_profiles_health table

ALTER TABLE public.user_profiles_health
ADD COLUMN IF NOT EXISTS daily_step_goal INTEGER DEFAULT 10000 CHECK (daily_step_goal > 0 AND daily_step_goal <= 100000);

-- Add comment
COMMENT ON COLUMN public.user_profiles_health.daily_step_goal IS 'Daily step goal for the user (default: 10000)';

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

-- Idempotent: creates daily score + goals-progress tables if they are missing
-- (fixes PGRST205: health_goals_progress / wealth_goals_progress / relations_goals_progress)

CREATE TABLE IF NOT EXISTS public.health_daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.wealth_daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.relations_daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.health_goals_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.wealth_goals_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.relations_goals_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  completed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.health_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_goals_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_goals_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relations_goals_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own health daily scores" ON public.health_daily_scores;
DROP POLICY IF EXISTS "Users can insert their own health daily scores" ON public.health_daily_scores;
DROP POLICY IF EXISTS "Users can update their own health daily scores" ON public.health_daily_scores;
CREATE POLICY "Users can view their own health daily scores" ON public.health_daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health daily scores" ON public.health_daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health daily scores" ON public.health_daily_scores FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own wealth daily scores" ON public.wealth_daily_scores;
DROP POLICY IF EXISTS "Users can insert their own wealth daily scores" ON public.wealth_daily_scores;
DROP POLICY IF EXISTS "Users can update their own wealth daily scores" ON public.wealth_daily_scores;
CREATE POLICY "Users can view their own wealth daily scores" ON public.wealth_daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wealth daily scores" ON public.wealth_daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wealth daily scores" ON public.wealth_daily_scores FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own relations daily scores" ON public.relations_daily_scores;
DROP POLICY IF EXISTS "Users can insert their own relations daily scores" ON public.relations_daily_scores;
DROP POLICY IF EXISTS "Users can update their own relations daily scores" ON public.relations_daily_scores;
CREATE POLICY "Users can view their own relations daily scores" ON public.relations_daily_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own relations daily scores" ON public.relations_daily_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relations daily scores" ON public.relations_daily_scores FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own health goals progress" ON public.health_goals_progress;
DROP POLICY IF EXISTS "Users can insert their own health goals progress" ON public.health_goals_progress;
DROP POLICY IF EXISTS "Users can update their own health goals progress" ON public.health_goals_progress;
CREATE POLICY "Users can view their own health goals progress" ON public.health_goals_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health goals progress" ON public.health_goals_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health goals progress" ON public.health_goals_progress FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own wealth goals progress" ON public.wealth_goals_progress;
DROP POLICY IF EXISTS "Users can insert their own wealth goals progress" ON public.wealth_goals_progress;
DROP POLICY IF EXISTS "Users can update their own wealth goals progress" ON public.wealth_goals_progress;
CREATE POLICY "Users can view their own wealth goals progress" ON public.wealth_goals_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wealth goals progress" ON public.wealth_goals_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wealth goals progress" ON public.wealth_goals_progress FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own relations goals progress" ON public.relations_goals_progress;
DROP POLICY IF EXISTS "Users can insert their own relations goals progress" ON public.relations_goals_progress;
DROP POLICY IF EXISTS "Users can update their own relations goals progress" ON public.relations_goals_progress;
CREATE POLICY "Users can view their own relations goals progress" ON public.relations_goals_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own relations goals progress" ON public.relations_goals_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relations goals progress" ON public.relations_goals_progress FOR UPDATE USING (auth.uid() = user_id);

-- Optional metadata for meal logging (MealCreator uses notes JSON; search can set fdc_id)

ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS fdc_id INTEGER;

COMMENT ON COLUMN public.food_entries.notes IS 'Free text or JSON extras (e.g. micronutrients from meal builder)';
COMMENT ON COLUMN public.food_entries.fdc_id IS 'USDA FoodData Central fdcId when logged from food search';

-- Weekly experiments + daily score snapshots
--
-- A snapshot is one row per user per day: the score and the raw inputs that
-- produced it. Experiments are evaluated against these rows, so the verdict can
-- be recomputed later instead of being stored as a claim.

create table if not exists public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  total integer not null check (total between 0 and 100),
  health integer not null check (health between 0 and 100),
  wealth integer not null check (wealth between 0 and 100),
  bonds integer not null check (bonds between 0 and 100),
  sleep_hours numeric,
  steps integer,
  water_ml integer,
  exercise_min integer,
  savings_rate numeric,
  interactions integer,
  mood numeric,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists score_snapshots_user_date_idx
  on public.score_snapshots (user_id, date desc);

alter table public.score_snapshots enable row level security;

drop policy if exists "score snapshots are private" on public.score_snapshots;
create policy "score snapshots are private"
  on public.score_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lever text not null,
  target_label text not null,
  started_on date not null default current_date,
  ends_on date not null,
  status text not null default 'running' check (status in ('running', 'done', 'abandoned')),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiments_user_status_idx
  on public.experiments (user_id, status);

alter table public.experiments enable row level security;

drop policy if exists "experiments are private" on public.experiments;
create policy "experiments are private"
  on public.experiments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Net worth history
-- score_snapshots already stores one row per user per day; net worth just needs
-- a column so the wealth screen can draw a trend instead of a single number.

alter table public.score_snapshots
  add column if not exists net_worth numeric;

comment on column public.score_snapshots.net_worth is
  'Cash + investments at the time the day was captured.';
