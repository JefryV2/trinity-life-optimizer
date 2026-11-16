import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme';

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function ResetScreen() {
  const params = useLocalSearchParams<{ ticket?: string | string[] }>();
  const ticket = Array.isArray(params.ticket) ? params.ticket[0] : params.ticket;
  const { resetWithTicket } = useAuth();
  const [ticketInput, setTicketInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const normalizedTicket = ticketInput.trim()
    ? safeDecode(ticketInput.match(/[?&]ticket=([^&]+)/)?.[1] ?? ticketInput.trim())
    : ticket;

  const save = async () => {
    setError(null);
    if (!normalizedTicket) {
      setError('This reset link is missing its ticket. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await resetWithTicket(normalizedTicket, password);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset the password.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.section, gap: space.xl }}>
        <PageHeader title="Password updated" />
        <AppText variant="callout" tone="secondary">
          Sign in with your new password.
        </AppText>
        <Button label="Back to sign in" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: space.section, gap: space.xl }}>
      <PageHeader title="Set a new password" />
      {ticket ? (
        <AppText variant="callout" tone="secondary">
          Choose a password for your account.
        </AppText>
      ) : (
        <>
          <AppText variant="callout" tone="secondary">
            Paste the reset link from your email, or the code it contains.
          </AppText>
          <TextField
            label="Reset link or code"
            value={ticketInput}
            onChangeText={setTicketInput}
            placeholder="Paste the whole link, or just the ticket"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            maxLength={2000}
          />
        </>
      )}

      <View style={{ gap: space.xl }}>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Repeat the password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={() => void save()}
        />
      </View>

      {error ? (
        <AppText variant="footnote" tone="danger" selectable>
          {error}
        </AppText>
      ) : null}

      <Button
        label="Set new password"
        loading={saving}
        disabled={!normalizedTicket}
        onPress={() => void save()}
      />
      <Button
        label="Back to sign in"
        variant="ghost"
        onPress={() => router.replace('/sign-in')}
      />
    </Screen>
  );
}
