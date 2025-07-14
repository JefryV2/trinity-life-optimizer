import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Plus, Activity, Timer, Target } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface ExerciseRecord {
  id: string;
  exercise_type: string;
  exercise_name: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: string;
  notes: string;
  completed_at: string;
}

interface StepRecord {
  id: string;
  steps: number;
  date: string;
}

export function ExerciseTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exerciseRecords, setExerciseRecords] = useState<ExerciseRecord[]>([]);
  const [todaySteps, setTodaySteps] = useState<StepRecord | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [intensity, setIntensity] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [steps, setSteps] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const weeklyExerciseGoal = 150; // WHO recommended minutes per week

  useEffect(() => {
    if (user) {
      fetchWeeklyExerciseRecords();
      fetchTodaySteps();
    }
  }, [user]);

  const fetchWeeklyExerciseRecords = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('exercise_records')
        .select('*')
        .gte('completed_at', oneWeekAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setExerciseRecords(data || []);
    } catch (error) {
      console.error('Error fetching exercise records:', error);
    }
  };

  const fetchTodaySteps = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('step_records')
        .select('*')
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodaySteps(data);
    } catch (error) {
      console.error('Error fetching step records:', error);
    }
  };

  const addExerciseRecord = async () => {
    if (!user || !exerciseName || !exerciseType || !duration || !intensity) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('exercise_records')
        .insert({
          user_id: user.id,
          exercise_name: exerciseName,
          exercise_type: exerciseType,
          duration_minutes: Number(duration),
          calories_burned: Number(calories) || 0,
          intensity,
          notes,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Exercise logged successfully",
        description: `${exerciseName} - ${duration} minutes`
      });

      // Reset form
      setExerciseName('');
      setExerciseType('');
      setDuration('');
      setCalories('');
      setIntensity('');
      setNotes('');
      
      fetchWeeklyExerciseRecords();
    } catch (error) {
      console.error('Error adding exercise record:', error);
      toast({
        title: "Error logging exercise",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSteps = async () => {
    if (!user || !steps) return;

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('step_records')
        .upsert({
          user_id: user.id,
          steps: Number(steps),
          date: today
        });

      if (error) throw error;

      toast({
        title: "Steps updated successfully",
        description: `${steps} steps recorded for today`
      });

      setSteps('');
      fetchTodaySteps();
    } catch (error) {
      console.error('Error updating steps:', error);
      toast({
        title: "Error updating steps",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWeeklyExerciseMinutes = () => {
    return exerciseRecords.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
  };

  const getWeeklyCaloriesBurned = () => {
    return exerciseRecords.reduce((sum, record) => sum + (record.calories_burned || 0), 0);
  };

  const getExerciseProgress = () => {
    const weeklyMinutes = getWeeklyExerciseMinutes();
    return Math.min((weeklyMinutes / weeklyExerciseGoal) * 100, 100);
  };

  const getStepProgress = () => {
    const dailyStepGoal = 10000;
    if (!todaySteps) return 0;
    return Math.min((todaySteps.steps / dailyStepGoal) * 100, 100);
  };

  return (
    <div className="space-y-6 px-4 pb-6">
      {/* Log Exercise Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            Log Exercise
          </CardTitle>
          <CardDescription className="text-sm">Record your workout sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Exercise Name */}
          <div className="space-y-2">
            <Label htmlFor="exercise-name" className="text-sm font-medium">Exercise Name</Label>
            <Input
              id="exercise-name"
              placeholder="e.g., Push-ups, Running, Yoga"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Type and Intensity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exercise-type" className="text-sm font-medium">Type</Label>
              <Select value={exerciseType} onValueChange={setExerciseType}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardio">🏃 Cardio</SelectItem>
                  <SelectItem value="strength">💪 Strength</SelectItem>
                  <SelectItem value="flexibility">🧘 Flexibility</SelectItem>
                  <SelectItem value="sports">⚽ Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intensity" className="text-sm font-medium">Intensity</Label>
              <Select value={intensity} onValueChange={setIntensity}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select intensity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="moderate">🟡 Moderate</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration and Calories */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-12 text-center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories" className="text-sm font-medium">Calories (optional)</Label>
              <Input
                id="calories"
                type="number"
                placeholder="300"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="h-12 text-center"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How did the workout feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Log Button */}
          <Button 
            onClick={addExerciseRecord} 
            disabled={!exerciseName || !exerciseType || !duration || !intensity || isLoading}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Log Exercise
          </Button>
        </CardContent>
      </Card>

      {/* Daily Steps Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            Daily Steps
          </CardTitle>
          <CardDescription className="text-sm">Track your daily step count</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Steps Display */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <div className="text-4xl font-bold text-primary">
              {todaySteps?.steps.toLocaleString() || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">steps today</p>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Daily Goal Progress</span>
              <span className="font-medium">{todaySteps?.steps || 0}/10,000</span>
            </div>
            <Progress value={getStepProgress()} className="h-3" />
          </div>

          {/* Update Steps */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="steps" className="text-sm font-medium">Update Steps</Label>
              <Input
                id="steps"
                type="number"
                placeholder="8432"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="h-12 text-center text-lg"
              />
            </div>

            <Button 
              onClick={updateSteps} 
              disabled={!steps || isLoading}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              <Activity className="h-5 w-5 mr-2" />
              Update Steps
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly Goal Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Weekly Exercise Goal</span>
              <span className="font-medium">{getWeeklyExerciseMinutes()}/{weeklyExerciseGoal} min</span>
            </div>
            <Progress value={getExerciseProgress()} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{getWeeklyExerciseMinutes()}</div>
              <p className="text-xs text-muted-foreground mt-1">Minutes</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{exerciseRecords.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Workouts</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{Math.round(getWeeklyCaloriesBurned())}</div>
              <p className="text-xs text-muted-foreground mt-1">Calories</p>
            </div>
          </div>

          {/* Recent Workouts */}
          {exerciseRecords.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Recent Workouts</h4>
              {exerciseRecords.slice(0, 3).map((record) => (
                <div key={record.id} className="flex justify-between items-center p-3 bg-card border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{record.exercise_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {record.exercise_type} • {record.intensity} intensity
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="px-3 py-1 font-medium">
                      {record.duration_minutes} min
                    </Badge>
                    {record.calories_burned > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {record.calories_burned} cal
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}