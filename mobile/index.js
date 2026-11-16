// Register the background walk task before the router mounts. Headless
// location tasks evaluate this entry, so the task must exist here too.
import './src/features/health/walk-task';
import 'expo-router/entry';
