/** node --experimental-strip-types src/lib/experiment.test.ts */
import { evaluateExperiment, leverByKey, dayMeetsLever, type SnapshotDay } from './experiment.ts';

let failures = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) {
    failures += 1;
    console.error(`FAIL  ${name}`);
  } else {
    console.log(`ok    ${name}`);
  }
};

const sleep = leverByKey('sleep')!;

const day = (over: Partial<SnapshotDay>): SnapshotDay => ({
  date: '2026-11-01',
  total: 60,
  mood: 3,
  sleep_hours: 6,
  steps: 5000,
  water_ml: 1500,
  exercise_min: 10,
  savings_rate: 10,
  interactions: 1,
  ...over,
});

check('missing metric is unknown, not failed', dayMeetsLever(sleep, day({ sleep_hours: null })) === null);
check('meets at the threshold', dayMeetsLever(sleep, day({ sleep_hours: 7 })) === true);
check('fails below the threshold', dayMeetsLever(sleep, day({ sleep_hours: 6.9 })) === false);

const strongWeek = [
  day({ sleep_hours: 7.5, total: 70, mood: 4 }),
  day({ sleep_hours: 8, total: 72, mood: 4 }),
  day({ sleep_hours: 7.2, total: 68, mood: 4 }),
  day({ sleep_hours: 5.5, total: 55, mood: 2 }),
  day({ sleep_hours: 6, total: 58, mood: 2 }),
];
const strong = evaluateExperiment(sleep, strongWeek);
check('counts days on each side', strong.met === 3 && strong.missed === 2);
check('computes a positive score delta', (strong.scoreDelta ?? 0) > 10);
check('computes a positive mood delta', (strong.moodDelta ?? 0) > 0);
check('headline names the lever and the gain', /Sleep 7h\+ lifts your score/.test(strong.headline));
check('confidence is fair with 3 and 2', strong.confidence === 'fair');

const thin = evaluateExperiment(sleep, [day({ sleep_hours: 8, total: 80 }), day({ sleep_hours: 6, total: 60 })]);
check('one day each side is not enough', thin.confidence === 'none');
check('thin data is honest about it', /Not enough days/.test(thin.headline));

const noMood = evaluateExperiment(sleep, [
  day({ sleep_hours: 8, total: 80, mood: null }),
  day({ sleep_hours: 8, total: 80, mood: null }),
  day({ sleep_hours: 6, total: 60, mood: null }),
  day({ sleep_hours: 6, total: 60, mood: null }),
]);
check('no mood logged means no mood claim', noMood.moodDelta === null);
check('score claim still works without mood', noMood.scoreDelta === 20);

const unlogged = evaluateExperiment(sleep, [day({ sleep_hours: null }), day({ sleep_hours: null })]);
check('unlogged days produce no comparison', unlogged.scoreDelta === null && unlogged.met === 0);

const regression = evaluateExperiment(sleep, [
  day({ sleep_hours: 8, total: 50 }),
  day({ sleep_hours: 8, total: 52 }),
  day({ sleep_hours: 5, total: 70 }),
  day({ sleep_hours: 5, total: 72 }),
]);
check('a negative delta is reported as no help', /did not help/.test(regression.headline));
check('negative delta is signed correctly', (regression.scoreDelta ?? 0) < 0);

if (failures > 0) {
  console.error(`\n${failures} failing check(s)`);
  process.exit(1);
}
console.log('\nall experiment checks passed');
