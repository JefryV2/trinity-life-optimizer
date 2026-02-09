import { Activity, DollarSign, Heart, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface PillarData {
  id: string;
  title: string;
  emoji: string;
  icon: typeof Activity;
  score: number;
  trend: string;
  color: string;
  gradient: string;
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
  }>;
  backendStatus: "connected" | "partial" | "coming-soon";
  backendInfo: string[];
}

interface PillarOverviewProps {
  pillars: PillarData[];
}

export const PillarOverview = ({ pillars }: PillarOverviewProps) => {
  const navigate = useNavigate();

  return (
    <section className="glass-panel p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Trinity Pillars</p>
          <h2 className="text-3xl font-semibold text-foreground">
            Life Optimization
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Your complete wellness overview
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-foreground">
            {Math.round(
              pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length,
            )}
          </div>
          <p className="text-xs text-muted-foreground">Overall Score</p>
        </div>
      </header>

      <div className="space-y-4">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className="glass-panel bg-white/60 border border-white/80 rounded-2xl p-4 cursor-pointer hover:bg-white/80 transition-all shadow-sm"
              onClick={() => navigate(`/${pillar.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${pillar.gradient} flex items-center justify-center text-white text-xl shadow-lg`}
                  >
                    {pillar.emoji}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-base">
                      {pillar.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-semibold text-foreground">
                        {pillar.score}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        %
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          pillar.trend.startsWith("+")
                            ? "text-green-600"
                            : pillar.trend === "0%"
                              ? "text-muted-foreground"
                              : "text-red-600"
                        }`}
                      >
                        {pillar.trend}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="mb-3">
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pillar.gradient}`}
                    style={{ width: `${pillar.score}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {pillar.metrics.slice(0, 2).map((metric, idx) => (
                  <div
                    key={idx}
                    className="bg-white/50 rounded-xl p-2.5 border border-white/60"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      {metric.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {metric.value}
                      {metric.unit}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/50">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      pillar.backendStatus === "connected"
                        ? "bg-green-500 animate-pulse"
                        : pillar.backendStatus === "partial"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {pillar.backendStatus === "connected"
                      ? "Backend Connected"
                      : pillar.backendStatus === "partial"
                        ? "Partial Data"
                        : "Coming Soon"}
                  </span>
                </div>
                {pillar.backendInfo.length > 0 && (
                  <span className="metric-chip text-xs">
                    {pillar.backendInfo.length} sources
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

