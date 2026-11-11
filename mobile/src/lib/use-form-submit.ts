import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

/** Shared save flow for every add/edit sheet: busy state, inline error, haptic + dismiss on success. */
export const useFormSubmit = () => {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (action: () => Promise<unknown>) => {
      setSaving(true);
      setError(null);
      try {
        await action();
        router.back();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not save. Try again.');
        setSaving(false);
      }
    },
    [router],
  );

  return { saving, error, setError, submit };
};