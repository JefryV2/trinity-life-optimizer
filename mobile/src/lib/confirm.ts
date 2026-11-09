import { Alert } from 'react-native';

export const confirmDelete = (what: string, onConfirm: () => void) => {
  Alert.alert(`Delete ${what}?`, 'This record will be removed permanently.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
};