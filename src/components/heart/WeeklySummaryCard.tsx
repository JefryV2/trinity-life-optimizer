import { Brain, TrendingUp } from "lucide-react";

interface WeeklySummaryCardProps {
  bpm: number;
  max: number;
  min: number;
  hrvData: number[];
  stressLevel?: "Low" | "Medium" | "High";
  avgVariability: number;
}

export const WeeklySummaryCard = ({
  bpm,
  max,
  min,
  hrvData,
  stressLevel = "Low",
  avgVariability,
}: WeeklySummaryCardProps) => {
  return (
    <section className="glass-panel p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Heart Rate</p>
          <h2 className="text-3xl font-semibold text-foreground">{bpm} bpm</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Here&apos;s your weekly summary
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-semibold">{max}</span> Max
          </p>
          <p>
            <span className="text-foreground font-semibold">{min}</span> Min
          </p>
        </div>
      </header>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold text-sm text-muted-foreground uppercase">
            Heart Rate Variability
          </p>
          <span className="metric-chip">{avgVariability} ms avg</span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {hrvData.map((value, idx) => (
            <div
              key={idx}
              className="flex-1 rounded-full bg-gradient-to-t from-orange-200 to-orange-500"
              style={{
                height: `${Math.max(15, (value / 140) * 100)}%`,
                opacity: idx === 5 ? 1 : 0.85,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          {["12am", "4am", "8am", "12pm", "4pm", "8pm"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel bg-white/60 border border-white/80 p-4 rounded-2xl shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Stress Level
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Brain className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">{stressLevel}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Balanced nervous system
          </p>
        </div>
        <div className="glass-panel bg-white/60 border border-white/80 p-4 rounded-2xl shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Ave. Variability
          </p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">{avgVariability} ms</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Great recovery</p>
        </div>
      </div>

      <div className="glass-panel bg-orange-50/70 border border-orange-200/60 p-4 rounded-2xl flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-inner">
          <span className="text-2xl">⚡️</span>
        </div>
        <div className="text-sm text-orange-900">
          Your HRV is 5% higher than average for your age group — keep up the
          excellent recovery habits.
        </div>
      </div>
    </section>
  );
};

