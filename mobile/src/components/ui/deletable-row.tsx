import { Pressable } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import type { IconName } from '@/components/ui/icon';
import { confirmDelete } from '@/lib/confirm';

interface DeletableRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  last?: boolean;
  onDelete: () => void;
}

/** Hold a row to delete it — the native long-press pattern instead of web hover actions. */
export const DeletableRow = ({ onDelete, ...row }: DeletableRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityHint="Long press to delete this record"
    onLongPress={() => confirmDelete(row.title, onDelete)}
    delayLongPress={350}
  >
    <ListRow {...row} />
  </Pressable>
);