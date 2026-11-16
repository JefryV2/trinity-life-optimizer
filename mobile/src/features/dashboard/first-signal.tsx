import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { openAdd } from '@/lib/navigation';
import { space } from '@/theme';

type Focus = 'health' | 'wealth' | 'relations';

interface FirstSignalProps {
  focus: Focus;
  people: number;
}

export const FirstSignal = ({ focus, people }: FirstSignalProps) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const content =
    focus === 'wealth'
      ? {
          title: 'Start with one expense.',
          body: 'A single transaction gives the wealth ring a starting point.',
          action: 'Add an expense',
          onPress: () => openAdd('transaction'),
        }
      : focus === 'relations'
        ? people === 0
          ? {
              title: 'Start with one person.',
              body: 'Add someone you want to keep close. Then log your last conversation.',
              action: 'Add a person',
              onPress: () => openAdd('person'),
            }
          : {
              title: 'Start with one conversation.',
              body: 'Log the last time you spoke. The bond ring reads contact, not message count.',
              action: 'Log a conversation',
              onPress: () => openAdd('interaction'),
            }
        : {
            title: 'Start with last night.',
            body: 'One sleep log gives the health ring something real to read.',
            action: 'Log last night',
            onPress: () => openAdd('sleep'),
          };

  return (
    <Card raised style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.8 }}>
          START HERE
        </AppText>
        <AppText variant="headline">{content.title}</AppText>
        <AppText variant="footnote" tone="secondary">
          {content.body}
        </AppText>
      </View>
      <Button label={content.action} onPress={content.onPress} />
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => setDismissed(true)}
        style={{ alignSelf: 'center', minHeight: 28, justifyContent: 'center' }}
      >
        <AppText variant="footnote" tone="tertiary">
          Not now
        </AppText>
      </Pressable>
    </Card>
  );
};
