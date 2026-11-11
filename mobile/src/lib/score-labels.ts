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
