import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import type { IconName } from '@/components/ui/icon';
import { confirmDelete } from '@/lib/confirm';

interface DeletableRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  leading?: ReactNode;
  last?: boolean;
  onPress?: () => void;
  onDelete: () => void;
}

/** Hold a row to delete it — the native long-press pattern instead of web hover actions. */
export const DeletableRow = ({ onDelete, onPress, ...row }: DeletableRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityHint="Tap to edit, long press to delete"
    onPress={onPress}
    onLongPress={() => confirmDelete(row.title, onDelete)}
    delayLongPress={350}
  >
    <ListRow {...row} />
  </Pressable>
);