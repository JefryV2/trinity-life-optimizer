# Trinity — native app

The native companion to Trinity Life Optimizer. Expo + React Native + Expo Router,
backed by the same Supabase project as the web app.

## Screens

| Area | Route | What it does |
| --- | --- | --- |
| Auth | `src/app/sign-in.tsx`, `sign-up.tsx` | Email/password via Supabase Auth |
| Onboarding | `src/app/onboarding.tsx` | Name, body baseline, focus pillar, feature flags |
| Today | `src/app/(tabs)/index.tsx` | Trinity score, vitals, quick log, coach notes |
| Health | `src/app/(tabs)/health/index.tsx` | Overview, nutrition, fitness, sleep, mental, heart, women's health |
| Wealth | `src/app/(tabs)/wealth/index.tsx` | Net worth, accounts, spending, budgets, investments, goals |
| Relations | `src/app/(tabs)/relations.tsx` | People, contact log, gratitude, quality time |
| Insights | `src/app/insights.tsx` | 7/30-day trends, radar, correlations |
| More | `src/app/(tabs)/more.tsx` | Entry point to the screens below |
| Profile | `src/app/profile/` | Name, body metrics, preferences, achievements |
| Calendar | `src/app/calendar.tsx` | Daily pillar scores |
| Hydration | `src/app/hydration.tsx` | Water tracking and reminders |

Every add/edit flow lives in `src/app/add/[form].tsx`, which routes to a form in
`src/features/*/components/*-forms.tsx` and opens as a native form sheet.

## Structure

```
src/
  app/            Expo Router routes only
  components/     UI primitives, charts, brand mark
  features/       Queries, mutations, and screen sections per pillar
  lib/            Supabase client, scoring, formatting, navigation
  providers/      Auth session provider
  theme/          Palette, spacing, type scale, radii
```

Scores are computed in `src/lib/scoring.ts` from the same records the web app
uses, so the two clients cannot disagree. Data is fetched with React Query;
mutations invalidate the pillar, dashboard, and insights caches.

## Setup

```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key
npx expo start
```

Environment variables (only `EXPO_PUBLIC_*` values reach the bundle):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENWEATHER_API_KEY`

The app uses a development build because of `react-native-ble-plx`,
`expo-notifications`, `expo-sensors`, and `expo-location`:

```bash
npx expo run:android
npx expo run:ios
```

## Verification

```bash
npx tsc --noEmit
npx expo export --platform android
npx expo-doctor
```
