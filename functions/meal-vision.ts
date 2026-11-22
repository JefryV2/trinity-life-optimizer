/**
 * Nhost Function: POST /v1/meal-vision
 *
 * The Gemini key lives only in this server-side function. The app sends a
 * Nhost access token plus one base64 image; the function verifies the token,
 * reserves a per-user quota slot in Postgres, calls Gemini, and returns only
 * the normalised food estimate.
 *
 * Nhost environment:
 *   GEMINI_API_KEY                 required
 *   GEMINI_MODEL                   default gemini-2.5-flash
 *   MEAL_VISION_DAILY_LIMIT        default 5
 *   MEAL_VISION_MONTHLY_LIMIT      default 100
 *   MEAL_VISION_GLOBAL_DAILY_LIMIT default 300
 *   MEAL_VISION_MAX_IMAGE_BYTES    default 3500000
 *   MEAL_VISION_TIMEOUT_MS         default 6500
 *
 * NHOST_* environment variables are injected automatically.
 */

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  invocationId?: string;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  set: (name: string, value: string) => ResponseLike;
  json: (body: unknown) => void;
  end: () => void;
};

type Usage = {
  allowed: boolean;
  reason: string | null;
  usedToday: number;
  remainingToday: number;
  usedMonth: number;
  remainingMonth: number;
  globalRemaining: number;
};

const FEATURE = 'meal_vision';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_DAILY = 5;
const DEFAULT_MONTHLY = 100;
const DEFAULT_GLOBAL = 300;
const DEFAULT_MAX_IMAGE = 3_500_000;
const DEFAULT_TIMEOUT = 6_500;

const intEnv = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

const header = (req: RequestLike, name: string) => {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const jsonRes = (
  res: ResponseLike,
  status: number,
  body: unknown,
) => {
  res.status(status).set('content-type', 'application/json');
  res.json(body);
};

const authUser = async (req: RequestLike) => {
  const authorization = header(req, 'authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const bases = [
    process.env.NHOST_AUTH_URL?.replace(/\/$/, ''),
    process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION
      ? `https://${process.env.NHOST_SUBDOMAIN}.auth.${process.env.NHOST_REGION}.nhost.run/v1/auth`
      : null,
    process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION
      ? `https://${process.env.NHOST_SUBDOMAIN}.auth.${process.env.NHOST_REGION}.nhost.run/v1`
      : null,
  ].filter(Boolean) as string[];

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/user`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as { id?: string; user?: { id?: string } };
      const id = payload.id ?? payload.user?.id;
      if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
    } catch {
      // Try the next auth URL shape.
    }
  }
  return null;
};

const hasuraBases = () => {
  const raw = process.env.NHOST_HASURA_URL ?? process.env.NHOST_GRAPHQL_URL ?? '';
  const internal = raw
    .replace(/\/v1\/graphql\/?$/, '')
    .replace(/\/v2\/query\/?$/, '')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
  const publicBase =
    process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION
      ? `https://${process.env.NHOST_SUBDOMAIN}.hasura.${process.env.NHOST_REGION}.nhost.run`
      : '';
  return [internal, publicBase].filter(Boolean);
};

const consumeQuota = async (
  userId: string,
  daily: number,
  monthly: number,
  globalDaily: number,
) => {
  const bases = hasuraBases();
  const secret = process.env.NHOST_ADMIN_SECRET;
  if (!bases.length || !secret) throw new Error('Hasura admin environment is missing.');

  const sql = `select public.consume_ai_scan('${userId}'::uuid, '${FEATURE}', ${daily}, ${monthly}, ${globalDaily})::text as usage`;
  let lastStatus = 0;

  for (const base of bases) {
    // Internal Hasura speaks /v2/query; Nhost's public proxy also accepts the
    // same run_sql payload on /v1/query. Try both without exposing either.
    for (const path of ['/v2/query', '/v1/query']) {
      try {
        const response = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': secret,
          },
          body: JSON.stringify({
            type: 'run_sql',
            args: { source: 'default', read_only: false, sql },
          }),
          signal: AbortSignal.timeout(4_000),
        });
        lastStatus = response.status;
        if (!response.ok) continue;
        const payload = (await response.json()) as { result?: unknown[][] };
        const raw = payload.result?.[1]?.[0];
        if (typeof raw !== 'string') continue;
        return JSON.parse(raw) as Usage;
      } catch {
        // Try the next transport.
      }
    }
  }

  throw new Error(`Quota service returned ${lastStatus || 'no response'}.`);
};

