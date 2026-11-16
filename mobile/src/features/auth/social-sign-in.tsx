import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AppleMark } from '@/components/brand/apple-mark';
import { GoogleMark } from '@/components/brand/google-mark';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme';

type Provider = 'google' | 'apple';

// Apple sign-in needs an Apple Developer account and an enabled Nhost provider.
// Keep the button out of the UI until that exists.
const APPLE_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGNIN === '1';

interface SocialSignInProps {
  onError?: (message: string | null) => void;
  disabled?: boolean;
}

export const SocialSignIn = ({ onError, disabled = false }: SocialSignInProps) => {
  const { signInWithProvider } = useAuth();
  const [pending, setPending] = useState<Provider | null>(null);

  const run = async (provider: Provider) => {
    setPending(provider);
    onError?.(null);
    try {
      await signInWithProvider(provider);
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : 'Sign-in could not be completed.');
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <Button
        label="Continue with Google"
        variant="secondary"
        icon={<GoogleMark size={18} />}
        loading={pending === 'google'}
        disabled={disabled || pending !== null}
        onPress={() => void run('google')}
      />
      {APPLE_ENABLED && Platform.OS === 'ios' ? (
        <Button
          label="Continue with Apple"
          variant="secondary"
          icon={<AppleMark size={19} />}
          loading={pending === 'apple'}
          disabled={disabled || pending !== null}
          onPress={() => void run('apple')}
        />
      ) : null}
    </View>
  );
};
