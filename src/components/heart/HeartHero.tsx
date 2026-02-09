import { Activity, HeartPulse, Sparkles } from "lucide-react";

interface HeartHeroProps {
  bpm: number;
  hrv: number;
  status?: string;
  name?: string;
}

export const HeartHero = ({
  bpm,
  hrv,
  status = "Stable",
  name = "Emma",
}: HeartHeroProps) => {
  return (
    <section className="hero-shell">
      <div className="hero-shell-content">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              Hi, {name}!
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Heart Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Let&apos;s measure your heart today
            </p>
          </div>
          <span className="neon-pill flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              ECG
            </p>
            <div className="text-[3.5rem] font-bold leading-none text-foreground">
              {bpm}
              <span className="text-lg font-semibold ml-1 text-muted-foreground">
                bpm
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Heart Rate Variability
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="pulse-dot" />
              <span className="text-sm font-semibold text-foreground">
                {hrv} ms
              </span>
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className="text-xs font-semibold text-green-600">
                {status}
              </span>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-white to-white rounded-[32px] blur-3xl opacity-70" />
            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-[#f75f3f] via-[#ff944e] to-[#ffb869] shadow-[0_20px_40px_rgba(247,95,63,0.35)] flex items-center justify-center">
              <HeartPulse className="h-16 w-16 text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.2)]" />
              <div className="absolute -bottom-3 glass-panel px-4 py-2 flex items-center gap-2 shadow-lg">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Stable rhythm
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

