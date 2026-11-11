import { Component, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

/**
 * A screen that throws should not take the process down on a release build.
 * This renders the message instead, so a bug is reportable rather than a crash.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error?.message ?? 'Unknown screen error' };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // keep it visible for bug reports
    console.error('Screen error:', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.message) {
      return (
        <View style={{ flex: 1, backgroundColor: '#070708', padding: 24, paddingTop: 72 }}>
          <Text style={{ color: '#C6F24E', fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>
            SCREEN ERROR
          </Text>
          <ScrollView>
            <Text style={{ color: '#EDEDEF', fontSize: 14, lineHeight: 20 }}>
              {this.state.message}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
