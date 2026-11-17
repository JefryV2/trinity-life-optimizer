/** Presentation-only copy for the score engine. Kept out of `score.ts`. */

export const PILLAR_COLOR: Record<string, string> = {
  health: '#C6F24E',
  wealth: '#FFB020',
  bonds: '#3D7BFF',
};

export const PILLAR_ROUTE: Record<string, string> = {
  health: '/health',
  wealth: '/wealth',
  bonds: '/relations',
};

/** What to actually do about each input. */
export const ACTION_LABEL: Record<string, string> = {
  steps: 'Go for a walk',
  sleep: 'Log sleep',
  exercise: 'Log a workout',
  water: 'Log water',
  mental: 'Log mood',
  savings: 'Review savings',
  spend: 'Review spending',
  contact: 'Log contact',
  mood: 'Log how it felt',
};

export const ACTION_HINT: Record<string, string> = {
  steps: 'Walk 2,000 more steps',
  sleep: 'Get to bed 30 minutes earlier',
  exercise: 'One 20-minute session',
  water: 'Two more glasses',
  mental: 'Log mood and stress',
  savings: 'Move a little more into savings',
  spend: 'Trim one expense this month',
  contact: 'Message one person',
  mood: 'Log how it felt',
};
