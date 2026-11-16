import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { BottomNav } from '@/components/Navigation/BottomNav';
import {
  Columns,
  Group,
  PillButton,
  ScoreHeader,
  SectionHeader,
  StatRow,
  Topline,
  Track,
} from '@/components/ds';
import { useScore } from '@/hooks/use-score';
import { ACTION_HINT } from './Why';

const PILLAR_COLOR: Record<string, string> = {
  health: '#c6f24e',
  wealth: '#ffb020',
  bonds: '#3d7bff',
};

export default function Index() {
  const navigate = useNavigate();
  const { report, input, loading } = useScore();

  const pillars = report.pillars.map((pillar) => ({
    label: pillar.label,
    value: pillar.value,
    color: PILLAR_COLOR[pillar.key],
  }));

  const strongest = report.pillars.find((p) => p.key === report.strongest);
  const weakest = report.pillars.find((p) => p.key === report.weakest);

  const verdict = loading
    ? 'Reading your last seven days…'
    : report.total === 0
      ? 'Nothing logged yet. One entry is enough to start the reading.'
      : `${strongest?.label} is carrying you. ${weakest?.label} has the most room.`;

  const health = input.health;
  const rows = [
    {
      label: 'STEPS',
      value: Math.round(health.steps).toLocaleString(),
      suffix: '/ 10,000',
      ratio: health.steps / 10000,
    },
    {
      label: 'SLEEP',
      value: health.sleepHours.toFixed(1),
      suffix: '/ 8 H',
      ratio: health.sleepHours / 8,
    },
    {
      label: 'EXERCISE',
      value: Math.round(health.exerciseMinutes),
      suffix: '/ 45 MIN',
      ratio: health.exerciseMinutes / 45,
    },
    {
      label: 'WATER',
      value: Math.round(health.waterMl).toLocaleString(),
      suffix: `/ ${Math.round(health.waterTarget || 2500).toLocaleString()} ML`,
      ratio: health.waterMl / (health.waterTarget || 2500),
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-40">
      <div className="mx-auto w-full max-w-[430px] px-[18px]">
        <Topline left="TRINITY" right={format(new Date(), 'EEE d MMM').toUpperCase()} />

        <div className="pt-3">
          <ScoreHeader
            label="LIFE SCORE"
            value={loading ? '···' : report.total}
            delta={
              loading || report.total === 0
                ? undefined
                : report.topAction
                  ? `+${report.topAction.points} TO GAIN`
                  : 'ALL CAUGHT UP'
            }
            verdict={verdict}
          />
        </div>

        <Group className="mt-3">
          <Columns items={pillars} />
        </Group>

        <div className="mt-3 px-[2px]">
          <div className="flex items-baseline justify-between">
            <span className="ds-label text-[9px]">BALANCE</span>
            <span className="ds-dim text-[9px] font-bold tracking-[0.16em]">
              {report.total} / 100
            </span>
          </div>
          <div className="mt-[9px] flex gap-[3px]">
            {pillars.map((pillar) => (
              <div key={pillar.label} className="flex-1">
                <div className="h-[6px] overflow-hidden rounded-pill bg-[#1e1e22]">
                  <div
                    className="h-full rounded-pill"
                    style={{ width: `${Math.max(3, pillar.value)}%`, background: pillar.color }}
                  />
                </div>
                <div className="mt-[6px] flex items-baseline gap-[5px]">
                  <span className="ds-dim text-[8.5px] font-bold tracking-[0.14em]">
                    {pillar.label}
                  </span>
                  <span className="text-[11px] font-extrabold" style={{ color: pillar.color }}>
                    {pillar.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionHeader
            index="01"
            title="TODAY"
            action={
              <button
                onClick={() => navigate('/health')}
                className="press ds-gain px-[6px] py-[6px] text-[9px] font-bold uppercase tracking-[0.12em]"
              >
                ADD →
              </button>
            }
          />
          <Group padded>
            {rows.map((row, index) => (
              <StatRow
                key={row.label}
                label={row.label}
                value={row.value}
                suffix={row.suffix}
                className={index === 0 ? undefined : 'row-div'}
              >
                <Track value={row.ratio * 100} accent={index === 0} />
              </StatRow>
            ))}
          </Group>
        </div>

        <div className="mt-5">
          <SectionHeader index="02" title="READING" />
          <div className="grp mt-3">
            <button
              onClick={() => navigate('/why')}
              className="press flex w-full items-center justify-between px-[15px] py-[13px] text-left"
            >
              <span>
                <span className="block text-[15px] font-extrabold leading-tight">
                  {report.total > 0 ? `Why is it ${report.total}?` : 'How the score works'}
                </span>
                <span className="ds-dim mt-[3px] block text-[11px] font-semibold">
                  {report.topAction
                    ? `${ACTION_HINT[report.topAction.key] ?? report.topAction.label} · worth ${report.topAction.points} points`
                    : 'Every point traced to something you logged'}
                </span>
              </span>
              <span className="ds-gain pl-3 text-[15px] font-extrabold">→</span>
            </button>
            <div className="row-div" />
            <button
              onClick={() => navigate('/experiments')}
              className="press flex w-full items-center justify-between px-[15px] py-[13px] text-left"
            >
              <span>
                <span className="block text-[15px] font-extrabold leading-tight">
                  Run a 7-day experiment
                </span>
                <span className="ds-dim mt-[3px] block text-[11px] font-semibold">
                  Hold one rule, then see what it actually changed
                </span>
              </span>
              <span className="ds-gain pl-3 text-[15px] font-extrabold">→</span>
            </button>
          </div>
        </div>

        <div className="mt-5">
          <PillButton onClick={() => navigate('/health')} right="+">
            LOG SOMETHING
          </PillButton>
        </div>
      </div>

      <BottomNav activeTab="home" />
    </div>
  );
}
