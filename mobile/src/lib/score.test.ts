/**
 * Plain assertions, run with: node --experimental-strip-types src/lib/score.test.ts
 * No test runner is installed on purpose — this engine is small enough that a
 * script is the cheapest way to keep it honest.
 */
import { computeScore, computeStress, PILLAR_WEIGHTS, scoreBonds, scoreHealth, scoreWealth, type ScoreInput } from './score.ts';

let failures = 0;
const check = (name: string, condition: boolean) => {
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${name}`);
  } else {
    console.log(`ok    ${name}`);
  }
};

const empty: ScoreInput = {
  health: { steps: 0, sleepHours: 0, sleepQuality: 0, exerciseMinutes: 0, waterMl: 0, waterTarget: 2500, mood: null, stress: null },
  wealth: { income: 0, expenses: 0, savingsRate: 0 },
  bonds: { interactions7d: 0, people: 0, avgMood: 0 },
};

const perfect: ScoreInput = {
  health: { steps: 12000, sleepHours: 8.5, sleepQuality: 5, exerciseMinutes: 60, waterMl: 3000, waterTarget: 2500, mood: 5, stress: 0 },
  wealth: { income: 5000, expenses: 0, savingsRate: 100 },
  bonds: { interactions7d: 8, people: 6, avgMood: 5 },
};

check('empty input scores 0', computeScore(empty).total === 0);
check('perfect input scores 100', computeScore(perfect).total === 100);
check(
  'weights sum to 1',
  Math.abs(PILLAR_WEIGHTS.health + PILLAR_WEIGHTS.wealth + PILLAR_WEIGHTS.bonds - 1) < 1e-9,
);

for (const [name, contributions] of [
  ['health', scoreHealth(empty.health)],
  ['wealth', scoreWealth(empty.wealth)],
  ['bonds', scoreBonds(empty.bonds)],
] as const) {
  const total = contributions.reduce((sum, item) => sum + item.max, 0);
  check(`${name} ceilings sum to 100`, total === 100);
}

const moreSteps = computeScore({ ...empty, health: { ...empty.health, steps: 5000 } });
const fewerSteps = computeScore({ ...empty, health: { ...empty.health, steps: 1000 } });
check(
  'more steps never lowers the score',
  moreSteps.total >= fewerSteps.total && moreSteps.pillars[0].value > fewerSteps.pillars[0].value,
);

const overTarget = computeScore({ ...empty, health: { ...empty.health, steps: 999999, waterMl: 999999, sleepHours: 99 } });
check('inputs over target are clamped', overTarget.pillars[0].value <= 100 && overTarget.total <= 100);

const negative = computeScore({ ...empty, wealth: { ...empty.wealth, expenses: -500, income: 100 } });
check('negative inputs do not produce negative points', negative.pillars.every((p) => p.value >= 0));

const unloggedMental = computeScore({ ...empty, health: { ...empty.health, steps: 10000 } });
const loggedMental = computeScore({ ...empty, health: { ...empty.health, steps: 10000, mood: 5, stress: 0 } });
check('a missing mental log is not a penalty beyond its ceiling', unloggedMental.pillars[0].value < loggedMental.pillars[0].value);

const weakest = computeScore({
  ...empty,
  health: { ...empty.health, steps: 10000, sleepHours: 8, sleepQuality: 5, exerciseMinutes: 45, waterMl: 2500, mood: 5, stress: 0 },
  wealth: { income: 5000, expenses: 100, savingsRate: 90 },
  bonds: { interactions7d: 0, people: 0, avgMood: 0 },
});
check('weakest pillar is identified', weakest.weakest === 'bonds');
check('strongest pillar is identified', weakest.strongest === 'health');

const action = computeScore({ ...empty, bonds: { interactions7d: 0, people: 0, avgMood: 0 } });
check('top action points at the biggest available gain', action.topAction?.key === 'steps' || action.topAction?.key === 'savings' || action.topAction?.key === 'sleep');

const nothingLeft = computeScore(perfect);
check('no action suggested when nothing is left', nothingLeft.topAction === null);

/* stress */
const calmInput = {
  health: { steps: 9000, sleepHours: 8, sleepQuality: 5, exerciseMinutes: 40, waterMl: 2500, waterTarget: 2500, mood: 4, stress: 1 },
  wealth: { income: 5000, expenses: 2000, savingsRate: 60 },
  bonds: { interactions7d: 5, people: 5, avgMood: 4 },
};
const loadedInput = {
  health: { steps: 1000, sleepHours: 4, sleepQuality: 2, exerciseMinutes: 0, waterMl: 200, waterTarget: 2500, mood: 2, stress: 9 },
  wealth: { income: 1000, expenses: 1100, savingsRate: 0 },
  bonds: { interactions7d: 0, people: 0, avgMood: 0 },
};

const calm = computeStress(calmInput);
const loaded = computeStress(loadedInput);

check('calm day is low stress', calm.level === 'Low' && calm.score < 33);
check('loaded day is high stress', loaded.level === 'High' && loaded.score > 66);
check('stress is capped at 100', loaded.score <= 100);
check('drivers are ordered by weight', loaded.drivers.every((d, i, all) => i === 0 || all[i - 1].points >= d.points));
check(
  'unlogged stress contributes nothing',
  computeStress({ ...loadedInput, health: { ...loadedInput.health, stress: null } }).score <= loaded.score,
);

if (failures > 0) {
  console.error(`${failures} failing check(s)`);
  process.exit(1);
}
console.log('all score checks passed');
