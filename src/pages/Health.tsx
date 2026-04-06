
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Moon, 
  Utensils, 
  Dumbbell, 
  Brain, 
  TrendingUp, 
  Plus, 
  Calendar,
  Target,
  Zap,
  Heart,
  BarChart3,
  Settings,
  ArrowLeft,
  User,
  Calculator,
  HeartPulse,
  Flame,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NutritionTracker } from "@/components/health/NutritionTracker";
import { ExerciseTracker } from "@/components/health/ExerciseTracker";
import { SleepTracker } from "@/components/health/SleepTracker";
import { WomensHealth } from "@/components/health/WomensHealth";
import { MentalHealth } from "@/components/health/MentalHealth";
import { HeartTracker } from "@/components/health/HeartTracker";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { calculateCalorieGoal, calculatePersonalizedGoals, getHeartRateStats } from "@/lib/health-utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths } from 'date-fns';

/** Start/end of *local* calendar day as ISO strings for DB timestamp filters. */
function getLocalDayBoundsIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export default function Health() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [userGender, setUserGender] = useState<string | null>(null);
  const [dailyCaloricTarget, setDailyCaloricTarget] = useState(2000);
  const [todaysNutrition, setTodaysNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [todaysExercise, setTodaysExercise] = useState(0);

  const [healthMetrics, setHealthMetrics] = useState([
    { label: 'Sleep Score', value: 0, unit: '/100', icon: Moon, color: 'bg-blue-500', trend: 'No data' },
    { label: 'Energy Level', value: 0, unit: '%', icon: Zap, color: 'bg-yellow-500', trend: '0%' },
    { label: 'Steps Today', value: 0, unit: '', icon: Activity, color: 'bg-green-500', trend: 'No data' }
  ]);

  const quickActions = [
    { label: 'Log Sleep', icon: Moon, action: () => setActiveTab('sleep') },
    { label: 'Track Meal', icon: Utensils, action: () => setActiveTab('nutrition') },
    { label: 'Record Workout', icon: Dumbbell, action: () => setActiveTab('fitness') },
    { label: 'Mood Check', icon: Brain, action: () => setActiveTab('mental-health') },
    { label: 'Heart Rate', icon: HeartPulse, action: () => setActiveTab('heart') }
  ];

  const [todaysGoals, setTodaysGoals] = useState([
    { label: 'Steps', current: 0, target: 10000, unit: '' },
    { label: 'Calories', current: 0, target: 2000, unit: ' cal' },
    { label: 'Exercise', current: 0, target: 30, unit: ' min' }
  ]);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // New state for dashboard metrics
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [sleepTotalHours, setSleepTotalHours] = useState(0);
  const [timeInBed, setTimeInBed] = useState(0);
  const [restfulness, setRestfulness] = useState(0);
  const [restingHeartRate, setRestingHeartRate] = useState<number | null>(null);
  const [cycleStats, setCycleStats] = useState<{
    periodLength: number | null;
    cycleVariation: number | null;
    cycleLength: number | null;
  }>({ periodLength: null, cycleVariation: null, cycleLength: null });
  const [calendarDate, setCalendarDate] = useState(new Date());

  const fetchTodaysData = useCallback(async () => {
    if (!user?.id) return;

    const { startIso, endIso } = getLocalDayBoundsIso();
    const todayLocal = format(new Date(), 'yyyy-MM-dd');

    let nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let stepsToday = 0;
    let totalExercise = 0;

    let calTarget = 2000;
    const { data: profileSnap } = await supabase
      .from('user_profiles_health')
      .select('daily_caloric_target')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileSnap?.daily_caloric_target) {
      calTarget = Number(profileSnap.daily_caloric_target);
      setDailyCaloricTarget(calTarget);
    }

    try {
      const { data: foodData } = await supabase
        .from('food_entries')
        .select('total_calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .gte('consumed_at', startIso)
        .lte('consumed_at', endIso);

      if (foodData?.length) {
        nutrition = foodData.reduce(
          (acc, entry) => ({
            calories: acc.calories + Number(entry.total_calories || 0),
            protein: acc.protein + Number(entry.protein_g || 0),
            carbs: acc.carbs + Number(entry.carbs_g || 0),
            fat: acc.fat + Number(entry.fat_g || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
      }

      setTodaysNutrition(nutrition);

      const { data: stepData } = await supabase
        .from('step_records')
        .select('steps')
        .eq('user_id', user.id)
        .eq('date', todayLocal)
        .maybeSingle();

      stepsToday = stepData?.steps ?? 0;
      setTodaysSteps(stepsToday);

      const { data: exerciseData } = await supabase
        .from('exercise_records')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('completed_at', startIso)
        .lte('completed_at', endIso);

      if (exerciseData?.length) {
        totalExercise = exerciseData.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
        setTodaysExercise(totalExercise);
      } else {
        setTodaysExercise(0);
      }

      // Fetch recent sleep data for sleep score and metrics
      const { data: sleepData } = await supabase
        .from('sleep_records')
        .select('sleep_quality, sleep_duration_hours, bedtime, wake_time')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);
      
      // Calculate sleep metrics
      if (sleepData && sleepData.length > 0) {
        const latestSleep = sleepData[0];
        setSleepTotalHours(latestSleep.sleep_duration_hours || 0);
        
        // Calculate time in bed (difference between bedtime and wake time)
        if (latestSleep.bedtime && latestSleep.wake_time) {
          const bedTime = new Date(latestSleep.bedtime);
          const wakeTime = new Date(latestSleep.wake_time);
          const diffMs = wakeTime.getTime() - bedTime.getTime();
          const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
          setTimeInBed(diffHours);
        } else {
          setTimeInBed(latestSleep.sleep_duration_hours || 0);
        }
        
        // Restfulness = sleep quality * 10 (convert 1-10 to percentage)
        setRestfulness(latestSleep.sleep_quality ? latestSleep.sleep_quality * 10 : 0);
      }

      // Fetch recent mental health for energy level
      const { data: mentalData } = await supabase
        .from('mental_health_logs')
        .select('energy_level')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(7);

      // Calculate metrics from real data
      let sleepScore = 0;
      let energyLevel = 0;

      if (sleepData && sleepData.length > 0) {
        const avgQuality = sleepData.reduce((sum, record) => sum + (record.sleep_quality || 0), 0) / sleepData.length;
        sleepScore = Math.round(avgQuality * 10); // Convert 1-10 scale to 0-100
      }

      if (mentalData && mentalData.length > 0) {
        const avgEnergy = mentalData.reduce((sum, record) => sum + (record.energy_level || 0), 0) / mentalData.length;
        energyLevel = Math.round(avgEnergy * 10); // Convert 1-10 scale to 0-100
      }

      // Update health metrics with real data (use local totals, not stale React state)
      setHealthMetrics([
        { label: 'Sleep Score', value: sleepScore, unit: '/100', icon: Moon, color: 'bg-blue-500', trend: sleepScore > 0 ? 'Good' : 'No data' },
        { label: 'Energy Level', value: energyLevel, unit: '%', icon: Zap, color: 'bg-yellow-500', trend: energyLevel > 0 ? 'Stable' : 'No data' },
        { label: 'Steps Today', value: stepsToday, unit: '', icon: Activity, color: 'bg-green-500', trend: stepsToday > 0 ? 'Active' : 'No data' }
      ]);

      setTodaysGoals([
        { label: 'Steps', current: stepsToday, target: 10000, unit: '' },
        { label: 'Calories', current: Math.round(nutrition.calories), target: calTarget, unit: ' cal' },
        { label: 'Exercise', current: totalExercise, target: 30, unit: ' min' }
      ]);

      // Fetch recent activity
      const activities = [];
      
      if (sleepData && sleepData.length > 0) {
        const latestSleep = sleepData[0];
        activities.push({
          icon: Moon,
          color: 'bg-blue-100 text-blue-600',
          title: 'Sleep logged',
          description: `${latestSleep.sleep_duration_hours}h • Quality: ${latestSleep.sleep_quality}/10`,
          time: 'Today'
        });
      }

      if (foodData && foodData.length > 0) {
        activities.push({
          icon: Utensils,
          color: 'bg-green-100 text-green-600',
          title: 'Meals logged',
          description: `${Math.round(nutrition.calories)} calories consumed`,
          time: 'Today'
        });
      }

      if (exerciseData && exerciseData.length > 0) {
        activities.push({
          icon: Dumbbell,
          color: 'bg-purple-100 text-purple-600',
          title: 'Exercise completed',
          description: `${totalExercise} minutes total`,
          time: 'Today'
        });
      }

      setRecentActivity(activities);
      
      // Keep burn/distance aligned with step widgets across the app.
      const stepDistanceKm = (stepsToday / 1000) * 0.8;
      const stepCaloriesBurned = Math.round(stepsToday * 0.04);
      setCaloriesBurned(stepCaloriesBurned);
      setDistanceCovered(Math.round(stepDistanceKm * 10) / 10);
      
      // Fetch resting heart rate
      try {
        const heartStats = await getHeartRateStats();
        setRestingHeartRate(heartStats.restingHeartRate);
      } catch (error) {
        console.error('Error fetching heart rate:', error);
      }
      
      // Fetch cycle statistics if user is female
      if (userGender === 'female') {
        const { data: cycles } = await supabase
          .from('menstrual_cycles')
          .select('period_length_days, cycle_length_days')
          .eq('user_id', user.id)
          .order('cycle_start_date', { ascending: false })
          .limit(6);
        
        if (cycles && cycles.length > 0) {
          const periodLengths = cycles.filter(c => c.period_length_days).map(c => c.period_length_days!);
          const cycleLengths = cycles.filter(c => c.cycle_length_days).map(c => c.cycle_length_days!);
          
          const avgPeriodLength = periodLengths.length > 0 
            ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
            : null;
          
          const avgCycleLength = cycleLengths.length > 0
            ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
            : null;
          
          // Calculate cycle variation (standard deviation of cycle lengths)
          let cycleVariation = null;
          if (cycleLengths.length >= 2) {
            const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
            const variance = cycleLengths.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cycleLengths.length;
            cycleVariation = Math.round(Math.sqrt(variance));
          }
          
          setCycleStats({
            periodLength: avgPeriodLength,
            cycleVariation,
            cycleLength: avgCycleLength
          });
        }
      }

    } catch (error) {
      console.error('Error fetching today\'s data:', error);
    }
  }, [user, userGender]);

  const fetchUserGender = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles_health')
        .select('gender, daily_caloric_target, height_cm, weight_kg, birth_date, activity_level, goal_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user gender:', error);
        return;
      }

      if (data) {
        setUserGender(data.gender);
        setDailyCaloricTarget(data.daily_caloric_target || 2000);

        const goals = calculateCalorieGoal({
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          gender: data.gender,
          birth_date: data.birth_date,
          activity_level: data.activity_level,
          goal_type: data.goal_type
        });

        setDailyCaloricTarget(goals.calorieGoal);

        try {
          await supabase
            .from('user_profiles_health')
            .update({ daily_caloric_target: goals.calorieGoal })
            .eq('user_id', user.id);
        } catch (updateError) {
          console.error('Error updating caloric target:', updateError);
        }
      }
    } catch (error) {
      console.error('Error fetching user gender:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchUserGender();
  }, [user, fetchUserGender]);

  useEffect(() => {
    if (!user) return;
    const handleProfileUpdate = () => {
      void fetchUserGender().then(() => void fetchTodaysData());
    };
    const handleOverviewDataUpdated = () => {
      void fetchTodaysData();
    };
    window.addEventListener('healthProfileUpdated', handleProfileUpdate);
    window.addEventListener('foodEntriesUpdated', handleOverviewDataUpdated);
    window.addEventListener('healthOverviewDataUpdated', handleOverviewDataUpdated);
    return () => {
      window.removeEventListener('healthProfileUpdated', handleProfileUpdate);
      window.removeEventListener('foodEntriesUpdated', handleOverviewDataUpdated);
      window.removeEventListener('healthOverviewDataUpdated', handleOverviewDataUpdated);
    };
  }, [user, fetchUserGender, fetchTodaysData]);

  useEffect(() => {
    if (activeTab === 'overview' && user) {
      void fetchTodaysData();
    }
  }, [activeTab, user, fetchTodaysData]);

  const renderOverview = () => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = getDay(monthStart);
    
    // Activity icons
    const activities = ['🏃', '💪', '🧘', '🏀', '🏊', '🚴', '⛳', '🐴'];
    
    // Circular progress component for cycle stats
    const CircularProgress = ({ value, max, color, label }: { value: number | null, max: number, color: string, label: string }) => {
      if (value === null) return null;
      const percentage = (value / max) * 100;
      const circumference = 2 * Math.PI * 20;
      const offset = circumference - (percentage / 100) * circumference;
      
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-12 h-12">
            <svg className="transform -rotate-90 w-12 h-12">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={`${color} transition-all duration-500`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold">{value}</span>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground text-center">{label}</span>
        </div>
      );
    };
    
    return (
      <div className="space-y-4 animate-in fade-in duration-500 pb-6">
        {/* Top Row: Intake, burn, distance / cycle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Calories eaten</span>
                <Utensils className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-lg sm:text-xl font-semibold mb-2">
                {Math.round(todaysNutrition.calories)}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / {dailyCaloricTarget} cal
                </span>
              </p>
              <Progress
                value={Math.min(
                  (todaysNutrition.calories / Math.max(dailyCaloricTarget, 1)) * 100,
                  100
                )}
                className="h-2"
              />
            </CardContent>
          </Card>

          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Calories burnt</span>
                <span className="text-lg">🔥</span>
              </div>
              <p className="text-lg sm:text-xl font-semibold">
                {caloriesBurned > 0 ? `${(caloriesBurned / 1000).toFixed(1)}k` : '0'} kCal
              </p>
            </CardContent>
          </Card>
          
          {/* Distance Covered */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Distance Covered</span>
                <span className="text-lg">🏃</span>
              </div>
              <p className="text-lg sm:text-xl font-semibold">{distanceCovered.toFixed(1)} km</p>
            </CardContent>
          </Card>
          
          {/* Cycle Statistics (only for women) */}
          {userGender === 'female' ? (
            <Card className="ios-card p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-0">
                <span className="text-xs text-muted-foreground mb-3 block">Cycle Statistics</span>
                <div className="flex items-center justify-around gap-2">
                  <CircularProgress 
                    value={cycleStats.periodLength} 
                    max={10} 
                    color="text-pink-400" 
                    label="Period Length" 
                  />
                  <CircularProgress 
                    value={cycleStats.cycleVariation} 
                    max={10} 
                    color="text-green-500" 
                    label="Cycle Variation" 
                  />
                  <CircularProgress 
                    value={cycleStats.cycleLength} 
                    max={35} 
                    color="text-purple-400" 
                    label="Cycle Length" 
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="ios-card p-3 sm:p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Activity Score</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-lg sm:text-xl font-semibold">{healthMetrics[2].value}</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Second Row: Calendar and Activity Icons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Calendar */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{format(calendarDate, 'MMMM yyyy')}</h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {daysInMonth.map((day, i) => {
                  const isTodayDate = isToday(day);
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center text-xs rounded-lg ${
                        isTodayDate 
                          ? 'bg-primary text-primary-foreground font-semibold' 
                          : 'text-foreground'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Activity Icons */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <h3 className="text-sm font-semibold mb-3">Activities</h3>
              <div className="grid grid-cols-4 gap-2">
                {activities.map((emoji, i) => (
                  <div
                    key={i}
                    className="aspect-square flex items-center justify-center text-2xl rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Third Row: Sleep Metrics and Heart Rate */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Hours (Sleep) */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Total Hours</span>
                <span className="text-lg">🛏️</span>
              </div>
              <p className="text-base sm:text-lg font-semibold">
                {sleepTotalHours > 0 ? sleepTotalHours.toFixed(1) : '0'} hours
              </p>
            </CardContent>
          </Card>
          
          {/* Time in Bed */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Time in Bed</span>
                <span className="text-lg">🛏️</span>
              </div>
              <p className="text-base sm:text-lg font-semibold">
                {timeInBed > 0 ? timeInBed.toFixed(1) : '0'} hours
              </p>
            </CardContent>
          </Card>
          
          {/* Restfulness */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Restfulness</span>
                <span className="text-lg">🌙</span>
              </div>
              <p className="text-base sm:text-lg font-semibold">{restfulness}%</p>
            </CardContent>
          </Card>
          
          {/* Resting Heart Rate */}
          <Card className="ios-card p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Resting Heart Rate</span>
                <span className="text-lg">❤️</span>
              </div>
              <p className="text-base sm:text-lg font-semibold">
                {restingHeartRate ? `${restingHeartRate} BPM` : '--'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const isWoman = userGender === 'female';
  const tabsCount = isWoman ? 7 : 6;

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] safe-area-top safe-area-bottom ios-scroll">
      {/* iOS-style Header */}
      <div className="ios-header safe-area-left safe-area-right">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-10 w-10 p-0 haptic-light"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="ios-large-title">Health 💚</div>
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMM d')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 safe-area-left safe-area-right" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="mt-0">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="nutrition" className="mt-0">
            <NutritionTracker />
          </TabsContent>

          <TabsContent value="fitness" className="mt-0">
            <ExerciseTracker />
          </TabsContent>

          <TabsContent value="sleep" className="mt-0">
            <SleepTracker />
          </TabsContent>

          <TabsContent value="mental-health" className="mt-0">
            <MentalHealth />
          </TabsContent>

          <TabsContent value="heart" className="mt-0">
            <HeartTracker />
          </TabsContent>

          {isWoman && (
            <TabsContent value="womens-health" className="mt-0">
              <WomensHealth />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Bottom Tab Navigation - Fixed Horizontal Layout */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/30">
        <div className="w-full px-4 py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-12 flex bg-muted/50 rounded-xl p-1 overflow-x-auto">
              <TabsTrigger 
                value="overview" 
                className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="nutrition" 
                className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                Nutrition
              </TabsTrigger>
              <TabsTrigger 
                value="fitness" 
                className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                Fitness
              </TabsTrigger>
              <TabsTrigger 
                value="sleep" 
                className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                Sleep
              </TabsTrigger>
              <TabsTrigger 
                value="mental-health" 
                className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                Mental
              </TabsTrigger>
              <TabsTrigger 
                value="heart" 
                className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                Heart
              </TabsTrigger>
              {isWoman && (
                <TabsTrigger 
                  value="womens-health" 
                  className="flex-1 min-w-0 py-2 px-2 text-xs font-medium transition-all duration-200 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Women's
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
