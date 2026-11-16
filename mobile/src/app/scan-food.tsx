import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { toast } from '@/components/ui/toast';
import { useHealth } from '@/features/health/use-health';
import { setPendingMealComponent } from '@/features/health/pending-component';
import { track } from '@/lib/analytics';
import { getFoodByBarcode, type FoodResult } from '@/lib/food-api';
import type { Micronutrients } from '@/lib/nutrition';
import { radius, space, useTheme } from '@/theme';

const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const scaleMicros = (micros: Micronutrients | undefined, factor: number): Micronutrients | undefined => {
  if (!micros) return undefined;
  return Object.fromEntries(
    Object.entries(micros).map(([key, value]) => [key, Math.round(value * factor * 100) / 100]),
  ) as Micronutrients;
};

export default function ScanFoodScreen() {
  const { colors } = useTheme();
  const { component } = useLocalSearchParams<{ component?: string }>();
  const componentMode = component === '1';
  const { addFood } = useHealth();
  const [permission, requestPermission] = useCameraPermissions();
  const [product, setProduct] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState('lunch');
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lock = useRef(false);

  const lookup = async (code: string) => {
    if (lock.current) return;
    lock.current = true;
    setLookingUp(true);
    setError(null);
    try {
      const hit = await getFoodByBarcode(code);
      if (!hit) {
        setError('That barcode is not in Open Food Facts yet. You can log it manually.');
        lock.current = false;
        return;
      }
      setProduct(hit);
      setGrams('100');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not look up that barcode.');
      lock.current = false;
    } finally {
      setLookingUp(false);
    }
  };

  const onBarcode = (result: BarcodeScanningResult) => {
    if (product || lock.current) return;
    void lookup(result.data);
  };

  const amount = Math.max(1, Number(grams.replace(',', '.')) || 100);
  const factor = amount / 100;
  const kcal = product ? Math.round(product.calories * factor) : 0;
  const protein = product ? Math.round(product.protein * factor) : 0;
  const carbs = product ? Math.round(product.carbs * factor) : 0;
  const fat = product ? Math.round(product.fat * factor) : 0;

  const save = () => {
    if (!product) return;
    if (componentMode) {
      setPendingMealComponent({
        name: product.brand ? `${product.name} (${product.brand})` : product.name,
        grams: amount,
        per100: {
          calories: product.calories,
          protein: product.protein,
          carbs: product.carbs,
          fat: product.fat,
          fiber: product.fiber,
          sugar: product.sugar,
          sodium: product.sodium,
          micros: product.micros,
        },
      });
      router.back();
      return;
    }
    addFood.mutate(
      {
        name: product.brand ? `${product.name} (${product.brand})` : product.name,
        meal,
        calories: kcal,
        protein,
        carbs,
        fat,
        fiber: (product.fiber ?? 0) * factor,
        sugar: (product.sugar ?? 0) * factor,
        sodium: Math.round((product.sodium ?? 0) * factor),
        micros: scaleMicros(product.micros, factor),
      },
      {
        onSuccess: () => {
          void track('barcode_food_logged', { meal });
          toast.show('Food added');
          router.back();
        },
        onError: (caught) => setError(caught.message),
      },
    );
  };

  const scanAgain = () => {
    setProduct(null);
    setError(null);
    lock.current = false;
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: space.xl }}>
      <BackLink />
      <PageHeader title={componentMode ? 'Scan component' : 'Scan food'} date="Barcode" />

      {!permission ? (
        <Card style={{ gap: space.md }}>
          <AppText variant="callout">Camera access is needed.</AppText>
          <Button label="Enable camera" onPress={() => void requestPermission()} />
        </Card>
      ) : !permission.granted ? (
        <Card style={{ gap: space.md }}>
          <AppText variant="callout">Camera access is off.</AppText>
          <AppText variant="footnote" tone="secondary">
            Turn it on in device settings, or use search and manual entry instead.
          </AppText>
          <Button label="Ask again" onPress={() => void requestPermission()} />
          <Button label="Search instead" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : product ? (
        <Card raised style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <AppText variant="headline">{product.name}</AppText>
            <AppText variant="footnote" tone="secondary">
              {product.brand ? `${product.brand} · ` : ''}
              {product.serving}
            </AppText>
          </View>
          <TextField
            label="Amount eaten (g)"
            value={grams}
            onChangeText={setGrams}
            keyboardType="decimal-pad"
            maxLength={5}
          />
          {!componentMode ? <Chips label="Meal" options={MEALS} value={meal} onChange={setMeal} /> : null}
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {[
              { label: 'kcal', value: kcal },
              { label: 'protein', value: protein },
              { label: 'carbs', value: carbs },
              { label: 'fat', value: fat },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, gap: 1 }}>
                <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                  {item.value}
                </AppText>
                <AppText variant="caption" tone="tertiary">
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>
          <Button label={componentMode ? `Add component · ${kcal} kcal` : `Log ${kcal} kcal`} loading={addFood.isPending} onPress={save} />
          <Button label="Scan another" variant="secondary" onPress={scanAgain} />
        </Card>
      ) : (
        <View style={{ gap: space.md }}>
          <View
            style={{
              height: 320,
              borderRadius: radius.group,
              overflow: 'hidden',
              backgroundColor: colors.surface,
            }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={onBarcode}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: 88,
                bottom: 88,
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: radius.inner,
              }}
            />
          </View>
          <AppText variant="footnote" tone="secondary">
            Point at the barcode on a package. {lookingUp ? 'Looking it up…' : ''}
          </AppText>
        </View>
      )}

      {error ? (
        <Card style={{ gap: space.md }}>
          <AppText variant="footnote" tone="danger" selectable>
            {error}
          </AppText>
          <Button label="Try again" variant="secondary" onPress={scanAgain} />
          <Button label="Enter manually" variant="ghost" onPress={() => router.replace('/add/food')} />
        </Card>
      ) : null}
    </Screen>
  );
}
