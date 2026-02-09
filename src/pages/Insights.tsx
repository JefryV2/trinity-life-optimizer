import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import * as Recharts from "recharts";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LineChart, Moon, Brain, Activity, Sparkles } from "lucide-react";

interface DayMetrics {
  date: string;
  sleepHours?: number;
  mood?: number;
  steps?: number;
  calories?: number;
  painLevel?: number;
  stress?: number;
  energy?: number;
  relationsScore?: number;
  wealthScore?: number;
}

interface CorrelationResult {
  label: string;
  description: string;
  value: number | null;
}

function friendlyCorrelationText(label: string, value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "Not enough data yet to say if there is a clear relationship.";
  }

  const abs = Math.abs(value);
  const direction =
    value > 0 ? "move in the same direction" : "move in opposite directions";

  let strength = "";
  if (abs >= 0.7) strength = "a very strong tendency to ";
  else if (abs >= 0.4) strength = "a clear tendency to ";
  else if (abs >= 0.2) strength = "a slight tendency to ";
  else
    return "There is almost no consistent pattern here — other factors probably matter more.";

  switch (label) {
    case "Sleep ↔ Mood":
      return `${strength}show that on nights when you sleep more, your mood the next day tends to be better.`;
    case "Sleep ↔ Steps":
      return `${strength}show that better‑sleep nights are usually followed by more (or fewer) steps the next day.`;
    case "Steps ↔ Mood":
      return `${strength}show that on days when you move more, your mood tends to be different too.`;
    case "Stress ↔ Mood":
      return value < 0
        ? `${strength}show that on higher‑stress days your mood tends to be lower.`
        : `${strength}show that on higher‑stress days your mood also tends to be higher (this might reflect \"good\" performance stress).`;
    default:
      return `${strength}${direction}.`;
  }
}

function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

