import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import {
  CycleForm,
  ExerciseForm,
  FoodForm,
  GoalForm,
  HeartManualForm,
  MentalForm,
  SleepForm,
  StepsForm,
} from '@/features/health/components/health-forms';
import {
  GratitudeForm,
  InteractionForm,
  PersonForm,
  QualityTimeForm,
} from '@/features/relations/components/relations-forms';
import {
  AccountForm,
  BudgetForm,
  InvestmentForm,
  TransactionForm,
} from '@/features/wealth/components/wealth-forms';
import { space, useTheme } from '@/theme';

export default function AddFormRoute() {
  const { form, person } = useLocalSearchParams<{ form: string; person?: string }>();
  const { colors } = useTheme();

  const forms: Record<string, React.ReactNode> = {
    sleep: <SleepForm />,
    exercise: <ExerciseForm />,
    steps: <StepsForm />,
    food: <FoodForm />,
    meal: <FoodForm meal />,
    mental: <MentalForm />,
    cycle: <CycleForm />,
    goal: <GoalForm />,
    'heart-manual': <HeartManualForm />,
    account: <AccountForm />,
    transaction: <TransactionForm />,
    budget: <BudgetForm />,
    investment: <InvestmentForm />,
    person: <PersonForm />,
    interaction: <InteractionForm personId={person} />,
    gratitude: <GratitudeForm />,
    'quality-time': <QualityTimeForm />,
  };

  const content = forms[form ?? ''];
  if (!content) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: space.xl }}>
        <AppText variant="headline">Unknown form</AppText>
      </View>
    );
  }
  return content;
}