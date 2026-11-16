import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import { BottomNav } from '@/components/Navigation/BottomNav';
import { Group, PillButton, Topline } from '@/components/ds';
import { useExperiments } from '@/hooks/use-experiments';
import { dayMeetsLever, type Lever } from '@/lib/experiment';

const PILLAR_COLOR: Record<string, string> = {
  health: '#c6f24e',
  wealth: '#ffb020',
  bonds: '#3d7bff',
};

const WINDOW = 7;

/** One lever, seven days, judged against the days that were logged anyway. */
export default function Experiments() {
  const navigate = useNavigate();
  const {
    experiment,
    lever,
    days,
    verdict,
    levers,
    loading,
    busy,
    dayIndex,
    isRunning,
    start,
    finish,
  } = useExperiments();

  // one lever per pillar, so the choice is a choice and not six variants of health
  const recommended = useMemo(() => {
    const preferred = ['sleep', 'steps', 'savings', 'contact'];
    const ordered = preferred
      .map((key) => levers.find((item) => item.key === key))
      .filter((item): item is Lever => Boolean(item));
    return ordered.filter((item) => item.key !== experiment?.lever);
  }, [levers, experiment?.lever]);

  const dots = Array.from({ length: WINDOW }, (_, index) => {
    const date = experiment
      ? new Date(new Date(`${experiment.started_on}T00:00:00`).getTime() + index * 864e5)
          .toISOString()
          .slice(0, 10)
      : null;
    const day = date ? days.find((row) => row.date === date) : undefined;
    const met = lever && day ? dayMeetsLever(lever, day) : null;
    return { index, met, logged: Boolean(day) };
  });

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
                Experiments
              </span>
            </span>
          }
          right={format(new Date(), 'EEE d MMM').toUpperCase()}
        />

        {loading ? (
          <p className="ds-body mt-4">Loading…</p>
        ) : experiment && lever ? (
          <>
            <div className="reveal pt-4" style={{ ['--d' as string]: '0ms' }}>
              <div className="cap">{isRunning ? 'RUNNING' : 'FINISHED'}</div>
              <div className="mt-[2px] flex items-end gap-[10px]">
                <span className="ds-num text-[40px] leading-[1.05] tracking-[-0.04em]">
                  {lever.label}
                </span>
              </div>
              <p className="ds-body mt-[6px]">
                {isRunning
                  ? `Day ${dayIndex} of ${WINDOW} · ${lever.rule}`
                  : `${experiment.started_on} → ${experiment.ends_on}`}
              </p>
            </div>

            <div className="reveal mt-4" style={{ ['--d' as string]: '60ms' }}>
              <Group className="px-[15px] py-[14px]">
                <div className="flex items-center justify-between">
                  <span className="ds-label text-[9px]">THE WEEK</span>
                  <span className="ds-dim text-[10px] font-bold tracking-[0.1em]">
                    {dots.filter((dot) => dot.met).length} OF {WINDOW} MET
                  </span>
                </div>
                <div className="mt-[12px] flex gap-[6px]">
                  {dots.map((dot) => (
                    <div
                      key={dot.index}
                      title={dot.met === null ? 'Not logged' : dot.met ? 'Met' : 'Missed'}
                      className="h-[26px] flex-1 rounded-[5px]"
                      style={{
                        background:
                          dot.met === null
                            ? '#17171a'
                            : dot.met
                              ? PILLAR_COLOR[lever.pillar]
                              : '#2a2a2e',
                      }}
                    />
                  ))}
                </div>
                <div className="ds-dim mt-[9px] text-[9px] font-bold uppercase tracking-[0.1em]">
                  {lever.rationale}
                </div>
              </Group>
            </div>

            {verdict && (
              <div className="reveal mt-4" style={{ ['--d' as string]: '120ms' }}>
                <div className="sec-h">
                  <span className="idx">01</span>
                  <span>VERDICT</span>
                  <span className="rule" />
                  <span className="ds-dim text-[9px] font-bold uppercase tracking-[0.12em]">
                    {verdict.confidence === 'none' ? 'NOT ENOUGH' : verdict.confidence.toUpperCase()}
                  </span>
                </div>
                <Group className="px-[15px] py-[14px]">
                  <div className="text-[16px] font-extrabold leading-tight">{verdict.headline}</div>
                  <p className="ds-body mt-[5px] text-[12.5px]">{verdict.detail}</p>

                  {verdict.scoreOn !== null && verdict.scoreOff !== null && (
                    <div className="mt-[12px] flex flex-col gap-[10px]">
                      {[
                        { label: `MET ${verdict.met}×`, value: verdict.scoreOn, tone: '#c6f24e' },
                        { label: `MISSED ${verdict.missed}×`, value: verdict.scoreOff, tone: '#4e4e56' },
                      ].map((row, index) => (
                        <div key={row.label}>
                          <div className="flex items-baseline justify-between">
                            <span className="ds-label text-[9px]">{row.label}</span>
                            <span className="ds-value text-[15px]">{row.value}</span>
                          </div>
                          <div className="mt-[7px] h-[5px] overflow-hidden rounded-pill bg-[#1e1e22]">
                            <div
                              className="grow h-full rounded-pill"
                              style={{
                                width: `${Math.max(3, row.value)}%`,
                                background: row.tone,
                                ['--d' as string]: `${160 + index * 60}ms`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Group>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              {isRunning ? (
                <>
                  <PillButton variant="ghost" onClick={() => void finish('abandoned')} disabled={busy}>
                    END EARLY
                  </PillButton>
                  <PillButton onClick={() => void finish('done')} disabled={busy} right="✓">
                    FINISH
                  </PillButton>
                </>
              ) : (
                <>
                  <PillButton variant="ghost" onClick={() => navigate('/why')}>
                    SEE READING
                  </PillButton>
                  <PillButton onClick={() => void finish('done')} disabled={busy} right="+">
                    NEW WEEK
                  </PillButton>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="reveal pt-4" style={{ ['--d' as string]: '0ms' }}>
              <div className="cap">START A WEEK</div>
              <h1 className="ds-num mt-[2px] text-[40px] leading-[1.05] tracking-[-0.04em]">
                One lever
              </h1>
              <p className="ds-body mt-[6px]">
                Pick a single rule to hold for seven days. The app already records the days — at the
                end it compares the ones you met with the ones you missed.
              </p>
            </div>

            <div className="reveal mt-4" style={{ ['--d' as string]: '60ms' }}>
              <div className="sec-h">
                <span className="idx">01</span>
                <span>CHOOSE</span>
                <span className="rule" />
              </div>
              <Group padded>
                {recommended.map((item: Lever, index) => (
                  <div key={item.key} className={index === 0 ? 'py-[12px]' : 'row-div py-[12px]'}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14.5px] font-extrabold leading-tight">{item.label}</span>
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: PILLAR_COLOR[item.pillar] }}
                      >
                        {item.pillar}
                      </span>
                    </div>
                    <p className="ds-dim mt-[4px] text-[11px] font-medium leading-[1.5]">
                      {item.rationale}
                    </p>
                    <button
                      onClick={() => void start(item)}
                      disabled={busy}
                      className="press ds-gain mt-[8px] text-[10px] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
                    >
                      START 7 DAYS →
                    </button>
                  </div>
                ))}
              </Group>
              <p className="ds-dim mt-3 px-[2px] text-[10.5px] font-medium leading-[1.6]">
                A week is judged from the days you logged — up to three days on each side of the
                rule. You can end it early at any point; ending early is not a failure.
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav activeTab="home" />
    </div>
  );
}
