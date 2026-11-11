/**
 * Release builds normally kill the app on an uncaught JS error. That makes a
 * one-line bug look like a "crash on launch" with nothing to report. This keeps
 * the message and lets a screen show it instead.
 */

type Listener = (message: string) => void;

let listeners: Listener[] = [];
let last: string | null = null;

export const getCapturedError = () => last;

export const subscribeToErrors = (listener: Listener) => {
  listeners.push(listener);
  if (last) listener(last);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export const installCrashGuard = () => {
  const errorUtils = (globalThis as unknown as {
    ErrorUtils?: { setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void };
  }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const e = error as { message?: string; stack?: string };
    last = `${e?.message ?? String(error)}\n\n${e?.stack ?? ''}`;
    listeners.forEach((l) => l(last as string));
    if (__DEV__) console.error('[crash-guard]', error, 'fatal:', isFatal);
  });
};
