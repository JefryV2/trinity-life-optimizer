import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { Platform } from 'react-native';

import { appendFix, loadSession, saveSession, WALK_TASK } from './walk-session';

/**
 * Registered at app start. This is what keeps the route moving when the UI is
 * in the background: expo-location's foreground service delivers fixes here,
 * and the session is persisted so the screen can restore it later.
 */
if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(WALK_TASK)) {
  TaskManager.defineTask(WALK_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: LocationObject[] } | undefined)?.locations ?? [];
    if (locations.length === 0) return;

    const session = await loadSession();
    if (!session || session.status !== 'tracking') return;

    let next = session;
    for (const location of locations) {
      next = appendFix(next, location);
    }

    // Pause/finish may have landed while this batch was in flight.
    const latest = await loadSession();
    if (!latest || latest.status !== 'tracking') return;
    await saveSession(next);
  });
}
