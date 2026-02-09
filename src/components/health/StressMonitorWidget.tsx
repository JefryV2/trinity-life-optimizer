import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Activity, DollarSign, HeartHandshake, AlertTriangle } from "lucide-react";

interface StressMonitorWidgetProps {
  score: number; // 0-100, higher = more stressed
  level: "Low" | "Medium" | "High";
  healthScore: number;
  wealthScore: number;
  relationsScore: number;
}

function pillStatus(score: number) {
  if (score >= 70) {
    return {
      label: "supportive",
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  }
  if (score >= 40) {
    return {
      label: "neutral",
      className: "bg-amber-50 text-amber-700 border-amber-100",
    };
  }
  return {
    label: "stressor",
    className: "bg-red-50 text-red-700 border-red-100",
  };
}

export function StressMonitorWidget({
  score,
  level,
  healthScore,
  wealthScore,
  relationsScore,
}: StressMonitorWidgetProps) {
  const ringClass =
    level === "High"
      ? "text-red-500"
      : level === "Medium"
      ? "text-amber-500"
      : "text-emerald-500";

  const labelColor =
    level === "High"
      ? "text-red-600"
      : level === "Medium"
      ? "text-amber-600"
      : "text-emerald-600";

  const factors = [
    {
      label: "Health",
      icon: Activity,
      score: healthScore,
    },
    {
      label: "Wealth",
      icon: DollarSign,
      score: wealthScore,
    },
    {
      label: "Relations",
      icon: HeartHandshake,
      score: relationsScore,
    },
  ];

  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4 sm:gap-6">
        <div className="shrink-0">
          <CircularProgress
            value={score}
            size={96}
            strokeWidth={8}
            indicatorClassName={ringClass}
            trackClassName="text-muted/30"
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <span className="text-xs text-muted-foreground">Stress</span>
              <span className="text-lg font-semibold">{score}</span>
            </div>
          </CircularProgress>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Today&apos;s blend
              </p>
              <p className={`text-sm font-semibold ${labelColor}`}>
                {level === "High"
                  ? "System under heavy load"
                  : level === "Medium"
                  ? "Manageable pressure"
                  : "Calm overall"}
              </p>
            </div>
            {level !== "Low" && (
              <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] text-red-700 border border-red-100">
                <AlertTriangle className="h-3 w-3" />
                Check Insights
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            This score blends **mental stress, sleep debt, money strain and
            relationship drift** into one daily stress meter.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {factors.map((f) => {
              const Icon = f.icon;
              const status = pillStatus(f.score);
              return (
                <div
                  key={f.label}
                  className={`rounded-2xl border px-2.5 py-1.5 flex flex-col gap-1 ${status.className}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold">
                      {f.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>{status.label}</span>
                    <span className="font-mono">{Math.round(f.score)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


