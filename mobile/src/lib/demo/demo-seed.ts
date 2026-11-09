import { addDays, isoDate } from '@/lib/format';

import { DEMO_USER_ID } from './demo-user';

type Row = Record<string, unknown>;

const day = (daysAgo: number): string => isoDate(addDays(new Date(), -daysAgo));

const at = (daysAgo: number, hour: number, minute = 0): string => {
  const date = addDays(new Date(), -daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const id = (table: string, index: number): string => `demo-${table}-${index}`;

const range = (length: number): number[] => Array.from({ length }, (_, index) => index);

/**
 * A believable 60-day history. Every number is deterministic so the demo looks
 * the same on every launch, and scores are derived from the raw rows the same
 * way the real scoring layer does.
 */
export const buildDemoDatabase = (): Record<string, Row[]> => {
  const now = new Date().toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 9, 0, 0, 0);
  const thisMonth = (dayOfMonth: number): string => {
    const today = new Date();
    const offset = Math.min(dayOfMonth, today.getDate());
    const date = new Date(monthStart);
    date.setDate(offset);
    return date.toISOString();
  };

  const sleep = range(14).map((index) => {
    const hours = [7.8, 6.9, 7.4, 8.1, 6.4, 7.2, 7.9, 6.8, 7.5, 8.0, 6.6, 7.3, 7.7, 7.1][index];
    const quality = [8, 6, 7, 9, 5, 7, 8, 6, 7, 8, 5, 7, 8, 7][index];
    return {
      id: id('sleep', index),
      user_id: DEMO_USER_ID,
      sleep_quality: quality,
      sleep_duration_hours: hours,
      bedtime: at(index + 1, 22, 45),
      wake_time: at(index, 6, 30),
      notes: index === 4 ? 'Woke up twice — late screen time.' : null,
      created_at: at(index, 6, 45),
    };
  });

  const exercise = range(9).map((index) => {
    const names = [
      ['Morning run', 'cardio', 32, 310, 'moderate'],
      ['Strength — upper', 'strength', 45, 260, 'high'],
      ['Evening walk', 'walking', 40, 160, 'low'],
      ['Yoga flow', 'flexibility', 25, 90, 'low'],
      ['Strength — lower', 'strength', 50, 300, 'high'],
      ['Cycling', 'cardio', 38, 350, 'moderate'],
      ['Evening walk', 'walking', 30, 120, 'low'],
      ['Swim', 'cardio', 35, 330, 'high'],
      ['Mobility', 'flexibility', 20, 70, 'low'],
    ][index];
    return {
      id: id('exercise', index),
      user_id: DEMO_USER_ID,
      exercise_name: names[0],
      exercise_type: names[1],
      duration_minutes: names[2],
      calories_burned: names[3],
      intensity: names[4],
      completed_at: at(index, 7 + (index % 3), 15),
      notes: null,
    };
  });

  const steps = range(14).map((index) => ({
    id: id('steps', index),
    user_id: DEMO_USER_ID,
    date: day(index),
    steps: [7840, 9120, 6350, 10480, 5210, 8300, 11200, 6890, 7760, 9450, 4300, 8650, 10120, 7180][index],
  }));

  const food = [
    ['Greek yogurt with berries', 'breakfast', 320, 22, 34, 9, 8],
    ['Chicken quinoa bowl', 'lunch', 610, 42, 58, 18, 13],
    ['Almonds', 'snack', 180, 6, 7, 15, 16],
    ['Salmon, rice and greens', 'dinner', 720, 45, 62, 24, 19],
  ].map((row, index) => ({
    id: id('food', index),
    user_id: DEMO_USER_ID,
    food_name: row[0],
    meal_type: row[1],
    servings: 1,
    total_calories: row[2],
    calories_per_serving: row[2],
    protein_g: row[3],
    carbs_g: row[4],
    fat_g: row[5],
    consumed_at: at(0, [8, 13, 16, 19][index], [10, 5, 30, 20][index]),
  }));

  const mental = range(10).map((index) => ({
    id: id('mental', index),
    user_id: DEMO_USER_ID,
    mood_rating: [8, 7, 6, 8, 5, 7, 9, 6, 8, 7][index],
    stress_level: [3, 4, 5, 2, 7, 4, 2, 6, 3, 4][index],
    energy_level: [7, 7, 6, 8, 4, 6, 9, 5, 8, 7][index],
    anxiety_level: [2, 3, 4, 2, 6, 3, 1, 5, 2, 3][index],
    notes: index === 4 ? 'Deadline week — short on recovery.' : null,
    logged_at: at(index + (index > 6 ? 1 : 0), 20, 30),
  }));

  const cycles = range(3).map((index) => ({
    id: id('cycle', index),
    user_id: DEMO_USER_ID,
    cycle_start_date: day(8 + index * 28),
    cycle_end_date: day(4 + index * 28),
    flow_intensity: index === 0 ? 'medium' : 'light',
    pain_level: [3, 2, 4][index],
    symptoms: index === 0 ? ['cramps', 'fatigue'] : ['fatigue'],
    notes: null,
    created_at: at(8 + index * 28, 9, 0),
  }));

  const healthGoals = [
    ['Average 7.5 hours of sleep', 'sleep', 7.5, 7.1, 'hours'],
    ['Walk 8,000 steps daily', 'activity', 8000, 7840, 'steps'],
    ['Strength train twice a week', 'fitness', 2, 2, 'sessions'],
  ].map((row, index) => ({
    id: id('health-goal', index),
    user_id: DEMO_USER_ID,
    title: row[0],
    description: null,
    goal_type: row[1],
    target_value: row[2],
    current_value: row[3],
    unit: row[4],
    target_date: day(-30),
    status: 'active',
    created_at: at(20 - index, 10, 0),
  }));

  const womensDaily = range(4).map((index) => ({
    id: id('womens-daily', index),
    user_id: DEMO_USER_ID,
    date: day(index),
    flow_intensity: index === 0 ? 'light' : null,
    moods: index === 0 ? ['calm', 'tired'] : ['energised'],
    symptoms: index === 0 ? ['cramps'] : [],
    pain_level: index === 0 ? 2 : 0,
    notes: null,
  }));

  const accounts = [
    ['Everyday checking', 'checking', 4820, 'USD'],
    ['High-yield savings', 'savings', 12400, 'USD'],
    ['Brokerage', 'investment', 8600, 'USD'],
  ].map((row, index) => ({
    id: id('account', index),
    user_id: DEMO_USER_ID,
    name: row[0],
    type: row[1],
    balance: row[2],
    currency: row[3],
    created_at: at(60, 10, 0),
    updated_at: now,
  }));

  const transactions: Row[] = [
    ['in', 5200, 'Salary', 'Monthly salary', 1],
    ['out', 1450, 'Housing', 'Rent', 2],
    ['out', 210, 'Utilities', 'Electricity and water', 3],
    ['out', 96, 'Subscriptions', 'Streaming and music', 4],
    ['out', 340, 'Groceries', 'Weekly shop', 6],
    ['out', 62, 'Transport', 'Metro card', 7],
    ['out', 180, 'Health', 'Gym membership', 8],
    ['out', 275, 'Groceries', 'Weekly shop', 12],
    ['out', 90, 'Dining', 'Dinner with friends', 14],
    ['out', 120, 'Shopping', 'Running shoes', 16],
    ['out', 260, 'Groceries', 'Weekly shop', 19],
    ['out', 55, 'Dining', 'Coffee and lunch', 21],
    ['out', 160, 'Utilities', 'Internet', 22],
    ['out', 42, 'Transport', 'Ride share', 24],
  ].map((row, index) => ({
    id: id('transaction', index),
    user_id: DEMO_USER_ID,
    account_id: accounts[index === 0 ? 0 : index % 2 === 0 ? 0 : 1].id,
    amount: row[1],
    category: row[2],
    direction: row[0],
    occurred_at: thisMonth(row[4] as number),
    note: row[3],
    created_at: thisMonth(row[4] as number),
  }));

  const budgets = [
    ['Groceries', 500, 420],
    ['Dining', 150, 145],
    ['Transport', 120, 104],
    ['Shopping', 200, 120],
  ].map((row, index) => ({
    id: id('budget', index),
    user_id: DEMO_USER_ID,
    category: row[0],
    period: 'monthly',
    limit_amount: row[1],
    spent_amount: row[2],
    period_start: monthStart.toISOString(),
    period_end: new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ).toISOString(),
    created_at: at(20, 10, 0),
  }));

  const investments = [
    ['Global index fund', 12.4, 92.5, 1310],
    ['Tech ETF', 5.2, 148.0, 860],
    ['Treasury bond', 10, 100, 1015],
  ].map((row, index) => ({
    id: id('investment', index),
    user_id: DEMO_USER_ID,
    instrument: row[0],
    units: row[1],
    avg_cost: row[2],
    market_value: row[3],
    created_at: at(45 - index * 5, 11, 0),
  }));

  const relationships = [
    ['Maya', 'partner', 5, 1],
    ['Dad', 'family', 5, 4],
    ['Sam', 'friend', 4, 6],
    ['Priya', 'friend', 3, 12],
    ['Jordan', 'colleague', 2, 18],
  ].map((row, index) => ({
    id: id('relationship', index),
    user_id: DEMO_USER_ID,
    name: row[0],
    relation_type: row[1],
    importance: row[2],
    last_contact_at: at(row[3] as number, 19, 0),
    notes: index === 0 ? 'Trying to keep Sunday evenings free.' : null,
    created_at: at(50, 9, 0),
    updated_at: at(row[3] as number, 19, 0),
  }));

  const interactions = [
    ['Maya', 'call', 45, 9, 1],
    ['Dad', 'call', 30, 8, 4],
    ['Sam', 'video', 50, 8, 6],
    ['Priya', 'text', 15, 7, 9],
    ['Maya', 'in-person', 120, 10, 8],
    ['Jordan', 'in-person', 40, 6, 12],
    ['Dad', 'text', 10, 7, 15],
    ['Sam', 'call', 35, 8, 18],
    ['Priya', 'call', 25, 7, 21],
    ['Maya', 'call', 40, 9, 3],
  ].map((row, index) => ({
    id: id('interaction', index),
    user_id: DEMO_USER_ID,
    relationship_id: relationships.find((person) => person.name === row[0])!.id,
    channel: row[1],
    duration_minutes: row[2],
    mood_rating: row[3],
    occurred_at: at(row[4] as number, 19, 30),
    notes: null,
  }));

  const gratitude = [
    'A slow morning coffee before anyone else woke up.',
    'Maya remembered the thing I was worried about.',
    'Finished a run I nearly skipped.',
    'Dad called just to check in.',
    'A quiet evening with no notifications.',
  ].map((text, index) => ({
    id: id('gratitude', index),
    user_id: DEMO_USER_ID,
    text,
    created_at: at(index, 21, 0),
  }));

  const qualityTime = [
    {
      id: id('quality-time', 0),
      user_id: DEMO_USER_ID,
      target_minutes_per_week: 300,
      completed_minutes: 210,
      period_start: monthStart.toISOString(),
      period_end: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ).toISOString(),
      created_at: monthStart.toISOString(),
      updated_at: now,
    },
  ];

  const heart = range(24).map((index) => ({
    id: id('heart', index),
    user_id: DEMO_USER_ID,
    heart_rate: [62, 64, 58, 71, 76, 68, 60, 59, 73, 81, 66, 63, 57, 69, 74, 72, 65, 61, 78, 83, 67, 60, 58, 64][index],
    timestamp: at(Math.floor(index / 4), 7 + (index % 4) * 3, 10),
    source_device: index % 3 === 0 ? 'manual' : 'BLE heart-rate monitor',
    activity_type: ['resting', 'resting', 'walking', 'live'][index % 4],
    confidence: index % 3 === 0 ? 1 : 0.95,
  }));

  const healthScores = range(60).map((index) => {
    const daysAgo = 59 - index;
    const wave = Math.sin(index / 5) * 9;
    return {
      id: id('health-score', index),
      user_id: DEMO_USER_ID,
      date: day(daysAgo),
      score: Math.round(74 + wave + (index % 7 === 0 ? -6 : 0)),
    };
  });

  const wealthScores = range(60).map((index) => {
    const daysAgo = 59 - index;
    const wave = Math.cos(index / 7) * 7;
    return {
      id: id('wealth-score', index),
      user_id: DEMO_USER_ID,
      date: day(daysAgo),
      score: Math.round(70 + wave),
    };
  });

  const relationsScores = range(60).map((index) => {
    const daysAgo = 59 - index;
    const wave = Math.sin(index / 4 + 1) * 8;
    return {
      id: id('relations-score', index),
      user_id: DEMO_USER_ID,
      date: day(daysAgo),
      score: Math.round(77 + wave),
    };
  });

  const goalProgress = (
    table: string,
    base: number,
  ): Row[] =>
    range(30).map((index) => {
      const daysAgo = 29 - index;
      return {
        id: id(table, index),
        user_id: DEMO_USER_ID,
        date: day(daysAgo),
        score: Math.round(base + Math.sin(index / 4) * 10),
        completed_count: (index % 3) + 1,
        total_count: 3,
      };
    });

  return {
    profiles: [
      {
        id: id('profile', 0),
        user_id: DEMO_USER_ID,
        first_name: 'Alex',
        last_name: 'Morgan',
        tier: 'demo',
        data_preferences: {
          focus: 'health',
          onboarding_goal: 'Sleep better, spend less, call family weekly',
          onboarded_at: at(60, 9, 0),
        },
        created_at: at(60, 9, 0),
        updated_at: now,
      },
    ],
    user_profiles_health: [
      {
        id: id('profile-health', 0),
        user_id: DEMO_USER_ID,
        birth_date: '1994-06-18',
        gender: 'female',
        height_cm: 168,
        weight_kg: 63.5,
        target_weight_kg: 61,
        activity_level: 'moderately_active',
        goal_type: 'maintain',
        daily_caloric_target: 2050,
        resting_heart_rate: 61,
        created_at: at(60, 9, 0),
        updated_at: now,
      },
    ],
    sleep_records: sleep,
    exercise_records: exercise,
    step_records: steps,
    hydration_records: [
      {
        id: id('hydration', 0),
        user_id: DEMO_USER_ID,
        date: day(0),
        water_intake_ml: 1750,
        target_ml: 2500,
        cups_consumed: 7,
        last_drink_time: at(0, 15, 40),
        created_at: at(0, 7, 10),
        updated_at: now,
      },
    ],
    food_entries: food,
    mental_health_logs: mental,
    menstrual_cycles: cycles,
    health_goals: healthGoals,
    womens_health_daily_logs: womensDaily,
    finance_accounts: accounts,
    transactions,
    budgets,
    investments,
    relationships,
    interactions,
    gratitude_entries: gratitude,
    quality_time_goals: qualityTime,
    heart_rate_data: heart,
    health_daily_scores: healthScores,
    wealth_daily_scores: wealthScores,
    relations_daily_scores: relationsScores,
    health_goals_progress: goalProgress('health-goal-progress', 72),
    wealth_goals_progress: goalProgress('wealth-goal-progress', 68),
    relations_goals_progress: goalProgress('relations-goal-progress', 76),
  };
};