export default function Insights() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [days, setDays] = useState<DayMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const timeSeriesData = useMemo(
    () =>
      days.map((d) => {
        const dateObj = new Date(d.date);
        const label = dateObj.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        return {
          date: d.date,
          dateLabel: label,
          sleep: d.sleepHours ?? null,
          mood: d.mood ?? null,
          stepsK:
            typeof d.steps === "number"
              ? Number((d.steps / 1000).toFixed(1))
              : null,
        };
      }),
    [days]
  );

  const scatterData = useMemo(
    () =>
      days
        .filter(
          (d) =>
            typeof d.sleepHours === "number" && typeof d.mood === "number"
        )
        .map((d) => ({
          dateLabel: new Date(d.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          sleep: d.sleepHours as number,
          mood: d.mood as number,
        })),
    [days]
  );

  const lineChartConfig: ChartConfig = {
    sleep: {
      label: "Sleep (h)",
      color: "hsl(160 84% 39%)",
    },
    mood: {
      label: "Mood (1–10)",
      color: "hsl(262 83% 58%)",
    },
    stepsK: {
      label: "Steps (k)",
      color: "hsl(24 96% 60%)",
    },
  };

  const scatterConfig: ChartConfig = {
    point: {
      label: "Day",
      color: "hsl(280 80% 60%)",
    },
  };

  const stressChartConfig: ChartConfig = {
    stress: {
      label: "Stress (1–10)",
      color: "hsl(0 84% 60%)",
    },
    moodStress: {
      label: "Mood (1–10)",
      color: "hsl(262 83% 58%)",
    },
  };

  const foodChartConfig: ChartConfig = {
    calories: {
      label: "Calories",
      color: "hsl(24 96% 60%)",
    },
    moodFood: {
      label: "Mood (1–10)",
      color: "hsl(262 83% 58%)",
    },
  };

  const womensChartConfig: ChartConfig = {
    pain: {
      label: "Pain level",
      color: "hsl(340 82% 60%)",
    },
    moodWomens: {
      label: "Mood (1–10)",
      color: "hsl(262 83% 58%)",
    },
  };

  const relationsChartConfig: ChartConfig = {
    relations: {
      label: "Relations score",
      color: "hsl(200 90% 55%)",
    },
    moodRelations: {
      label: "Mood (1–10)",
      color: "hsl(262 83% 58%)",
    },
  };

  const systemRadarConfig: ChartConfig = {
    system: {
      label: "System balance",
      color: "hsl(220 90% 55%)",
    },
  };

  const foodSeries = useMemo(
    () =>
      days
        .filter(
          (d) =>
            typeof d.calories === "number" && typeof d.mood === "number"
        )
        .map((d) => ({
          dateLabel: new Date(d.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          calories: d.calories as number,
          moodFood: d.mood as number,
        })),
    [days]
  );

  const stressSeries = useMemo(
    () =>
      days
        .filter(
          (d) =>
            typeof d.stress === "number" && typeof d.mood === "number"
        )
        .map((d) => ({
          dateLabel: new Date(d.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          stress: d.stress as number,
          moodStress: d.mood as number,
        })),
    [days]
  );

  const womensSeries = useMemo(
    () =>
      days
        .filter(
          (d) =>
            typeof d.painLevel === "number" && typeof d.mood === "number"
        )
        .map((d) => ({
          dateLabel: new Date(d.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          pain: d.painLevel as number,
          moodWomens: d.mood as number,
        })),
    [days]
  );

  const relationsSeries = useMemo(
    () =>
      days
        .filter(
          (d) =>
            typeof d.relationsScore === "number" && typeof d.mood === "number"
        )
        .map((d) => ({
          dateLabel: new Date(d.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          relations: d.relationsScore as number,
          moodRelations: d.mood as number,
        })),
    [days]
  );

  const systemRadarData = useMemo(() => {
    if (days.length === 0) return [];

    const collectAvg = (getter: (d: DayMetrics) => number | null) => {
      const values = days
        .map(getter)
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) return null;
      const sum = values.reduce((a, b) => a + b, 0);
      return sum / values.length;
    };

    const avgSleep = collectAvg((d) =>
      typeof d.sleepHours === "number" ? d.sleepHours : null,
    );
    const avgSteps = collectAvg((d) =>
      typeof d.steps === "number" ? d.steps : null,
    );
    const avgCalories = collectAvg((d) =>
      typeof d.calories === "number" ? d.calories : null,
    );
    const avgStress = collectAvg((d) =>
      typeof d.stress === "number" ? d.stress : null,
    );
    const avgRelations = collectAvg((d) =>
      typeof d.relationsScore === "number" ? d.relationsScore : null,
    );
    const avgWealth = collectAvg((d) =>
      typeof d.wealthScore === "number" ? d.wealthScore : null,
    );

    const data: { dimension: string; value: number }[] = [];

    if (avgSleep !== null) {
      // 4.5h -> 0, 9h -> 100
      const v = Math.max(4.5, Math.min(9, avgSleep));
      data.push({
        dimension: "Sleep",
        value: Math.round(((v - 4.5) / (9 - 4.5)) * 100),
      });
    }

    if (avgSteps !== null) {
      // 0 -> 0, 12000+ -> 100
      const v = Math.max(0, Math.min(12000, avgSteps));
      data.push({
        dimension: "Movement",
        value: Math.round((v / 12000) * 100),
      });
    }

    if (avgCalories !== null) {
      // Best around 2000; farther away reduces score
      const diff = Math.abs(avgCalories - 2000);
      const penalty = Math.min(100, (diff / 1000) * 50);
      data.push({
        dimension: "Nutrition",
        value: Math.round(100 - penalty),
      });
    }

    if (avgStress !== null) {
      // 1 -> 100 (low stress), 10 -> 0 (high stress)
      const v = Math.max(1, Math.min(10, avgStress));
      data.push({
        dimension: "Stress load",
        value: Math.round(100 - (v / 10) * 100),
      });
    }

    if (avgWealth !== null) {
      data.push({
        dimension: "Wealth",
        value: Math.round(Math.max(0, Math.min(100, avgWealth))),
      });
    }

    if (avgRelations !== null) {
      data.push({
        dimension: "Relations",
        value: Math.round(Math.max(0, Math.min(100, avgRelations))),
      });
    }

    return data;
  }, [days]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const since = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sinceIso = since.toISOString();
        const sinceDate = since.toISOString().split("T")[0];

        const [
          { data: sleepData },
          { data: moodData },
          { data: stepData },
          { data: foodData },
          { data: womensData },
          { data: relationsScores },
          { data: wealthScores },
        ] = await Promise.all([
          supabase
            .from("sleep_records")
            .select("sleep_duration_hours, created_at")
            .eq("user_id", user.id)
            .gte("created_at", sinceIso),
          supabase
            .from("mental_health_logs")
            .select("mood_rating, stress_level, energy_level, logged_at")
            .eq("user_id", user.id)
            .gte("logged_at", sinceIso),
          supabase
            .from("step_records")
            .select("steps, date")
            .eq("user_id", user.id)
            .gte("date", sinceDate),
          supabase
            .from("food_entries")
            .select("total_calories, consumed_at")
            .eq("user_id", user.id)
            .gte("consumed_at", sinceIso),
          supabase
            .from("womens_health_daily_logs")
            .select("date, pain_level")
            .eq("user_id", user.id)
            .gte("date", sinceDate),
          supabase
            .from("relations_daily_scores")
            .select("score, date")
            .eq("user_id", user.id)
            .gte("date", sinceDate),
          supabase
            .from("wealth_daily_scores")
            .select("score, date")
            .eq("user_id", user.id)
            .gte("date", sinceDate),
        ]);

        const byDate: Record<string, DayMetrics> = {};

        sleepData?.forEach((row: any) => {
          const date = new Date(row.created_at).toISOString().split("T")[0];
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];
          if (!entry.sleepHours) entry.sleepHours = 0;
          entry.sleepHours += row.sleep_duration_hours ?? 0;
        });

        moodData?.forEach((row: any) => {
          const date = new Date(row.logged_at).toISOString().split("T")[0];
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];

          if (typeof row.mood_rating === "number") {
            if (typeof entry.mood !== "number") entry.mood = 0;
            entry.mood = ((entry.mood ?? 0) + row.mood_rating) / 2;
          }

          if (typeof row.stress_level === "number") {
            if (typeof entry.stress !== "number") entry.stress = 0;
            entry.stress = ((entry.stress ?? 0) + row.stress_level) / 2;
          }

          if (typeof row.energy_level === "number") {
            if (typeof entry.energy !== "number") entry.energy = 0;
            entry.energy = ((entry.energy ?? 0) + row.energy_level) / 2;
          }
        });

        stepData?.forEach((row: any) => {
          const date = row.date;
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];
          if (!entry.steps) entry.steps = 0;
          entry.steps += row.steps ?? 0;
        });

        foodData?.forEach((row: any) => {
          const date = new Date(row.consumed_at).toISOString().split("T")[0];
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];
          if (!entry.calories) entry.calories = 0;
          entry.calories += row.total_calories ?? 0;
        });

        womensData?.forEach((row: any) => {
          const date = row.date;
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];
          if (typeof row.pain_level === "number") {
            if (typeof entry.painLevel !== "number") entry.painLevel = 0;
            entry.painLevel = ((entry.painLevel ?? 0) + row.pain_level) / 2;
          }
        });

        relationsScores?.forEach((row: any) => {
          const date = row.date;
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];
          if (typeof row.score === "number") {
            if (typeof entry.relationsScore !== "number")
              entry.relationsScore = 0;
            entry.relationsScore = row.score;
          }
        });

        wealthScores?.forEach((row: any) => {
          const date = row.date;
          if (!byDate[date]) byDate[date] = { date };
          const entry = byDate[date];
          if (typeof row.score === "number") {
            if (typeof entry.wealthScore !== "number")
              entry.wealthScore = 0;
            entry.wealthScore = row.score;
          }
        });

        const mergedDays = Object.values(byDate).sort((a, b) =>
          a.date.localeCompare(b.date)
        );

        // If there's not enough real data yet, generate mock demo data
        if (mergedDays.length < 7) {
          const demoDays: DayMetrics[] = [];
          const baseToday = new Date();

          for (let offset = 13; offset >= 0; offset--) {
            const d = new Date(baseToday);
            d.setDate(d.getDate() - offset);
            const dateStr = d.toISOString().split("T")[0];

            // Generate smooth patterns rather than pure noise
            const phase = offset / 3;
            const sleepRaw =
              6.3 + Math.sin(phase) * 1.1 + (Math.random() - 0.5) * 0.3;
            const sleepHours = Number(
              Math.max(4.5, Math.min(9, sleepRaw)).toFixed(1)
            );

            // Steps go up slightly with more sleep
            const stepsBase = 5000 + (sleepHours - 6.5) * 1200;
            const steps = Math.round(
              stepsBase + (Math.random() - 0.5) * 1000
            );

            // Mood follows sleep loosely (1–10)
            const moodBase = 6 + (sleepHours - 7) * 0.9;
            const mood = Number(
              Math.max(
                2,
                Math.min(10, moodBase + (Math.random() - 0.5) * 0.8)
              ).toFixed(1)
            );

            // Calories: slightly higher on active / good‑sleep days
            const caloriesBase =
              1900 + (sleepHours - 7) * 120 + (steps - 6000) * 0.1;
            const calories = Math.round(
              caloriesBase + (Math.random() - 0.5) * 200
            );

            // Women's pain: synthetic cycle with a few higher‑pain days
            const painPhase = (offset / 14) * Math.PI * 2;
            const painRaw = 3 + Math.sin(painPhase) * 3 + (Math.random() - 0.5);
            const painLevel = Math.max(0, Math.min(10, Math.round(painRaw)));

            // Relations score: better when mood is higher
            const relationsBase = 65 + (mood - 6) * 4;
            const relationsScore = Math.max(
              40,
              Math.min(
                100,
                Math.round(relationsBase + (Math.random() - 0.5) * 10)
              )
            );

            // Stress and energy: to be used later in more charts
            const stressBase = 6 - (sleepHours - 7) - (mood - 6) * 0.5;
            const stress = Math.max(
              1,
              Math.min(10, Number((stressBase + (Math.random() - 0.5)).toFixed(1)))
            );
            const energyBase = 5 + (sleepHours - 7) * 0.8;
            const energy = Math.max(
              1,
              Math.min(10, Number((energyBase + (Math.random() - 0.5)).toFixed(1)))
            );

            demoDays.push({
              date: dateStr,
              sleepHours,
              steps,
              mood,
              calories,
              painLevel,
              relationsScore,
              stress,
              energy,
            });
          }

          setDays(demoDays);
          setUsingDemoData(true);
        } else {
          setDays(mergedDays);
          setUsingDemoData(false);
        }
      } catch (error) {
        console.error("Error loading insights data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const correlations: CorrelationResult[] = useMemo(() => {
    if (days.length === 0) return [];

    const withSleepMood = days.filter(
      (d) => typeof d.sleepHours === "number" && typeof d.mood === "number"
    );
    const withSleepSteps = days.filter(
      (d) => typeof d.sleepHours === "number" && typeof d.steps === "number"
    );
    const withStepsMood = days.filter(
      (d) => typeof d.steps === "number" && typeof d.mood === "number"
    );
    const withStressMood = days.filter(
      (d) => typeof d.stress === "number" && typeof d.mood === "number"
    );

    const sleepMood =
      withSleepMood.length >= 3
        ? pearsonCorrelation(
            withSleepMood.map((d) => d.sleepHours as number),
            withSleepMood.map((d) => d.mood as number)
          )
        : null;

    const sleepSteps =
      withSleepSteps.length >= 3
        ? pearsonCorrelation(
            withSleepSteps.map((d) => d.sleepHours as number),
            withSleepSteps.map((d) => d.steps as number)
          )
        : null;

    const stepsMood =
      withStepsMood.length >= 3
        ? pearsonCorrelation(
            withStepsMood.map((d) => d.steps as number),
            withStepsMood.map((d) => d.mood as number)
          )
        : null;

    const stressMood =
      withStressMood.length >= 3
        ? pearsonCorrelation(
            withStressMood.map((d) => d.stress as number),
            withStressMood.map((d) => d.mood as number)
          )
        : null;

    return [
      {
        label: "Sleep ↔ Mood",
        description: "Do longer nights line up with better mood?",
        value: sleepMood,
      },
      {
        label: "Sleep ↔ Steps",
        description: "How your sleep and movement travel together.",
        value: sleepSteps,
      },
      {
        label: "Steps ↔ Mood",
        description: "Are active days also better days?",
        value: stepsMood,
      },
      {
        label: "Stress ↔ Mood",
        description: "Whether higher stress days tend to feel worse or better.",
        value: stressMood,
      },
    ];
  }, [days]);

  const extendedCorrelations: CorrelationResult[] = useMemo(() => {
    if (days.length === 0) return [];

    const withCaloriesMood = days.filter(
      (d) => typeof d.calories === "number" && typeof d.mood === "number"
    );
    const withPainMood = days.filter(
      (d) => typeof d.painLevel === "number" && typeof d.mood === "number"
    );
    const withRelationsMood = days.filter(
      (d) =>
        typeof d.relationsScore === "number" && typeof d.mood === "number"
    );

    const caloriesMood =
      withCaloriesMood.length >= 3
        ? pearsonCorrelation(
            withCaloriesMood.map((d) => d.calories as number),
            withCaloriesMood.map((d) => d.mood as number)
          )
        : null;

    const painMood =
      withPainMood.length >= 3
        ? pearsonCorrelation(
            withPainMood.map((d) => d.painLevel as number),
            withPainMood.map((d) => d.mood as number)
          )
        : null;

    const relationsMood =
      withRelationsMood.length >= 3
        ? pearsonCorrelation(
            withRelationsMood.map((d) => d.relationsScore as number),
            withRelationsMood.map((d) => d.mood as number)
          )
        : null;

    const results: CorrelationResult[] = [];

    results.push({
      label: "Calories ↔ Mood",
      description: "How your total food intake lines up with your mood.",
      value: caloriesMood,
    });

    results.push({
      label: "Women's pain ↔ Mood",
      description:
        "On heavy‑symptom days, does your mood shift noticeably? (Only if you use women's health logs.)",
      value: painMood,
    });

    results.push({
      label: "Relations ↔ Mood",
      description:
        "Whether strong relationship days tend to feel like better days overall.",
      value: relationsMood,
    });

    return results;
  }, [days]);

  const impactChartConfig: ChartConfig = {
    impact: {
      label: "Impact strength",
      color: "hsl(220 90% 55%)",
    },
  };

  const moodImpactData = useMemo(
    () =>
      [...correlations, ...extendedCorrelations]
        .filter(
          (c) =>
            c.label.includes("Mood") &&
            c.value !== null &&
            !Number.isNaN(c.value)
        )
        .map((c) => ({
          factor: c.label.replace("↔ Mood", "").replace("Mood ↔", "").trim(),
          impact: Math.abs(c.value as number),
        }))
        .sort((a, b) => b.impact - a.impact),
    [correlations, extendedCorrelations]
  );

  const experimentSummary = useMemo(() => {
    const threshold = 7; // 7 hours as a simple cut-off
    const valid = days.filter(
      (d) => typeof d.sleepHours === "number" && typeof d.mood === "number"
    );
    if (valid.length < 4) return null;

    const good = valid.filter((d) => (d.sleepHours as number) >= threshold);
    const short = valid.filter((d) => (d.sleepHours as number) < threshold);

    if (good.length === 0 || short.length === 0) return null;

    const avgMoodGood =
      good.reduce((sum, d) => sum + (d.mood as number), 0) / good.length;
    const avgMoodShort =
      short.reduce((sum, d) => sum + (d.mood as number), 0) / short.length;

    return {
      threshold,
      avgMoodGood: Number(avgMoodGood.toFixed(1)),
      avgMoodShort: Number(avgMoodShort.toFixed(1)),
      diff: Number((avgMoodGood - avgMoodShort).toFixed(1)),
    };
  }, [days]);

  const correlationBadge = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return <Badge variant="outline">Not enough data</Badge>;
    }
    const abs = Math.abs(value);
    let label = "";
    let color = "";
    if (abs >= 0.7) {
      label = "Strong";
      color = "bg-emerald-500 text-white";
    } else if (abs >= 0.4) {
      label = "Moderate";
      color = "bg-amber-500 text-white";
    } else {
      label = "Weak";
      color = "bg-slate-200 text-slate-900";
    }
    const direction = value > 0 ? "positive" : "negative";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {label} {direction}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)] safe-area-top safe-area-bottom ios-scroll">
      {/* Header */}
      <div className="ios-header safe-area-left safe-area-right">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 p-0 haptic-light"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="ios-large-title flex items-center gap-2">
                Insights Lab
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Your last 30 days, through a data analyst lens
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 pb-32 pt-2 space-y-6 safe-area-left safe-area-right">
        {/* Hero card */}
        <Card className="glass-panel overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Personal analytics
                </p>
                <h2 className="text-2xl font-semibold mt-1">
                  How your habits move together
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              We look at your sleep, mood and steps over the last month and
              surface the strongest relationships—exactly how a data analyst
              would.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {loading
                  ? "Crunching numbers…"
                  : `${days.length} days of data connected`}
              </div>
              {usingDemoData && !loading && (
                <Badge variant="outline" className="text-[10px]">
                  Demo data sample
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Big-picture system overview across pillars */}
        {systemRadarData.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">System overview</h3>
                  <p className="text-xs text-muted-foreground">
                    A single picture of how sleep, movement, food, stress,
                    wealth and relations are currently balanced.
                  </p>
                </div>
              </div>
              <ChartContainer
                config={systemRadarConfig}
                className="h-64 w-full"
              >
                <Recharts.RadarChart data={systemRadarData}>
                  <Recharts.PolarGrid />
                  <Recharts.PolarAngleAxis dataKey="dimension" />
                  <Recharts.PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Recharts.Radar
                    name="Balance"
                    dataKey="value"
                    stroke="var(--color-system)"
                    fill="var(--color-system)"
                    fillOpacity={0.18}
                  />
                </Recharts.RadarChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Ideally this looks like a mostly round shape. Sharp dents (for
                example in **sleep** or **relations**) show where the system is
                weakest right now and where small changes could have the biggest
                payoff.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Correlation cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {correlations.map((c) => (
            <Card key={c.label} className="ios-card haptic-light">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{c.label}</h3>
                  {correlationBadge(c.value)}
                </div>
                <p className="text-xs text-muted-foreground">{c.description}</p>
                {c.value !== null && !Number.isNaN(c.value) && (
                  <p className="text-xs text-muted-foreground">
                    r ={" "}
                    <span className="font-mono font-semibold">
                      {c.value.toFixed(2)}
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {friendlyCorrelationText(c.label, c.value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Extended cross‑pillar correlations */}
        <Card className="ios-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Food, women's health & relations
              </h3>
              <span className="text-[11px] text-muted-foreground">
                How other pillars connect back to mood
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {extendedCorrelations.map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl bg-muted/40 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{c.label}</span>
                    {correlationBadge(c.value)}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {friendlyCorrelationText(c.label, c.value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overall impact ranking: which levers seem to matter most for mood */}
        {moodImpactData.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">What seems to matter most?</h3>
                  <p className="text-xs text-muted-foreground">
                    Each bar shows how strongly a factor is linked with your
                    mood (higher = stronger link).
                  </p>
                </div>
              </div>
              <ChartContainer
                config={impactChartConfig}
                className="h-48 w-full"
              >
                <Recharts.BarChart
                  data={moodImpactData}
                  layout="vertical"
                  margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
                >
                  <Recharts.XAxis
                    type="number"
                    dataKey="impact"
                    domain={[0, 1]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Recharts.YAxis
                    type="category"
                    dataKey="factor"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Recharts.CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="impact"
                        labelKey="factor"
                      />
                    }
                  />
                  <Recharts.Bar
                    dataKey="impact"
                    fill="var(--color-impact)"
                    radius={[6, 6, 6, 6]}
                  />
                </Recharts.BarChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Use this like a cheat‑sheet: focus your experiments on the
                factors with the tallest bars first, because changing those is
                most likely to move how you feel.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Time-series map of your month */}
        {timeSeriesData.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">30‑day rhythm</h3>
                  <p className="text-xs text-muted-foreground">
                    Sleep, mood and steps layered on the same timeline so you
                    can see how they rise and fall together.
                  </p>
                </div>
              </div>
              <ChartContainer
                config={lineChartConfig}
                className="h-56 w-full"
              >
                <Recharts.LineChart
                  data={timeSeriesData}
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <Recharts.CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <Recharts.XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <Recharts.YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, "auto"]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Recharts.Line
                    type="monotone"
                    dataKey="sleep"
                    stroke="var(--color-sleep)"
                    strokeWidth={2}
                    dot={false}
                    name="Sleep (h)"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="mood"
                    stroke="var(--color-mood)"
                    strokeWidth={2}
                    dot={false}
                    name="Mood (1–10)"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="stepsK"
                    stroke="var(--color-stepsK)"
                    strokeWidth={2}
                    dot={false}
                    name="Steps (k)"
                    yAxisId={0}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </Recharts.LineChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Tip: look for stretches where the{" "}
                <span className="font-semibold">green sleep line</span> drops —
                do the{" "}
                <span className="font-semibold">purple mood</span> and{" "}
                <span className="font-semibold">orange steps</span> lines dip
                around the same days?
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sleep vs mood scatter “map” */}
        {scatterData.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Sleep vs mood map</h3>
                  <p className="text-xs text-muted-foreground">
                    Each dot is a day. More to the right means more sleep,
                    higher means better mood. A clear upward slope means more
                    sleep usually comes with better days.
                  </p>
                </div>
              </div>
              <ChartContainer config={scatterConfig} className="h-56 w-full">
                <Recharts.ScatterChart
                  margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
                >
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis
                    type="number"
                    dataKey="sleep"
                    name="Sleep (h)"
                    domain={[4, 10]}
                  />
                  <Recharts.YAxis
                    type="number"
                    dataKey="mood"
                    name="Mood"
                    domain={[1, 10]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelKey="dateLabel"
                        nameKey="point"
                      />
                    }
                  />
                  <Recharts.Scatter
                    data={scatterData}
                    dataKey="point"
                    fill="var(--color-point)"
                  />
                </Recharts.ScatterChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Hover over a dot to see the exact night and mood. Clusters of
                points in the top‑right corner mean{" "}
                <span className="font-semibold">
                  \"more sleep, better mood\"
                </span>{" "}
                days.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stress vs mood over time */}
        {stressSeries.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Stress & mood</h3>
                  <p className="text-xs text-muted-foreground">
                    See how your logged stress level and mood move together over
                    the last weeks.
                  </p>
                </div>
              </div>
              <ChartContainer
                config={stressChartConfig}
                className="h-48 w-full"
              >
                <Recharts.LineChart data={stressSeries}>
                  <Recharts.CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <Recharts.XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <Recharts.YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 10]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Recharts.Line
                    type="monotone"
                    dataKey="stress"
                    stroke="var(--color-stress)"
                    strokeWidth={2}
                    dot={false}
                    name="Stress (1–10)"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="moodStress"
                    stroke="var(--color-moodStress)"
                    strokeWidth={2}
                    dot={false}
                    name="Mood (1–10)"
                  />
                </Recharts.LineChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                If the **red stress line** spikes on the same days the{" "}
                <span className="font-semibold">purple mood line</span> drops,
                that&apos;s a strong personal signal that stress is driving your
                mood.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Food vs mood over time */}
        {foodSeries.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Food & mood</h3>
                  <p className="text-xs text-muted-foreground">
                    Calories and mood on the same timeline to spot \"too low\"
                    or \"too heavy\" days.
                  </p>
                </div>
              </div>
              <ChartContainer
                config={foodChartConfig}
                className="h-48 w-full"
              >
                <Recharts.LineChart data={foodSeries}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Recharts.XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <Recharts.YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, "auto"]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Recharts.Line
                    type="monotone"
                    dataKey="calories"
                    stroke="var(--color-calories)"
                    strokeWidth={2}
                    dot={false}
                    name="Calories"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="moodFood"
                    stroke="var(--color-moodFood)"
                    strokeWidth={2}
                    dot={false}
                    name="Mood (1–10)"
                  />
                </Recharts.LineChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Look for patterns like **very low calories** on low‑mood days
                or **very high calories** on days where mood also dips.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Women's health vs mood */}
        {womensSeries.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Women's health & mood</h3>
                  <p className="text-xs text-muted-foreground">
                    Pain level and mood side‑by‑side across days where you
                    logged women's health.
                  </p>
                </div>
              </div>
              <ChartContainer
                config={womensChartConfig}
                className="h-48 w-full"
              >
                <Recharts.LineChart data={womensSeries}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Recharts.XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <Recharts.YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 10]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Recharts.Line
                    type="monotone"
                    dataKey="pain"
                    stroke="var(--color-pain)"
                    strokeWidth={2}
                    dot={false}
                    name="Pain (0–10)"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="moodWomens"
                    stroke="var(--color-moodWomens)"
                    strokeWidth={2}
                    dot={false}
                    name="Mood (1–10)"
                  />
                </Recharts.LineChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                If the **pink pain line** spikes on days where the **purple
                mood line** dips, that tells a clear story you can share with a
                doctor or coach.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Relations score vs mood */}
        {relationsSeries.length > 0 && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Relationships & mood</h3>
                  <p className="text-xs text-muted-foreground">
                    Your daily relations score vs mood — are \"connected\" days
                    also better days?
                  </p>
                </div>
              </div>
              <ChartContainer
                config={relationsChartConfig}
                className="h-48 w-full"
              >
                <Recharts.LineChart data={relationsSeries}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Recharts.XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <Recharts.YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Recharts.Line
                    type="monotone"
                    dataKey="relations"
                    stroke="var(--color-relations)"
                    strokeWidth={2}
                    dot={false}
                    name="Relations (0–100)"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="moodRelations"
                    stroke="var(--color-moodRelations)"
                    strokeWidth={2}
                    dot={false}
                    name="Mood (1–10)"
                  />
                </Recharts.LineChart>
              </ChartContainer>
              <p className="text-[11px] text-muted-foreground leading-snug">
                High **blue relation scores** that line up with higher mood
                points tell you that social connection is a strong lever for
                you personally.
              </p>
            </CardContent>
          </Card>
        )}
        {/* Sleep experiment style summary */}
        {experimentSummary && (
          <Card className="ios-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
                  <Moon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Mini sleep experiment</h3>
                  <p className="text-xs text-muted-foreground">
                    Comparing nights with ≥ {experimentSummary.threshold}h vs
                    shorter nights.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50">
                  <p className="text-xs text-emerald-700 uppercase tracking-wide">
                    After good sleep
                  </p>
                  <p className="text-2xl font-semibold text-emerald-900">
                    {experimentSummary.avgMoodGood}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    average mood (1–10)
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-700 uppercase tracking-wide">
                    After short sleep
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {experimentSummary.avgMoodShort}
                  </p>
                  <p className="text-[11px] text-slate-700 mt-1">
                    average mood (1–10)
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                On nights with{" "}
                <span className="font-semibold">
                  enough sleep (≥ {experimentSummary.threshold}h)
                </span>{" "}
                your mood the next day is, on average,{" "}
                <span className="font-semibold">
                  {experimentSummary.diff > 0
                    ? `+${experimentSummary.diff}`
                    : experimentSummary.diff}
                </span>{" "}
                points higher. In plain words: banking a full night of sleep is
                usually worth about{" "}
                <span className="font-semibold">one mood point</span> the next
                day.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Narrative insights */}
        <Card className="ios-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Analyst notes</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                • <span className="font-semibold">For you:</span> use this page
                to spot \"lever\" habits — for example, if sleep strongly links
                to mood, focusing on bedtime is likely to pay off more than
                tiny tweaks elsewhere.
              </li>
              <li>
                • <span className="font-semibold">For your portfolio:</span> it
                shows you can take raw logs (sleep, mood, steps), turn them
                into daily features, and explain correlations in plain language.
              </li>
              <li>
                • You can extend this with more experiments (screen time,
                caffeine, workout intensity) or export these metrics into a
                notebook for deeper modeling.
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


