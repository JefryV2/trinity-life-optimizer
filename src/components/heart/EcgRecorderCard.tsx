import { Pause, Play } from "lucide-react";
import { useState } from "react";

interface EcgRecorderCardProps {
  bpm: number;
}

const generateWavePoints = (count: number) => {
  const points: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * 100;
    const amplitude = Math.sin(i / 2) * 15 + (Math.random() * 8 - 4);
    const baseline = 50;
    const y = baseline - amplitude;
    points.push(`${x},${Math.max(10, Math.min(90, y))}`);
  }
  return points.join(" ");
};

export const EcgRecorderCard = ({ bpm }: EcgRecorderCardProps) => {
  const [recording, setRecording] = useState(true);
  const [seconds, setSeconds] = useState(11);

  const waveform = generateWavePoints(40);

  return (
    <section className="glass-panel p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">ECG Recording</p>
          <div className="text-4xl font-semibold text-foreground">
            {bpm}
            <span className="text-lg font-medium text-muted-foreground ml-2">
              bpm
            </span>
          </div>
        </div>
        <div className="metric-chip flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </header>

      <div className="wave-grid relative rounded-3xl bg-white border border-white/70 shadow-inner overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-36">
          <polyline
            fill="none"
            stroke="url(#pulseGradient)"
            strokeWidth="2.3"
            strokeLinecap="round"
            className="waveform-line"
            points={waveform}
          />
          <defs>
            <linearGradient id="pulseGradient" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#ff6a3d" />
              <stop offset="100%" stopColor="#ff9c5a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <footer className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Recording time
          </p>
          <div className="text-2xl font-semibold text-foreground">
            00:{seconds.toString().padStart(2, "0")}
          </div>
        </div>
        <button
          onClick={() => {
            setRecording((prev) => !prev);
            setSeconds((prev) => (prev >= 59 ? 0 : prev + 1));
          }}
          className="relative h-16 w-16 rounded-full flex items-center justify-center bg-white shadow-[0_10px_25px_rgba(0,0,0,0.12)]"
        >
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-orange-200 animate-spin-slow" />
          <span className="absolute inset-1 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-white">
            {recording ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </span>
        </button>
      </footer>
    </section>
  );
};