const limitMessage = (usage: Usage) => {
  if (usage.reason === 'global_limit') {
    return 'Photo reading is busy right now. Add ingredients manually or try again later.';
  }
  if (usage.reason === 'monthly_limit') {
    return 'You have used this month’s photo reads. Add ingredients manually; your allowance resets next month.';
  }
  return 'You have used today’s photo reads. Add ingredients manually or try again tomorrow.';
};

const PROMPT = `You are estimating a meal from one photo. Return ONLY valid JSON, no markdown.
Schema:
{"items":[{"name":"grilled chicken breast","grams":150,"calories":248,"protein":46,"carbs":0,"fat":5,"fiber":0,"sugar":0,"sodium":320,"confidence":0.86}]}
Rules:
- List each visible edible component separately, including oils, sauces, sides and drinks.
- grams is the estimated edible portion, not the plate weight.
- calories and macros are for that estimated portion; use common food composition values.
- confidence is 0 to 1. Be conservative when the image is ambiguous or there is no size reference.
- Do not invent packaging, brands, or ingredients that are not visible.
- Keep names short and generic (e.g. "white rice", "fried egg").
- If the plate cannot be identified, return {"items":[]}.
`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          fiber: { type: 'NUMBER' },
          sugar: { type: 'NUMBER' },
          sodium: { type: 'NUMBER' },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'grams', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['items'],
};

class GeminiFailure extends Error {
  readonly code: 'missing_key' | 'auth' | 'model' | 'quota' | 'timeout' | 'network' | 'provider';
  readonly status?: number;
  readonly detail?: string;

