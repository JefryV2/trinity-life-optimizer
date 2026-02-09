import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Zap, Settings, Activity } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { stepCounterService } from '@/services/StepCounterService';
import { supabase } from '@/integrations/supabase/client';
import { CircularProgress } from '@/components/ui/circular-progress';

export const StepCounterWidget = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [isTracking, setIsTracking] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('10000');

  useEffect(() => {
    if (user) {
      loadTodaySteps();
      loadDailyGoal();
      // Auto-start tracking (will reuse existing if already running)
      startAutoTracking();
    }
  }, [user]);

  // Auto-start tracking when app loads (even before user is authenticated)
  useEffect(() => {
    // Try to auto-start once
    stepCounterService.autoStart();
  }, []);

  const loadTodaySteps = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('step_records')
        .select('steps')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading steps:', error);
        return;
      }

      if (data) {
        setSteps(data.steps || 0);
      }
    } catch (error) {
      console.error('Error loading steps:', error);
    }
  };

  const loadDailyGoal = async () => {
    try {
      // Try to load from user_profiles_health first
      const { data: profileData } = await supabase
        .from('user_profiles_health')
        .select('daily_step_goal, activity_level')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileData?.daily_step_goal) {
        setDailyGoal(profileData.daily_step_goal);
        setTempGoal(profileData.daily_step_goal.toString());
        return;
      }

      // Fallback to activity level based goals
      if (profileData?.activity_level) {
        const goals: Record<string, number> = {
          sedentary: 5000,
          light: 7500,
          moderate: 10000,
          active: 12500,
          very_active: 15000
        };
        const goal = goals[profileData.activity_level] || 10000;
        setDailyGoal(goal);
        setTempGoal(goal.toString());
      }
    } catch (error) {
      console.error('Error loading goal:', error);
    }
  };

  const saveDailyGoal = async (newGoal: number) => {
    try {
      if (!user) return;

      // Update user_profiles_health with daily_step_goal
      const { error } = await supabase
        .from('user_profiles_health')
        .upsert({
          user_id: user.id,
          daily_step_goal: newGoal,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving goal:', error);
        return;
      }

      setDailyGoal(newGoal);
      setIsEditingGoal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleGoalSubmit = () => {
    const goal = parseInt(tempGoal);
    if (goal && goal > 0 && goal <= 100000) {
      saveDailyGoal(goal);
    }
  };

  const startAutoTracking = async () => {
    try {
      // Check if already tracking
      if (stepCounterService.isActive()) {
        setIsTracking(true);
        // Update current values
        setSteps(stepCounterService.getCurrentSteps());
        setDistance(stepCounterService.getCurrentDistance());
        return;
      }

      // Start tracking with callback
      const started = await stepCounterService.startCounting((currentSteps, currentDistance) => {
        setSteps(currentSteps);
        setDistance(currentDistance);
      });

      if (started) {
        setIsTracking(true);
        setSteps(stepCounterService.getCurrentSteps());
        setDistance(stepCounterService.getCurrentDistance());
      }
    } catch (error) {
      console.error('Error starting auto-tracking:', error);
    }
  };

  // Update display periodically even if service is running
  useEffect(() => {
    const interval = setInterval(() => {
      if (stepCounterService.isActive()) {
        setSteps(stepCounterService.getCurrentSteps());
        setDistance(stepCounterService.getCurrentDistance());
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const progress = Math.min((steps / dailyGoal) * 100, 100);
  const distanceKm = (distance / 1000).toFixed(2);
  const caloriesBurned = Math.round(steps * 0.04);
  const stepsRemaining = Math.max(0, dailyGoal - steps);

  return (
    <Card className="glass-panel bg-white/70 border border-white/60">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Steps Today</h3>
              <p className="text-xs text-muted-foreground">
                {isTracking ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Tracking
                  </span>
                ) : (
                  'Starting...'
                )}
              </p>
            </div>
          </div>
          
          {/* Goal Edit Button */}
          <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-white/60"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Set Daily Step Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Daily Goal (steps)
                  </label>
                  <Input
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    placeholder="10000"
                    min="1000"
                    max="100000"
                    step="500"
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 5,000 - 15,000 steps per day
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGoalSubmit}
                    className="flex-1"
                  >
                    Save Goal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingGoal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Circular Progress */}
        <div className="flex items-center justify-center mb-6">
          <CircularProgress
            value={progress}
            size={160}
            strokeWidth={10}
            className="relative"
            trackClassName="text-muted/20"
            indicatorClassName="text-blue-500"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {steps.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                of {dailyGoal.toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-blue-600 mt-1">
                {Math.round(progress)}%
              </div>
            </div>
          </CircularProgress>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/60 rounded-xl p-3 border border-white/40 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Distance</p>
            </div>
            <p className="text-lg font-bold text-foreground">{distanceKm}</p>
            <p className="text-[10px] text-muted-foreground">km</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 border border-white/40 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Calories</p>
            </div>
            <p className="text-lg font-bold text-foreground">{caloriesBurned}</p>
            <p className="text-[10px] text-muted-foreground">burned</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 border border-white/40 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Remaining</p>
            <p className="text-lg font-bold text-foreground">{stepsRemaining.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">steps</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
