# Meal vision function

`meal-vision.ts` is the only place the Gemini key lives. The app sends one photo
and the user's Nhost access token; the function verifies the token, reserves a
quota slot in Postgres, calls Gemini, and returns editable food estimates.

## Nhost environment variables

Set these in **Nhost Dashboard → Settings → Environment variables**. Never put
`GEMINI_API_KEY` in `mobile/.env`, the app bundle, or the APK.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | required | Google AI Studio key |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Vision model |
| `MEAL_VISION_DAILY_LIMIT` | `5` | Photo reads per user per UTC day |
| `MEAL_VISION_MONTHLY_LIMIT` | `100` | Photo reads per user per UTC month |
| `MEAL_VISION_GLOBAL_DAILY_LIMIT` | `300` | Project-wide daily ceiling |
| `MEAL_VISION_MAX_IMAGE_BYTES` | `3500000` | Decoded image cap |
| `MEAL_VISION_TIMEOUT_MS` | `6500` | Gemini timeout (Starter functions stop at 10s) |

`NHOST_ADMIN_SECRET`, `NHOST_AUTH_URL`, `NHOST_HASURA_URL` and the other
`NHOST_*` variables are injected by Nhost automatically.

## Deploy

Nhost deploys functions from the connected GitHub repository. Requirements:

1. The Nhost project is connected to this repository.
2. The `functions/` directory is at the repository root.
3. `GEMINI_API_KEY` is set in the Nhost dashboard.
4. Push the commit. Nhost builds `functions/meal-vision.ts` at
   `/v1/meal-vision` and skips unchanged functions on later deploys.

Then set the app endpoint:

```dotenv
EXPO_PUBLIC_MEAL_VISION_ENDPOINT=https://<subdomain>.functions.<region>.nhost.run/v1/meal-vision
```

The APK must be rebuilt after changing that public env value. The endpoint is
public, but every request needs a valid Nhost access token and counts against
the quota.

## Request / response

```http
POST /v1/meal-vision
Authorization: Bearer <nhost access token>
Content-Type: application/json

{ "imageBase64": "<base64 jpeg>", "mimeType": "image/jpeg" }
```

```json
{
  "items": [
    {
      "name": "grilled chicken breast",
      "grams": 150,
      "calories": 248,
      "protein": 46,
      "carbs": 0,
      "fat": 5,
      "fiber": 0,
      "sugar": 0,
      "sodium": 320,
      "confidence": 0.86
    }
  ],
  "usage": { "remainingToday": 4, "remainingMonth": 39, "usedToday": 1, "usedMonth": 1 }
}
```

`429` returns `{ "error": "limit_reached", "code": "daily_limit" | "monthly_limit" | "global_limit", "message": "...", "usage": { ... } }`.
The app shows that message and keeps manual entry available.

## Quota storage

`db/meal-vision-usage.sql` creates `public.ai_usage_events` and the
`public.consume_ai_scan(...)` function. A transaction-scoped advisory lock makes
the check + insert atomic, so simultaneous requests cannot pass the last free
slot. The reservation is written before the provider call: a failed or timed-out
provider request still counts, which prevents hammering Gemini.

The quota is intentionally server-side. When Auxo moves to plan-based limits,
read the plan in the function and pass those numbers into `consume_ai_scan`
instead of the env defaults; the table and the atomic reservation stay the same.

The image is not stored. Only a `(user_id, feature, created_at)` row is kept.
