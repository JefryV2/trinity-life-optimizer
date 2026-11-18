import { Tabs } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { enableFreeze } from 'react-native-screens';

import { UnifiedDock } from '@/components/navigation/unified-dock';
import { SectionNavProvider } from '@/features/navigation/section-nav';
import { QuickLog } from '@/features/quick-log/quick-log';

enableFreeze(true);

export default function TabsLayout() {
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  return (
    <SectionNavProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          detachInactiveScreens={false}
          tabBar={(props) => (
            <UnifiedDock
              {...props}
              quickLogOpen={quickLogOpen}
              onQuickLog={() => setQuickLogOpen((open) => !open)}
            />
          )}
          screenOptions={{
            headerShown: false,
            lazy: true,
            freezeOnBlur: false,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Today' }} />
          <Tabs.Screen name="health" options={{ title: 'Health' }} />
          <Tabs.Screen name="wealth" options={{ title: 'Wealth' }} />
          <Tabs.Screen name="relations" options={{ title: 'People' }} />
          <Tabs.Screen name="more" options={{ title: 'You' }} />
        </Tabs>
        <QuickLog visible={quickLogOpen} onClose={() => setQuickLogOpen(false)} />
      </View>
    </SectionNavProvider>
  );
}
