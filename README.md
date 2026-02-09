# Trinity Life Optimizer

Trinity Life Optimizer is a **mobile‑first personal analytics app** that brings together your **Health, Wealth, and Relationships** into one beautiful, interactive dashboard. It’s designed both as a **real life companion** and as a **data‑analysis showcase** – with rich visualizations, insights, and Supabase‑backed data for all key life pillars.

---

## What the app does

### Health pillar 💚
- **Heart‑centered home dashboard**
  - Live‑style heart monitor hero with HR / HRV feel.
  - Step counter widget with circular progress and editable goals.
  - UV index and air quality widgets based on your location.
- **Tracking pages**
  - **Sleep**: modern sleep card, routine timeline, quick access actions, logs & streaks.
  - **Nutrition**: food search via Supabase Edge Function + USDA API, daily macros and calories.
  - **Exercise**: workouts, minutes, calories burned.
  - **Women’s health**: daily logs, pain, symptoms and mood, with animations.
  - **Mental health**: “Freud score” dashboard, mood history charts, compact check‑ins.
  - **Heart data**: wearable‑ready pipeline via Supabase Edge Functions.
- **Stress monitor**
  - Daily stress score blended from **sleep debt, mental stress, wealth and relations**.
  - Circle widget on the home page that flags “Calm / Manageable / Heavy load” and shows which pillar is acting as a stressor.

### Wealth pillar 💎
- **Daily wealth score** backed by Supabase tables.
- Hooks for accounts, transactions and savings rate, so you can model financial health and tie it into overall stress and goals.

### Relations pillar 🤝
- **Relations daily score** and interaction logs.
- Designed to connect relationship quality and social interactions back to mood, stress, and your overall balance.

### Insights Lab 📊 (data‑analysis showcase)
The `Insights` page is built specifically to show off analytical skills:

- **Time‑series and “maps”**
  - Sleep, steps and mood on one timeline.
  - Sleep‑vs‑mood scatterplot (“each dot is a day”).  
- **Cross‑pillar analytics**
  - Correlations (Pearson) and plain‑language explanations for:
    - Sleep ↔ Mood, Sleep ↔ Steps, Steps ↔ Mood
    - Stress ↔ Mood
    - Calories ↔ Mood
    - Women’s pain ↔ Mood
    - Relations ↔ Mood
- **Mini experiment**
  - Compares mood after “good sleep” nights vs short‑sleep nights with a clear textual takeaway.
- **Impact ranking**
  - Bar chart answering: **“What seems to matter most for your mood?”**
- **System overview (big picture)**
  - Radar chart that brings **sleep, movement, nutrition, stress load, wealth and relations** into a single shape to show overall balance and weak spots.

Mock data is generated when there isn’t enough real data yet, so all graphs and insights still work for demos and portfolio use.

---

## Tech stack

- **Frontend**: React + TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui, custom glassmorphism design system
- **Backend**: Supabase (Postgres, Row Level Security, Edge Functions)
- **Mobile**: Capacitor for wrapping the web app as a native‑like mobile app
- **Charts**: Recharts with a reusable `ChartContainer` wrapper

---

## Running the app locally

```bash
git clone https://github.com/JefryV2/trinity-life-optimizer.git
cd trinity-life-optimizer

npm install
npm run dev
```

The app runs on Vite (default: `http://localhost:5173`). It is built mobile‑first, so open it in a mobile viewport for the best experience.

---

## Environment & Supabase setup (high level)

- Create a Supabase project and set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Add any external API keys used by widgets (for example `VITE_OPENWEATHER_API_KEY` for UV and air quality).
- Apply the SQL migrations under `supabase/migrations` to create:
  - health / wealth / relations tables and daily score tables,
  - women’s health daily logs,
  - step, sleep, exercise, nutrition, and relations datasets.
- Deploy Edge Functions (e.g. `search-food`, `heart-data`) from the `supabase/functions` folder and configure the needed secrets (like USDA API keys).

If you want, you can keep the app in **demo mode** and rely on the mock data generators for the Insights Lab while you explore or present your portfolio.

---

## Why this app is interesting as a portfolio project

- Shows **full‑stack thinking**: database schemas, row‑level security, Edge Functions, and a modern mobile‑first UI.
- Demonstrates **data analysis and storytelling**: correlations, experiments, stress modeling, multi‑pillar radar view, and clear natural‑language explanations for non‑technical users.
- Ready to extend with real wearable integrations (Apple Health, Google Fit, etc.) and more advanced models if you want to push the analytics further.

Use it as both a personal life dashboard and a live example of how you think about **data, design, and user experience** together. 
