import * as React from "react";
import { cn } from "@/lib/utils"; /* ============================================================================ Trinity design system primitives. Every screen is built from these six things and nothing else: Group · ScoreHeader · SectionHeader · StatRow · Track / StageBar · PillButton ========================================================================== */ /** The only container. Hairline border, one radius, no shadow. */
export const Group = ({
  className,
  padded = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) => (
  <div className={cn("grp", padded && "grp-pad", className)} {...props} />
); /** A three-up row of numbers inside a Group. */
export const Columns = ({
  items,
  className,
}: {
  className?: string;
  items: {
    label: string;
    value: React.ReactNode;
    delta?: string;
    tone?: "gain" | "loss" | "flat";
  }[];
}) => (
  <div className={cn("grid grid-cols-3 px-[15px]", className)}>
    {items.map((item, i) => (
      <div
        key={item.label}
        className={cn(
          "py-[9px]",
          i > 0 && "border-l border-[#17171a] pl-[14px]",
        )}
      >
        <div className="ds-label text-[9px]">{item.label}</div>
        <div className="ds-num text-[38px] leading-[1.05]">{item.value}</div>
        {item.delta && (
          <div
            className={cn(
              "text-[11px] font-bold",
              item.tone === "loss"
                ? "ds-loss"
                : item.tone === "flat"
                  ? "ds-dim"
                  : "ds-gain",
            )}
          >
            {item.delta}
          </div>
        )}
      </div>
    ))}
  </div>
); /** The hero: a huge number, its delta, and one sentence of plain language. */
export const ScoreHeader = ({
  label,
  value,
  unit,
  delta,
  deltaLabel = "TODAY",
  verdict,
  size = 142,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: string;
  deltaLabel?: string;
  verdict?: React.ReactNode;
  size?: number;
}) => (
  <div className="px-[2px]">
    <div className="cap">{label}</div>
    <div className="flex items-end gap-[14px]">
      <span
        className="ds-num block"
        style={{
          fontSize: size,
          letterSpacing: size > 120 ? "-0.065em" : "-0.045em",
          lineHeight: 0.8,
          marginBottom: delta ? 2 : -16,
        }}
      >
        {value}
        {unit && (
          <span className="ds-dim text-[0.28em] font-semibold tracking-normal">
            {unit}
          </span>
        )}
      </span>
      {delta && (
        <div className="pb-[18px]">
          <div className="ds-gain text-[15px] font-extrabold">{delta}</div>
          <div className="ds-dim mt-[2px] text-[9px] font-bold tracking-[0.2em] uppercase">
            {deltaLabel}
          </div>
        </div>
      )}
    </div>
    {verdict && (
      <p className="ds-body mt-[2px] max-w-[318px] px-[2px]">{verdict}</p>
    )}
  </div>
); /** Numbered section header with the hairline that runs to the edge. */
export const SectionHeader = ({
  index,
  title,
  action,
}: {
  index: string;
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="sec-h">
    <span className="idx">{index}</span> <span>{title}</span>
    <span className="rule" /> {action}
  </div>
); /** Label + value, with a measurement underneath. */
export const StatRow = ({
  label,
  value,
  suffix,
  children,
  className,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("py-[10px]", className)}>
    <div className="flex items-baseline justify-between">
      <span className="ds-label text-[9.5px]">{label}</span>
      <span className="ds-value">
        {value}
        {suffix && (
          <span className="ds-dim ml-[4px] text-[12px] font-semibold">
            {suffix}
          </span>
        )}
      </span>
    </div>
    {children}
  </div>
); /** A single measured value, 0–100. */
export const Track = ({
  value,
  accent = false,
  className,
}: {
  value: number;
  accent?: boolean;
  className?: string;
}) => (
  <div className={cn("track mt-[9px]", className)}>
    <i
      className={accent ? "accent" : undefined}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
); /** Sleep / time-in-zone segments. */
export const StageBar = ({
  segments,
  height = 16,
}: {
  segments: { flex: number; color: string }[];
  height?: number;
}) => (
  <div className="stage mt-[10px]" style={{ height }}>
    {segments.map((s, i) => (
      <b key={i} style={{ flex: s.flex, background: s.color }} />
    ))}
  </div>
); /** The only line chart: hairline grid, no fill, square-ish caps, accent marker on today. */
export const Sparkline = ({
  points,
  height = 96,
  className,
}: {
  points: number[];
  height?: number;
  className?: string;
}) => {
  const w = 336;
  const h = height;
  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const xy = points.map((p, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (p - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = xy
    .map(([x, y], i) =>
      i === 0 ? `M${x},${y}` : `Q${x - step / 2},${xy[i - 1][1]} ${x},${y}`,
    )
    .join(" ");
  const last = xy[xy.length - 1];
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ display: "block" }}
      role="img"
    >
      {[0.02, 0.5, 0.98].map((t) => (
        <line key={t} x1="0" y1={h * t} x2={w} y2={h * t} stroke="#17171a" />
      ))}
      <path
        d={d}
        fill="none"
        stroke="#ededef"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="5.5" fill="#c6f24e" />
    </svg>
  );
}; /** Pill button. Solid = the one primary action on the screen. */
export const PillButton = ({
  children,
  right,
  variant = "solid",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  right?: React.ReactNode;
  variant?: "solid" | "ghost";
}) => (
  <button
    className={cn(
      "pill-btn w-full",
      variant === "solid" ? "pill-btn-solid" : "pill-btn-ghost",
      className,
    )}
    {...props}
  >
    <span>{children}</span>
    {right && (
      <span className="text-[11px] font-bold tracking-[0.08em] opacity-80">
        {right}
      </span>
    )}
  </button>
); /** Screen chrome: the topline (wordmark · date/context) used on every screen. */
export const Topline = ({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) => (
  <div className="topline border-b border-[#1b1b1e] px-[2px] pb-[9px] pt-[14px]">
    <b>{left}</b> {right && <span>{right}</span>}
  </div>
); /** Sticky page chrome: back, page name, context. No icon buttons. */
export const PageHeader = ({
  title,
  context,
  onBack,
  action,
}: {
  title: string;
  context?: string;
  onBack?: () => void;
  action?: { label: string; onClick: () => void };
}) => (
  <div className="ios-header">
    <div className="mx-auto w-full max-w-[430px] px-[18px]">
      <div className="flex items-end justify-between pb-[10px] pt-[10px]">
        <div className="flex items-center gap-[10px]">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="-ml-[2px] px-[2px] text-[18px] font-extrabold leading-none text-[#b4b4bb]"
            >
              ←
            </button>
          )}
          <span className="text-[15px] font-extrabold uppercase tracking-[0.02em]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {context && (
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#b4b4bb]">
              {context}
            </span>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);
