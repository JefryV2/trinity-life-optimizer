import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import {
  CycleForm,
  GoalForm,
  HeartManualForm,
  StepsForm,
} from '@/features/health/components/health-forms';
import { ExerciseForm } from '@/features/health/components/exercise-form';
import { MentalForm } from '@/features/health/components/mental-form';
import { SleepForm } from '@/features/health/components/sleep-form';
import { FoodForm } from '@/features/health/components/food-form';
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
  const { form, person, id, mood } = useLocalSearchParams<{ form: string; person?: string; id?: string; mood?: string }>();
  const { colors } = useTheme();

  const forms: Record<string, React.ReactNode> = {
    sleep: <SleepForm recordId={id} />,
    exercise: <ExerciseForm recordId={id} />,
    steps: <StepsForm />,
    food: <FoodForm recordId={id} />,
    meal: <FoodForm recordId={id} />,
    mental: <MentalForm recordId={id} initialMood={mood} />,
    cycle: <CycleForm recordId={id} />,
    goal: <GoalForm />,
    'heart-manual': <HeartManualForm />,
    account: <AccountForm />,
    transaction: <TransactionForm recordId={id} />,
    budget: <BudgetForm />,
    investment: <InvestmentForm />,
    person: <PersonForm recordId={id} />,
    interaction: <InteractionForm personId={person} recordId={id} />,
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