import { Redirect } from 'expo-router';

/**
 * The landing owns the boot animation. Redirecting straight to it means the
 * first thing rendered is the moving wordmark, not a still splash or spinner.
 */
export default function Index() {
  return <Redirect href={'/welcome' as never} />;
}
