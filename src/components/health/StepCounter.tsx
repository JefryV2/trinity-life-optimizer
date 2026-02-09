import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Play, Pause, RotateCcw, MapPin, Zap } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { stepCounterService } from '@/services/StepCounterService';
import { supabase } from '@/integrations/supabase/client';

export const StepCounter = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkAvailability();
      loadTodaySteps();
      loadDailyGoal();
    }

    return () => {
      // Cleanup: stop counting when component unmounts
      if (isActive) {
        stepCounterService.stopCounting();
      }
    };
  }, [user]);

  const checkAvailability = async () => {
    const available = await stepCounterService.checkAvailability();
    setIsAvailable(available);
  };

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
      // Load from health profile or use default
      const { data } = await supabase
        .from('user_profiles_health')
        .select('activity_level')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Set goal based on activity level
      if (data?.activity_level) {
        const goals: Record<string, number> = {
          sedentary: 5000,
          light: 7500,
          moderate: 10000,
          active: 12500,
          very_active: 15000
        };
        setDailyGoal(goals[data.activity_level] || 10000);
      }
    } catch (error) {
      console.error('Error loading goal:', error);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const started = await stepCounterService.startCounting((currentSteps, currentDistance) => {
        setSteps(currentSteps);
        setDistance(currentDistance);
      });

      if (started) {
        setIsActive(true);
        setSteps(stepCounterService.getCurrentSteps());
        setDistance(stepCounterService.getCurrentDistance());
      } else {
        alert('Could not start step counter. Please check permissions.');
      }
    } catch (error) {
      console.error('Error starting step counter:', error);
      alert('Error starting step counter. Please check device permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    await stepCounterService.stopCounting();
    setIsActive(false);
    await loadTodaySteps(); // Refresh from database
  };

  const handleReset = async () => {
    if (confirm('Reset step counter for today?')) {
      await stepCounterService.reset();
      setSteps(0);
      setDistance(0);
      setIsActive(false);
    }
  };

  const progress = Math.min((steps / dailyGoal) * 100, 100);
  const distanceKm = (distance / 1000).toFixed(2);
  const caloriesBurned = Math.round(steps * 0.04); // Approximate: 0.04 calories per step

  return (
    <div className="space-y-6">
      {/* Main Step Counter Card */}
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Step Counter
            </CardTitle>
            <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-green-500' : ''}>
              {isActive ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Active
                </span>
              ) : (
                'Inactive'
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step Count Display */}
          <div className="text-center">
            <div className="text-6xl font-bold text-foreground mb-2">
              {steps.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Steps</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{distanceKm} km</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>{caloriesBurned} cal</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Daily Goal</span>
              <span className="font-semibold">{steps.toLocaleString()} / {dailyGoal.toLocaleString()}</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            {!isActive ? (
              <Button
                className="flex-1"
                onClick={handleStart}
                disabled={!isAvailable || loading}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Tracking
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleStop}
              >
                <Pause className="h-4 w-4 mr-2" />
                Stop Tracking
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isActive}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {!isAvailable && (
            <div className="text-xs text-muted-foreground text-center p-3 bg-muted/50 rounded-lg">
              Step counting requires device motion sensors. Works best on mobile devices or devices with accelerometer.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="glass-panel bg-white/60 border border-white/80">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Distance
            </p>
            <p className="text-2xl font-bold text-foreground">{distanceKm}</p>
            <p className="text-xs text-muted-foreground">kilometers</p>
          </CardContent>
        </Card>

        <Card className="glass-panel bg-white/60 border border-white/80">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Calories
            </p>
            <p className="text-2xl font-bold text-foreground">{caloriesBurned}</p>
            <p className="text-xs text-muted-foreground">burned</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="glass-panel bg-orange-50/70 border border-orange-200/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-inner">
              <span className="text-2xl">📱</span>
            </div>
            <div className="text-sm text-orange-900">
              <p className="font-semibold mb-1">How it works</p>
              <p className="text-xs">
                Uses your device's motion sensors (accelerometer) to detect steps and geolocation to calculate distance. 
                Works automatically in the background when tracking is active.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

