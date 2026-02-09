import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import {
  Bell,
  Brain,
  Flame,
  LineChart,
  User,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { HeartHero } from "@/components/heart/HeartHero";
import { EcgRecorderCard } from "@/components/heart/EcgRecorderCard";
import { WeeklySummaryCard } from "@/components/heart/WeeklySummaryCard";
import { PillarOverview } from "@/components/trinity/PillarOverview";
import { UvIndexWidget } from "@/components/health/UvIndexWidget";
import { HydrationWidget } from "@/components/health/HydrationWidget";
import { StepCounterWidget } from "@/components/health/StepCounterWidget";
import { AirQualityWidget } from "@/components/health/AirQualityWidget";
import { Activity, DollarSign, Heart as HeartIcon } from "lucide-react";
import { StressMonitorWidget } from "@/components/health/StressMonitorWidget";

interface Insight {
  emoji: string;
  title: string;
  description: string;
  action: string;
  pillar: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [healthScore, setHealthScore] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthTrend, setHealthTrend] = useState("0%");
  const [heartRate, setHeartRate] = useState(95);
  const [heartVariability, setHeartVariability] = useState(86);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [stepsToday, setStepsToday] = useState(0);
  const [stressLevel, setStressLevel] = useState<"Low" | "Medium" | "High">("Low");
  const [stressScore, setStressScore] = useState(0);
  const [wealthScore, setWealthScore] = useState(0);
  const [relationsScore, setRelationsScore] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [exerciseMinutes, setExerciseMinutes] = useState(0);
  const [nutritionCalories, setNutritionCalories] = useState(0);

  const fetchUserData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: sleepData } = await supabase
        .from("sleep_records")
        .select("sleep_quality, sleep_duration_hours")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(7);

      const { data: exerciseData } = await supabase
        .from("exercise_records")
        .select("duration_minutes, calories_burned")
        .eq("user_id", user?.id)
        .gte(
          "completed_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("completed_at", { ascending: false });

      // Fetch today's exercise for calories
      const { data: todayExerciseData } = await supabase
        .from("exercise_records")
        .select("calories_burned")
        .eq("user_id", user?.id)
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);

      // Fetch today's steps
      const { data: stepData } = await supabase
        .from("step_records")
        .select("steps")
        .eq("user_id", user?.id)
        .eq("date", today)
        .maybeSingle();

      // Fetch today's nutrition
      const { data: foodData } = await supabase
        .from("food_entries")
        .select("total_calories")
        .eq("user_id", user?.id)
        .gte("consumed_at", `${today}T00:00:00`)
        .lte("consumed_at", `${today}T23:59:59`);

      const { data: mentalHealthData } = await supabase
        .from("mental_health_logs")
        .select("mood_rating, stress_level, energy_level")
        .eq("user_id", user?.id)
        .order("logged_at", { ascending: false })
        .limit(7);

      let calculatedHealthScore = 0;
      let avgSleepDuration = 0;
      let hasSleepData = false;
      let avgStressValue = 0;
      let hasStressData = false;
      let localWealthScore = 0;
      let localRelationsScore = 0;

      if (sleepData && sleepData.length > 0) {
        const avgSleepQuality =
          sleepData.reduce(
            (sum, record) => sum + (record.sleep_quality || 0),
            0,
          ) / sleepData.length;
        avgSleepDuration =
          sleepData.reduce(
            (sum, record) => sum + (record.sleep_duration_hours || 0),
            0,
          ) / sleepData.length;
        hasSleepData = true;
        calculatedHealthScore +=
          avgSleepQuality * 5 + (avgSleepDuration >= 7 ? 25 : avgSleepDuration * 3);
      }

      if (exerciseData && exerciseData.length > 0) {
        const totalExercise = exerciseData.reduce(
          (sum, record) => sum + (record.duration_minutes || 0),
          0,
        );
        calculatedHealthScore += Math.min(totalExercise / 5, 35);
      }

      if (mentalHealthData && mentalHealthData.length > 0) {
        const avgMood =
          mentalHealthData.reduce(
            (sum, record) => sum + (record.mood_rating || 0),
            0,
          ) / mentalHealthData.length;
        const avgStress =
          mentalHealthData.reduce(
            (sum, record) => sum + (record.stress_level || 0),
            0,
          ) / mentalHealthData.length;
        avgStressValue = avgStress;
        hasStressData = true;
        calculatedHealthScore += avgMood * 3 - avgStress;
      }

      setHealthScore(
        Math.min(Math.max(Math.round(calculatedHealthScore), 0), 100),
      );

      const oneWeekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data: previousWeekData } = await supabase
        .from("sleep_records")
        .select("sleep_quality")
        .eq("user_id", user?.id)
        .lt("created_at", oneWeekAgo)
        .order("created_at", { ascending: false })
        .limit(7);

      if (
        previousWeekData &&
        previousWeekData.length > 0 &&
        sleepData &&
        sleepData.length > 0
      ) {
        const prevAvgQuality =
          previousWeekData.reduce(
            (sum, record) => sum + (record.sleep_quality || 0),
            0,
          ) / previousWeekData.length;
        const currentAvgQuality =
          sleepData.reduce(
            (sum, record) => sum + (record.sleep_quality || 0),
            0,
          ) / sleepData.length;
        const trendChange = ((currentAvgQuality - prevAvgQuality) / prevAvgQuality) * 100;
        setHealthTrend(
          trendChange > 0
            ? `+${trendChange.toFixed(1)}%`
            : `${trendChange.toFixed(1)}%`,
        );
      } else {
        setHealthTrend("0%");
      }

      const newInsights = [];

      if (sleepData && sleepData.length > 0) {
        const avgSleep =
          sleepData.reduce(
            (sum, record) => sum + (record.sleep_duration_hours || 0),
            0,
          ) / sleepData.length;
        if (avgSleep < 7) {
          newInsights.push({
            emoji: "💤",
            title: "Sleep Optimization",
            description: `Increase sleep by ${(7 - avgSleep).toFixed(1)}h for better recovery`,
            action: "Improve",
            pillar: "health",
          });
        }
      } else {
        newInsights.push({
          emoji: "💤",
          title: "Start Sleep Tracking",
          description: "Begin tracking your sleep for better health insights",
          action: "Track Sleep",
          pillar: "health",
        });
      }

      if (exerciseData && exerciseData.length < 3) {
        newInsights.push({
          emoji: "💪",
          title: "Exercise Frequency",
          description: "Add more workouts to reach weekly goals",
          action: "Exercise",
          pillar: "health",
        });
      } else if (!exerciseData || exerciseData.length === 0) {
        newInsights.push({
          emoji: "💪",
          title: "Start Exercise Tracking",
          description: "Begin logging workouts to build healthy habits",
          action: "Start Tracking",
          pillar: "health",
        });
      }

      if (calculatedHealthScore > 0) {
        newInsights.push({
          emoji: "🎯",
          title: "Great Start!",
          description: "You're building healthy habits. Keep it up!",
          action: "Continue",
          pillar: "health",
        });
      }

      setInsights(newInsights);

      // Calculate calories burned today
      if (todayExerciseData && todayExerciseData.length > 0) {
        const totalCalories = todayExerciseData.reduce(
          (sum, record) => sum + (Number(record.calories_burned) || 0),
          0,
        );
        setCaloriesBurned(Math.round(totalCalories));
      }

      // Set today's steps
      if (stepData) {
        setStepsToday(stepData.steps || 0);
      }

      // Calculate today's nutrition
      if (foodData && foodData.length > 0) {
        const totalCalories = foodData.reduce(
          (sum, entry) => sum + (Number(entry.total_calories) || 0),
          0,
        );
        setNutritionCalories(Math.round(totalCalories));
      }

      // Calculate average sleep hours
      if (sleepData && sleepData.length > 0) {
        const avgSleep = sleepData.reduce(
          (sum, record) => sum + (record.sleep_duration_hours || 0),
          0,
        ) / sleepData.length;
        setSleepHours(Math.round(avgSleep * 10) / 10);
      }

      // Calculate total exercise minutes this week
      if (exerciseData && exerciseData.length > 0) {
        const totalMinutes = exerciseData.reduce(
          (sum, record) => sum + (record.duration_minutes || 0),
          0,
        );
        setExerciseMinutes(totalMinutes);
      }

      // Calculate wealth score
      const { data: wealthScores } = await supabase
        .from('wealth_daily_scores')
        .select('score')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(1);
      
      if (wealthScores && wealthScores.length > 0) {
        localWealthScore = wealthScores[0].score || 0;
        setWealthScore(localWealthScore);
      } else {
        // Calculate based on financial data if no score exists
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user?.id)
          .gte('occurred_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()); // Current month
        
        if (transactions && transactions.length > 0) {
          const monthlyIncome = transactions
            .filter(t => t.direction === 'in')
            .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
          
          const monthlyExpenses = transactions
            .filter(t => t.direction === 'out')
            .reduce((sum, t) => sum + parseFloat(String(t.amount || '0')), 0);
          
          const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
          const wealthScore = Math.min(Math.max(savingsRate, 0), 100);
          localWealthScore = wealthScore;
          setWealthScore(wealthScore);
        }
      }

      // Calculate relations score
      const { data: relationsScores } = await supabase
        .from('relations_daily_scores')
        .select('score')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(1);
      
      if (relationsScores && relationsScores.length > 0) {
        localRelationsScore = relationsScores[0].score || 0;
        setRelationsScore(localRelationsScore);
      } else {
        // Calculate based on relationship data if no score exists
        const { data: interactions } = await supabase
          .from('interactions')
          .select('*')
          .eq('user_id', user?.id)
          .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days
        
        if (interactions && interactions.length > 0) {
          const avgMood = interactions
            .reduce((sum, i) => sum + (i.mood_rating || 0), 0) / interactions.length;
          const relationsScore = Math.min(Math.max(Math.round(avgMood * 10), 0), 100);
          localRelationsScore = relationsScore;
          setRelationsScore(relationsScore);
        }
      }

      // Calculate an aggregate stress score combining all pillars
      let combinedStressIndex = 0;

      if (hasStressData) {
        // Mental stress (scaled to 0-70)
        combinedStressIndex += avgStressValue * 7;
      }

      if (hasSleepData) {
        // Sleep debt: how far below 7h you are
        const sleepDebt = Math.max(0, 7 - avgSleepDuration);
        combinedStressIndex += sleepDebt * 6; // up to ~18
      }

      if (localWealthScore > 0) {
        // Financial strain if wealth score is low
        combinedStressIndex += Math.max(0, 70 - localWealthScore) * 0.3;
      }

      if (localRelationsScore > 0) {
        // Relationship strain if relations score is low
        combinedStressIndex += Math.max(0, 75 - localRelationsScore) * 0.35;
      }

      const normalizedStress = Math.min(
        100,
        Math.max(0, Math.round(combinedStressIndex)),
      );
      setStressScore(normalizedStress);

      if (normalizedStress >= 66) {
        setStressLevel("High");
      } else if (normalizedStress >= 33) {
        setStressLevel("Medium");
      } else {
        setStressLevel("Low");
      }

      // Calculate heart rate based on health score
      setHeartRate(95 + Math.round((calculatedHealthScore - 50) / 10));
      setHeartVariability(82 + Math.round(Math.random() * 6));
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user, fetchUserData]);

  const miniStats = [
    {
      label: "Recovery",
      value: healthTrend,
      icon: LineChart,
      subtitle: "vs last week",
    },
    {
      label: "Energy",
      value: healthScore > 0 ? `${healthScore}%` : "—",
      icon: Zap,
      subtitle: "readiness",
    },
    {
      label: "Burn",
      value: caloriesBurned > 0 ? `${caloriesBurned} cal` : "0 cal",
      icon: Flame,
      subtitle: "today",
    },
  ];

  const pillars = [
    {
      id: "health",
      title: "Health",
      emoji: "💚",
      icon: Activity,
      score: healthScore,
      trend: healthTrend,
      color: "text-green-600",
      gradient: "health-gradient",
      metrics: [
        { label: "Sleep", value: sleepHours, unit: "h avg" },
        { label: "Exercise", value: exerciseMinutes, unit: " min/week" },
        { label: "Steps", value: stepsToday.toLocaleString(), unit: " today" },
        { label: "Nutrition", value: nutritionCalories, unit: " cal" },
      ],
      backendStatus: "connected" as const,
      backendInfo: [
        "sleep_records",
        "exercise_records",
        "food_entries",
        "step_records",
        "mental_health_logs",
        "user_profiles_health",
      ],
    },
    {
      id: "wealth",
      title: "Wealth",
      emoji: "💎",
      icon: DollarSign,
      score: wealthScore,
      trend: "0%",
      color: "text-blue-600",
      gradient: "wealth-gradient",
      metrics: [
        { label: "Net Worth", value: "$0", unit: "" },
        { label: "Savings Rate", value: "0", unit: "%" },
      ],
      backendStatus: "connected" as const,
      backendInfo: [
        "finance_accounts",
        "transactions",
        "budgets",
        "investments",
        "wealth_daily_scores"
      ],
    },
    {
      id: "relations",
      title: "Relations",
      emoji: "🤝",
      icon: HeartIcon,
      score: relationsScore,
      trend: "0%",
      color: "text-purple-600",
      gradient: "relations-gradient",
      metrics: [
        { label: "Connections", value: "0", unit: "" },
        { label: "Quality Time", value: "0", unit: " hrs/week" },
      ],
      backendStatus: "connected" as const,
      backendInfo: [
        "relationships",
        "interactions",
        "gratitude_entries",
        "quality_time_goals",
        "relations_daily_scores"
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] safe-area-top safe-area-bottom" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <header className="pt-10 pb-6 px-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            TrinityOS
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Trinity Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full glass-panel h-11 w-11"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full glass-panel h-11 w-11"
            onClick={() => navigate("/profile")}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-6 space-y-6 safe-area-left safe-area-right">
        <HeartHero
          bpm={heartRate}
          hrv={heartVariability}
          status={healthTrend}
          name={user?.user_metadata?.full_name || "Emma"}
        />

        {/* Top Health Widgets - Enhanced Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AirQualityWidget />
          <UvIndexWidget />
        </div>

        {/* Step Counter & Hydration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StepCounterWidget />
          <HydrationWidget />
        </div>

        {/* Cross‑pillar stress monitor */}
        <StressMonitorWidget
          score={stressScore}
          level={stressLevel}
          healthScore={healthScore}
          wealthScore={wealthScore}
          relationsScore={relationsScore}
        />

        <div className="grid grid-cols-3 gap-3">
          {miniStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-panel p-3 rounded-3xl text-center space-y-1"
              >
                <div className="flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {stat.value}
                </p>
                <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-[0.6rem] text-muted-foreground">
                  {stat.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        <EcgRecorderCard bpm={heartRate} />

        <WeeklySummaryCard
          bpm={heartRate}
          max={240}
          min={60}
          avgVariability={heartVariability + 6}
          hrvData={[60, 72, 88, 92, 70, 82, 65, 80]}
          stressLevel={stressLevel}
        />

        <PillarOverview pillars={pillars} />

        <section className="glass-panel p-6 space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Daily insights
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                Coach recommendations
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-full"
                onClick={() => navigate("/insights")}
              >
                Open Insights Lab
              </Button>
            </div>
          </header>
          {insights.length > 0 && (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <article
                  key={index}
                  className="flex items-center gap-3 bg-white/70 rounded-2xl p-3 border border-white/60"
                >
                  <div className="text-2xl">{insight.emoji}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {insight.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => {
                      if (insight.pillar === "health") {
                        navigate("/health");
                      } else if (insight.pillar === "wealth") {
                        navigate("/wealth");
                      } else if (insight.pillar === "relations") {
                        navigate("/relations");
                      }
                    }}
                  >
                    {insight.action}
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Navigation />
    </div>
  );
};

export default Index;