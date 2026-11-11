import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { getCapturedError, subscribeToErrors } from '@/lib/crash-guard';

/** Renders whatever the global error guard caught, instead of a silent exit. */
export const CrashScreen = () => {
  const [message, setMessage] = useState<string | null>(getCapturedError());

  useEffect(() => subscribeToErrors(setMessage), []);

  if (!message) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#070708',
        padding: 24,
        paddingTop: 72,
        zIndex: 9999,
      }}
    >
      <Text style={{ color: '#C6F24E', fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>
        APP ERROR — PLEASE SCREENSHOT THIS
      </Text>
      <ScrollView>
        <Text style={{ color: '#EDEDEF', fontSize: 13, lineHeight: 19 }} selectable>
          {message}
        </Text>
      </ScrollView>
    </View>
  );
};
