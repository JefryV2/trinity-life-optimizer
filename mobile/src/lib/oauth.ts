import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { NhostClient } from '@nhost/nhost-js';

export type OAuthProvider = 'google' | 'apple';

/**
 * This exact string must be in Nhost → Auth → Settings → Allowed redirect URLs.
 * It is also registered as the app scheme in app.json.
 */
export const OAUTH_REDIRECT = 'trinity://oauth';

const VERIFIER_KEY = 'trinity.oauth.verifier';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const base64Url = (bytes: Uint8Array) => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;

    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64[((b1 & 15) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64[b2 & 63];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** RFC 7636 verifier (43 chars) and its S256 challenge. */
const pkcePair = async () => {
  const verifier = base64Url(Crypto.getRandomBytes(32));
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
};

const providerName = (provider: OAuthProvider) => (provider === 'google' ? 'Google' : 'Apple');

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const cleanError = (
  error: string | undefined,
  description: string | undefined,
  provider?: OAuthProvider,
) => {
  const name = provider ? providerName(provider) : 'Social';
  if (error === 'disabled-endpoint') {
    return `${name} sign-in is not enabled for this project yet.`;
  }
  if (error === 'access_denied') return 'Sign-in was cancelled.';
  if (description) return description;
  if (error) return `${name} sign-in could not be completed (${error}).`;
  return `${name} sign-in could not be completed.`;
};

type Callback = {
  code: string | undefined;
  error: string | undefined;
  description: string | undefined;
};

const parseCallback = (url: string): Callback => {
  const parsed = Linking.parse(url);
  return {
    code: first(parsed.queryParams?.code),
    error: first(parsed.queryParams?.error),
    description: first(
      parsed.queryParams?.errorDescription ?? parsed.queryParams?.error_description,
    ),
  };
};

let inFlight: { code: string; promise: Promise<boolean> } | null = null;

const exchangeCode = async (client: NhostClient, code: string, verifier: string) => {
  if (inFlight?.code === code) return inFlight.promise;

  const promise = (async () => {
    const exchange = await client.auth.tokenExchange({
      code,
      codeVerifier: verifier,
    });
    if (exchange.status >= 300) {
      throw new Error('Could not finish signing in. Please try again.');
    }
    if (!client.sessionStorage.get() && !exchange.body?.session) {
      throw new Error('Sign-in succeeded but no session was returned.');
    }
    return true;
  })();

  inFlight = { code, promise };
  try {
    return await promise;
  } finally {
    if (inFlight?.promise === promise) inFlight = null;
  }
};

/**
 * Completes a callback URL. Used both by the browser sheet result and by the
 * /oauth route when Android brings the app forward via the deep link. The
 * in-flight guard makes a double callback exchange the code only once.
 */
export const completeOAuthFromUrl = async (
  client: NhostClient,
  url: string,
  provider?: OAuthProvider,
): Promise<boolean> => {
  const { code, error, description } = parseCallback(url);
  if (error) throw new Error(cleanError(error, description, provider));

  if (client.sessionStorage.get()) return true;

  if (!code) {
    throw new Error(
      `Sign-in did not return a code. Add ${OAUTH_REDIRECT} to Nhost's allowed redirect URLs.`,
    );
  }

  const verifier = await AsyncStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    throw new Error('The sign-in session expired. Please try again.');
  }

  try {
    return await exchangeCode(client, code, verifier);
  } finally {
    await AsyncStorage.removeItem(VERIFIER_KEY).catch(() => undefined);
  }
};

/**
 * Browser OAuth with PKCE. Nhost redirects back to `trinity://oauth` with a
 * short-lived code; the verifier never leaves this device and is consumed once.
 */
export const signInWithOAuth = async (
  client: NhostClient,
  provider: OAuthProvider,
): Promise<boolean> => {
  const { verifier, challenge } = await pkcePair();
  await AsyncStorage.setItem(VERIFIER_KEY, verifier);

  const url = client.auth.signInProviderURL(provider, {
    redirectTo: OAUTH_REDIRECT,
    codeChallenge: challenge,
  });

  try {
    const result = await WebBrowser.openAuthSessionAsync(url, OAUTH_REDIRECT, {
      showInRecents: true,
    });

    if (result.type !== 'success') {
      // The sheet was dismissed before Nhost handed control back.
      return false;
    }

    return await completeOAuthFromUrl(client, result.url, provider);
  } finally {
    await AsyncStorage.removeItem(VERIFIER_KEY).catch(() => undefined);
  }
};
