import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * One line set, one stroke, one size per context. Icons take the colour of
 * their text role; they never carry their own.
 */
const GLYPH = {
  home: 'home-outline',
  heart: 'heart-outline',
  wallet: 'wallet-outline',
  people: 'people-outline',
  chart: 'stats-chart-outline',
  plus: 'add',
  chevron: 'chevron-forward',
  back: 'chevron-back',
  user: 'person-outline',
  moon: 'moon-outline',
  run: 'walk-outline',
  water: 'water-outline',
  food: 'restaurant-outline',
  brain: 'happy-outline',
  calendar: 'calendar-outline',
  logout: 'log-out-outline',
  check: 'checkmark',
  close: 'close',
  edit: 'pencil-outline',
  trash: 'trash-outline',
  arrowUp: 'trending-up-outline',
  arrowDown: 'trending-down-outline',
  sparkles: 'sparkles-outline',
  target: 'flag-outline',
  lock: 'lock-closed-outline',
  bell: 'notifications-outline',
  scale: 'scale-outline',
  sun: 'sunny-outline',
  flame: 'flame-outline',
  bed: 'bed-outline',
  clock: 'time-outline',
  dumbbell: 'barbell-outline',
  book: 'book-outline',
  gift: 'gift-outline',
  pill: 'medkit-outline',
  more: 'ellipsis-horizontal-circle-outline',
  settings: 'settings-outline',
  trophy: 'trophy-outline',
  bluetooth: 'bluetooth-outline',
  wind: 'cloud-outline',
  info: 'information-circle-outline',
  warning: 'warning-outline',
  female: 'female-outline',
  star: 'star-outline',
  note: 'document-text-outline',
  phone: 'call-outline',
  message: 'chatbubble-outline',
  video: 'videocam-outline',
} as const;

export type IconName = keyof typeof GLYPH;

export const Icon = ({
  name,
  size = 18,
  color,
}: {
  name: IconName;
  size?: number;
  color: string;
}) => <Ionicons name={GLYPH[name]} size={size} color={color} />;
