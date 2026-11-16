import { useState } from 'react';
import { View } from 'react-native';

import { FormFrame } from '@/components/form-frame';
import { TextField } from '@/components/ui/text-field';
import { useFormSubmit } from '@/lib/use-form-submit';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme';

export default function PasswordScreen() {
  const { changePassword } = useAuth();
  const { saving, error, setError, submit } = useFormSubmit();
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const save = () => {
    if (next.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (next !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }
    void submit(() => changePassword(next));
  };

  return (
    <FormFrame
      title="Change password"
      subtitle="At least 8 characters. You will stay signed in on this device."
      submitLabel="Update password"
      loading={saving}
      error={error}
      onSubmit={save}
    >
      <View style={{ gap: space.xl }}>
        <TextField
          label="New password"
          value={next}
          onChangeText={setNext}
          placeholder="New password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Repeat the new password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={save}
        />
      </View>
    </FormFrame>
  );
}
