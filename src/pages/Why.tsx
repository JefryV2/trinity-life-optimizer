import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { BottomNav } from '@/components/Navigation/BottomNav';
import { Group, PillButton, Topline } from '@/components/ds';
import { useScore } from '@/hooks/use-score';

const PILLAR_COLOR: Record<string, string> = {
  health: '#c6f24e',
  wealth: '#ffb020',
  bonds: '#3d7bff',
};

/** What to actually do about each input. The score is only useful if this is obvious. */
export const ACTION_HINT: Record<string, string> = {
  steps: 'Walk 2,000 more steps',
  sleep: 'Get to bed 30 minutes earlier',
  exercise: 'One 20-minute session',
  water: 'Two more glasses',
  mental: 'Log mood and stress',
  savings: 'Log this month’s income',
  spend: 'Log this month’s spending',
  contact: 'Message one person',
  mood: 'Log how it felt',
};

const PILLAR_ROUTE: Record<string, string> = {
  health: '/health',
  wealth: '/wealth',
  bonds: '/relations',
};

/**
 * The explanation screen. Occasional, so it is allowed one deliberate entrance:
 * content settles in, bars draw once, and nothing moves again.
 */
export default function Why() {
  const navigate = useNavigate();
  const { report, loading } = useScore();

  const strongest = report.pillars.find((p) => p.key === report.strongest);
  const weakest = report.pillars.find((p) => p.key === report.weakest);

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="mx-auto w-full max-w-[430px] px-[18px]">
        <Topline
          left={
            <span className="flex items-center gap-[10px]">
              <button
                onClick={() => navigate('/')}
                aria-label="Back"
                className="press -ml-[2px] px-[2px] text-[16px] font-extrabold leading-none text-[#8a8a92]"
              >
                ←
              </button>
              <span className="text-[15px] font-extrabold uppercase tracking-[0.02em]">
                Why
              </span>
            </span>
          }
          right={format(new Date(), 'EEE d MMM').toUpperCase()}
        />

        <div className="reveal pt-4" style={{ ['--d' as string]: '0ms' }}>
          <div className="cap">LIFE SCORE</div>
          <div className="flex items-end gap-[12px]">
            <span className="ds-num block text-[104px] leading-[0.92] tracking-[-0.06em]">
              {loading ? '···' : report.total}
            </span>
            <span className="ds-dim pb-[16px] text-[12px] font-semibold">OF 100</span>
          </div>
          <p className="ds-body mt-[6px] max-w-[330px]">
            {loading
              ? 'Reading your last seven days…'
              : report.total === 0
                ? 'Nothing logged yet. One entry is enough to start the reading.'
                : `${strongest?.label} is carrying you. ${weakest?.label} has the most room.`}
          </p>
        </div>

        {report.topAction && !loading && (
          <div className="reveal mt-5" style={{ ['--d' as string]: '60ms' }}>
            <div className="sec-h">
              <span className="idx">01</span>
              <span>BIGGEST MOVE</span>
              <span className="rule" />
            </div>
            <Group className="px-[15px] py-[14px]">
              <div className="text-[17px] font-extrabold leading-tight">
                {report.topAction.label}
              </div>
              <div className="ds-dim mt-[4px] text-[11px] font-semibold">
                {report.topAction.display}
              </div>
              <div className="mt-[10px] text-[14px] font-bold">
                {ACTION_HINT[report.topAction.key] ?? 'Log this to earn the points'}
              </div>
              <div className="ds-gain mt-[3px] text-[11px] font-extrabold uppercase tracking-[0.1em]">
                {report.topAction.points} points available
              </div>
              <PillButton
                className="mt-[12px]"
                variant="ghost"
                onClick={() => navigate(PILLAR_ROUTE[report.topAction!.pillar])}
                right="›"
              >
                GO TO {report.topAction.pillar.toUpperCase()}
              </PillButton>
              <button
                onClick={() => navigate('/experiments')}
                className="press ds-gain mt-[10px] w-full text-left text-[10px] font-extrabold uppercase tracking-[0.12em]"
              >
                TRY IT FOR 7 DAYS →
              </button>
            </Group>
          </div>
        )}

        {report.pillars.map((pillar, index) => (
          <div
            key={pillar.key}
            className="reveal mt-5"
            style={{ ['--d' as string]: `${120 + index * 70}ms` }}
          >
            <div className="sec-h">
              <span className="idx">{String(index + 2).padStart(2, '0')}</span>
              <span>{pillar.label}</span>
              <span className="rule" />
              <span
                className="text-[13px] font-extrabold tabular-nums"
                style={{ color: PILLAR_COLOR[pillar.key] }}
              >
                {pillar.value}
              </span>
            </div>

            <Group padded>
              {pillar.contributions.map((item, itemIndex) => (
                <div
                  key={item.key}
                  className={itemIndex === 0 ? 'py-[10px]' : 'row-div py-[10px]'}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="ds-label text-[9.5px]">{item.label}</span>
                    <span className="ds-value text-[17px]">
                      {item.points}
                      <span className="ds-dim ml-[3px] text-[11px] font-semibold">
                        / {item.max}
                      </span>
                    </span>
                  </div>
                  <div className="mt-[9px] h-[5px] overflow-hidden rounded-pill bg-[#1e1e22]">
                    <div
                      className="grow h-full rounded-pill"
                      style={{
                        width: `${Math.max(0, Math.min(100, item.ratio * 100))}%`,
                        background: item.points === item.max ? '#ededef' : PILLAR_COLOR[pillar.key],
                        ['--d' as string]: `${180 + index * 70 + itemIndex * 50}ms`,
                      }}
                    />
                  </div>
                  <div className="ds-dim mt-[7px] text-[9px] font-bold uppercase tracking-[0.12em]">
                    {item.display}
                    {item.lost > 0 ? ` · ${item.lost} POINTS LEFT` : ' · FULL'}
                  </div>
                </div>
              ))}
            </Group>
          </div>
        ))}

        <p className="ds-dim mt-5 px-[2px] text-[10.5px] font-medium leading-[1.6]">
          Each input has a fixed ceiling, so every point can be traced back to something you
          logged. These are heuristics for spotting patterns — not medical or financial advice.
        </p>
      </div>

      <BottomNav activeTab="home" />
    </div>
  );
}
