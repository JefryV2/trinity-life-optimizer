import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AUXO_LANDING_HTML } from './auxo-animation';

const frame = {
  width: '100%' as const,
  aspectRatio: 4 / 5,
  overflow: 'hidden' as const,
  borderRadius: 22,
  backgroundColor: '#070708',
};

/**
 * The supplied wordmark animation, running in an isolated canvas. The file is
 * fully self-contained (Baloo 2 is inlined), so it never touches the network.
 * The canvas is decorative: it does not take touches and the page scrolls.
 *
 * `active` unmounts the WebView when the screen loses focus, so the looping
 * canvas never burns CPU behind a sign-in form or another tab.
 */
export const LandingAnimation = ({
  active = true,
  html = AUXO_LANDING_HTML,
  onDone,
}: {
  active?: boolean;
  html?: string;
  onDone?: () => void;
}) => {
  if (!active) {
    return <View style={frame} />;
  }

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={frame}
    >
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: '#070708' }}
        pointerEvents="none"
        scrollEnabled={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled={false}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'auxo-moment-done') onDone?.();
        }}
      />
    </View>
  );
};
