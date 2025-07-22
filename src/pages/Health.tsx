
import { useState, useEffect } from "react";
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
  User
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NutritionTracker } from "@/components/health/NutritionTracker";
import { ExerciseTracker } from "@/components/health/ExerciseTracker";
import { SleepTracker } from "@/components/health/SleepTracker";
import { WomensHealth } from "@/components/health/WomensHealth";
import { MentalHealth } from "@/components/health/MentalHealth";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

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
    { label: 'Mood Check', icon: Brain, action: () => setActiveTab('mental-health') }
  ];

  const [todaysGoals, setTodaysGoals] = useState([
    { label: 'Steps', current: 0, target: 10000, unit: '' },
    { label: 'Calories', current: 0, target: 2000, unit: ' cal' },
    { label: 'Exercise', current: 0, target: 30, unit: ' min' }
  ]);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserGender();
      
      // Listen for health profile updates
      const handleProfileUpdate = () => {
        fetchUserGender();
      };
      
      window.addEventListener('healthProfileUpdated', handleProfileUpdate);
      
      return () => {
        window.removeEventListener('healthProfileUpdated', handleProfileUpdate);
      };
    }
  }, [user]);

  const fetchUserGender = async () => {
    try {
      // Fetch user gender and health profile data
      const { data, error } = await supabase
        .from('user_profiles_health')
        .select('gender, daily_caloric_target')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user gender:', error);
        return;
      }
      
      if (data) {
        setUserGender(data.gender);
        setDailyCaloricTarget(data.daily_caloric_target || 2000);
      }
      
      // Fetch today's data
      await fetchTodaysData();
    } catch (error) {
      console.error('Error fetching user gender:', error);
    }
  };

  const fetchTodaysData = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Fetch today's nutrition
      const { data: foodData } = await supabase
        .from('food_entries')
        .select('total_calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user?.id)
        .gte('consumed_at', `${today}T00:00:00`)
        .lte('consumed_at', `${today}T23:59:59`);

      if (foodData) {
        const nutrition = foodData.reduce((acc, entry) => ({
          calories: acc.calories + (entry.total_calories || 0),
          protein: acc.protein + (entry.protein_g || 0),
          carbs: acc.carbs + (entry.carbs_g || 0),
          fat: acc.fat + (entry.fat_g || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        setTodaysNutrition(nutrition);
      }

      // Fetch today's steps
      const { data: stepData } = await supabase
        .from('step_records')
        .select('steps')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();

      if (stepData) {
        setTodaysSteps(stepData.steps);
      }

      // Fetch today's exercise
      const { data: exerciseData } = await supabase
        .from('exercise_records')
        .select('duration_minutes')
        .eq('user_id', user?.id)
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      if (exerciseData) {
        const totalExercise = exerciseData.reduce((sum, record) => sum + (record.duration_minutes || 0), 0);
        setTodaysExercise(totalExercise);
      }

      // Fetch recent sleep data for sleep score
      const { data: sleepData } = await supabase
        .from('sleep_records')
        .select('sleep_quality, sleep_duration_hours')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(7);

      // Fetch recent mental health for energy level
      const { data: mentalData } = await supabase
        .from('mental_health_logs')
        .select('energy_level')
        .eq('user_id', user?.id)
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

      // Update health metrics with real data
      setHealthMetrics([
        { label: 'Sleep Score', value: sleepScore, unit: '/100', icon: Moon, color: 'bg-blue-500', trend: sleepScore > 0 ? 'Good' : 'No data' },
        { label: 'Energy Level', value: energyLevel, unit: '%', icon: Zap, color: 'bg-yellow-500', trend: energyLevel > 0 ? 'Stable' : 'No data' },
        { label: 'Steps Today', value: todaysSteps, unit: '', icon: Activity, color: 'bg-green-500', trend: todaysSteps > 0 ? 'Active' : 'No data' }
      ]);

      // Update today's goals with real data
      setTodaysGoals([
        { label: 'Steps', current: todaysSteps, target: 10000, unit: '' },
        { label: 'Calories', current: Math.round(todaysNutrition.calories), target: dailyCaloricTarget, unit: ' cal' },
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

    } catch (error) {
      console.error('Error fetching today\'s data:', error);
    }
  };

  // Refetch user gender when returning to overview tab
  useEffect(() => {
    if (activeTab === 'overview' && user) {
      fetchUserGender();
    }
  }, [activeTab, user]);

  const renderOverview = () => {
    const overallScore = 0;
    
    return (
    <div className="space-y-6">
      {/* Daily Score */}
      <Card className="health-gradient text-white overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Today's Health Score</p>
              <h2 className="text-4xl font-bold">0</h2>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-white/90">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Start tracking</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Begin your journey</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/80">
              <span>0%</span>
            </div>
            <Progress value={0} className="h-2 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {healthMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="metric-card haptic-light">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${metric.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs text-green-600 font-medium">{metric.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-lg font-bold">
                  {metric.value.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Goals */}
      <Card className="ios-card">
        <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Today's Goals</h3>
          <Target className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {todaysGoals.map((goal, index) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-2">
                  <span>{goal.label}</span>
                  <span>{goal.current.toLocaleString()}/{goal.target.toLocaleString()}{goal.unit}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="ios-card">
        <CardContent className="p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="ios-button-secondary haptic-medium h-16 flex-col gap-2"
                onClick={action.action}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            );
          })}
        </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="ios-card">
          <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className={`w-10 h-10 rounded-xl ${activity.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              );
            })}
          </div>
          </CardContent>
        </Card>
      )}
    </div>
    );
  };

  const isWoman = userGender === 'female';
  const tabsCount = isWoman ? 6 : 5;

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom ios-scroll">
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
              <p className="text-sm text-muted-foreground">Sunday, Dec 15</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-10 w-10 p-0 haptic-light">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 safe-area-left safe-area-right pb-32">
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
