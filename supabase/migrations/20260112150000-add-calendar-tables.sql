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