  constructor(
    code: GeminiFailure['code'],
    message: string,
    status?: number,
    detail?: string,
  ) {
    super(message);
    this.name = 'GeminiFailure';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const geminiModels = () => {
  const configured = process.env.GEMINI_MODEL?.trim();
  return Array.from(
    new Set(
      [configured || DEFAULT_MODEL, 'gemini-2.5-flash-lite', 'gemini-2.0-flash'].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );
};

const callGemini = async (
  model: string,
  key: string,
  imageBase64: string,
  mimeType: string,
  timeout: number,
) => {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType, data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
        signal: AbortSignal.timeout(timeout),
      },
    );
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new GeminiFailure('timeout', 'Gemini timed out.');
    }
    throw new GeminiFailure('network', 'Could not reach Gemini.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let googleStatus = '';
    let googleMessage = '';
    try {
      const parsed = JSON.parse(body) as { error?: { status?: unknown; message?: unknown } };
      googleStatus = typeof parsed.error?.status === 'string' ? parsed.error.status : '';
      googleMessage = typeof parsed.error?.message === 'string' ? parsed.error.message : '';
    } catch {
      // Keep the status code; the body may be HTML.
    }

    const text = `${googleStatus} ${googleMessage}`.toLowerCase();
    const code: GeminiFailure['code'] =
      response.status === 429
        ? 'quota'
        : response.status === 404
          ? 'model'
          : response.status === 401 || response.status === 403
            ? 'auth'
            : response.status === 400 && /api key|permission|not valid|invalid/.test(text)
              ? 'auth'
              : 'provider';

    throw new GeminiFailure(
      code,
      `Gemini returned ${response.status}${googleStatus ? ` ${googleStatus}` : ''}`,
      response.status,
      googleMessage,
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new GeminiFailure('provider', 'Gemini returned no estimate.');

  const clean = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  return JSON.parse(clean) as { items?: unknown[] };
};

const gemini = async (imageBase64: string, mimeType: string) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiFailure('missing_key', 'GEMINI_API_KEY is not configured.');
  const timeout = intEnv('MEAL_VISION_TIMEOUT_MS', DEFAULT_TIMEOUT, 2_000, 9_000);
  let lastFailure: GeminiFailure | null = null;

  for (const model of geminiModels()) {
    try {
      return await callGemini(model, key, imageBase64, mimeType, timeout);
    } catch (error) {
      if (!(error instanceof GeminiFailure)) throw error;
      lastFailure = error;
      // A model that is not enabled for this key should not block the next
      // candidate. Auth, quota, timeout and network failures do.
      if (error.code !== 'model' && error.status !== 404) throw error;
    }
  }

  throw lastFailure ?? new GeminiFailure('provider', 'No Gemini model was available.');
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.set('access-control-allow-origin', '*');
  res.set('access-control-allow-headers', 'authorization, content-type');
  res.set('access-control-allow-methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    jsonRes(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const userId = await authUser(req);
  if (!userId) {
    jsonRes(res, 401, { error: 'unauthorized', message: 'Sign in to read a meal photo.' });
    return;
  }

  const body = (req.body ?? {}) as { imageBase64?: unknown; mimeType?: unknown };
  const imageBase64 =
    typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:[^;]+;base64,/, '') : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg';
  if (!imageBase64) {
    jsonRes(res, 400, { error: 'missing_image', message: 'A meal photo is required.' });
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    jsonRes(res, 415, { error: 'unsupported_image', message: 'Use a JPEG, PNG or WebP photo.' });
    return;
  }

  const imageBytes = Buffer.from(imageBase64, 'base64');
  const maxBytes = intEnv('MEAL_VISION_MAX_IMAGE_BYTES', DEFAULT_MAX_IMAGE, 250_000, 4_000_000);
  if (imageBytes.byteLength > maxBytes) {
    jsonRes(res, 413, {
      error: 'image_too_large',
      message: 'That photo is too large. Try again or add ingredients manually.',
    });
    return;
  }

  const daily = intEnv('MEAL_VISION_DAILY_LIMIT', DEFAULT_DAILY, 1, 100);
  const monthly = intEnv('MEAL_VISION_MONTHLY_LIMIT', DEFAULT_MONTHLY, 1, 1_000);
  const globalDaily = intEnv('MEAL_VISION_GLOBAL_DAILY_LIMIT', DEFAULT_GLOBAL, 1, 10_000);

  let usage: Usage;
  try {
    usage = await consumeQuota(userId, daily, monthly, globalDaily);
  } catch (error) {
    console.error('meal-vision quota failed', req.invocationId, error);
    jsonRes(res, 503, {
      error: 'quota_unavailable',
      message: 'Photo reading is unavailable right now. Add ingredients manually.',
    });
    return;
  }

  if (!usage.allowed) {
    jsonRes(res, 429, {
      error: 'limit_reached',
      code: usage.reason,
      message: limitMessage(usage),
      usage,
    });
    return;
  }

  try {
    const parsed = await gemini(imageBase64, mimeType);
    const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 20) : [];
    jsonRes(res, 200, { items, usage });
  } catch (error) {
    const failure =
      error instanceof GeminiFailure
        ? error
        : new GeminiFailure(
            'provider',
            error instanceof Error ? error.message : 'Unknown vision error.',
          );
    console.error('meal-vision provider failed', req.invocationId, {
      code: failure.code,
      status: failure.status,
      message: failure.message,
      detail: failure.detail,
    });
    const message =
      failure.code === 'missing_key'
        ? 'Photo reading is not configured yet. Add what you see below.'
        : failure.code === 'timeout'
          ? 'Reading took too long. Add what you see below, or try again.'
          : failure.code === 'quota'
            ? 'Photo reading is busy right now. Add what you see below, or try again later.'
            : failure.code === 'auth'
              ? 'Photo reading is unavailable right now. Add what you see below.'
              : 'I could not read that photo. Add what you see below.';
    jsonRes(res, 503, {
      error: 'vision_unavailable',
      code: failure.code,
      message,
      // Temporary diagnostic: the provider message explains a 404 or 400
      // without exposing the key. Remove once the function is healthy.
      detail: failure.detail ? failure.detail.slice(0, 300) : null,
      usage,
    });
  }
}
