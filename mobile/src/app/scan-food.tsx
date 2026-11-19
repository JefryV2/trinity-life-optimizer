import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { toast } from '@/components/ui/toast';
import { useHealth } from '@/features/health/use-health';
import { setPendingMealComponent } from '@/features/health/pending-component';
import { track } from '@/lib/analytics';
import { getFoodByBarcode, type FoodResult } from '@/lib/food-api';
import type { Micronutrients } from '@/lib/nutrition';
import { radius, space, useTheme } from '@/theme';

const mealForNow = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
};

const scaleMicros = (micros: Micronutrients | undefined, factor: number): Micronutrients | undefined => {
  if (!micros) return undefined;
  return Object.fromEntries(
    Object.entries(micros).map(([key, value]) => [key, Math.round(value * factor * 100) / 100]),
  ) as Micronutrients;
};

const Corner = ({
  top,
  bottom,
  left,
  right,
}: {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        width: 42,
        height: 42,
        [top ? 'top' : 'bottom']: 22,
        [left ? 'left' : 'right']: 22,
        borderTopWidth: top ? 3 : 0,
        borderBottomWidth: bottom ? 3 : 0,
        borderLeftWidth: left ? 3 : 0,
        borderRightWidth: right ? 3 : 0,
        borderColor: colors.primary,
        borderTopLeftRadius: top && left ? 14 : 0,
        borderTopRightRadius: top && right ? 14 : 0,
        borderBottomLeftRadius: bottom && left ? 14 : 0,
        borderBottomRightRadius: bottom && right ? 14 : 0,
      }}
    />
  );
};

export default function ScanFoodScreen() {
  const { colors } = useTheme();
  const { component } = useLocalSearchParams<{ component?: string }>();
  const componentMode = component === '1';
  const { addFood } = useHealth();
  const [permission, requestPermission] = useCameraPermissions();
  const [product, setProduct] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState(mealForNow());
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [torch, setTorch] = useState(false);
  const [typing, setTyping] = useState(false);
  const [code, setCode] = useState('');
  const lock = useRef(false);

  const lookup = async (value: string) => {
    if (lock.current) return;
    lock.current = true;
    setLookingUp(true);
    setError(null);
    try {
      const hit = await getFoodByBarcode(value);
      if (!hit) {
        setError('That barcode is not in Open Food Facts yet. You can log it manually.');
        lock.current = false;
        return;
      }
      setProduct(hit);
      setServings(1);
      setTyping(false);
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

  const factor = servings;
  const kcal = product ? Math.round(product.calories * factor) : 0;
  const protein = product ? Math.round(product.protein * factor) : 0;
  const carbs = product ? Math.round(product.carbs * factor) : 0;
  const fat = product ? Math.round(product.fat * factor) : 0;

  const save = () => {
    if (!product) return;
    if (componentMode) {
      setPendingMealComponent({
        name: product.brand ? `${product.name} (${product.brand})` : product.name,
        grams: servings * 100,
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
    setTyping(false);
    setCode('');
    lock.current = false;
  };

  if (permission && !permission.granted) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.xl }}>
        <AppText variant="title">Scan food</AppText>
        <AppText variant="callout" tone="secondary">
          Camera access is off. Turn it on in device settings, or use search and manual entry
          instead.
        </AppText>
        <Button label="Ask again" onPress={() => void requestPermission()} />
        <Button label="Search instead" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!permission) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.xl }}>
        <AppText variant="title">Scan food</AppText>
        <AppText variant="callout" tone="secondary">
          Camera access is needed to read a barcode.
        </AppText>
        <Button label="Enable camera" onPress={() => void requestPermission()} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xxl }}>
      {product ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <AppText variant="title">Scan</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan another"
              onPress={scanAgain}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <AppText variant="callout" tone="primary" style={{ fontWeight: '700' }}>
                Scan again
              </AppText>
            </Pressable>
          </View>

          <Panel style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" tone="tertiary" style={{ letterSpacing: 0.5 }}>
                  {product.brand ?? 'Open Food Facts'}
                </AppText>
                <AppText variant="headline" style={{ fontSize: 24, lineHeight: 29 }}>
                  {product.name}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <AppText
                  variant="display"
                  tone="primary"
                  style={{ fontSize: 44, lineHeight: 48, letterSpacing: -2.5 }}
                >
                  {kcal}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  kcal
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {[
                { label: 'Protein', value: protein, color: colors.primary },
                { label: 'Carbs', value: carbs, color: colors.bonds },
                { label: 'Fat', value: fat, color: colors.wealth },
              ].map((macro) => (
                <View
                  key={macro.label}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surfaceSunken,
                    borderRadius: radius.inner,
                    padding: space.md,
                    gap: 1,
                  }}
                >
                  <AppText variant="callout" style={{ color: macro.color, fontWeight: '700' }}>
                    {macro.label}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <AppText
                      variant="headline"
                      style={{ fontSize: 24, lineHeight: 28, letterSpacing: -0.8 }}
                    >
                      {macro.value}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary">
                      g
                    </AppText>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.md,
                borderTopWidth: 1,
                borderTopColor: colors.separator,
                paddingTop: space.md,
              }}
            >
              <View style={{ gap: 1 }}>
                <AppText variant="headline">Servings</AppText>
                <AppText variant="footnote" tone="tertiary">
                  {product.serving}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fewer servings"
                  onPress={() => setServings((value) => Math.max(1, value - 1))}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <AppText variant="headline" tone="secondary" style={{ fontSize: 23 }}>
                    −
                  </AppText>
                </Pressable>
                <AppText
                  variant="headline"
                  style={{ minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] }}
                >
                  {servings}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More servings"
                  onPress={() => setServings((value) => value + 1)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <Icon name="plus" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </Panel>
        </>
      ) : (
        <>
          <AppText
            variant="headline"
            tone="secondary"
            style={{ textAlign: 'center', marginTop: space.md }}
          >
            Point at a barcode
          </AppText>

          <View
            style={{
              height: 420,
              borderRadius: radius.group,
              overflow: 'hidden',
              backgroundColor: colors.surface,
            }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={onBarcode}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: '26%',
                bottom: '26%',
                left: '15%',
                right: '15%',
              }}
            >
              <Corner top left />
              <Corner top right />
              <Corner bottom left />
              <Corner bottom right />
              <View
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '7%',
                  right: '7%',
                  height: 1,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={torch ? 'Turn light off' : 'Turn light on'}
              onPress={() => setTorch((value) => !value)}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name="bolt" size={17} color={colors.text} />
              <AppText variant="callout" style={{ fontWeight: '700' }}>
                Light
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Type a barcode"
              onPress={() => setTyping((value) => !value)}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AppText variant="callout" style={{ fontWeight: '700' }}>
                Type code
              </AppText>
            </Pressable>
          </View>

          {typing ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.primary,
                paddingLeft: space.lg,
              }}
            >
              <TextInput
                accessibilityLabel="Barcode number"
                value={code}
                onChangeText={setCode}
                placeholder="8–14 digit barcode"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={14}
                autoFocus
                onSubmitEditing={() => {
                  if (code.trim()) void lookup(code.trim());
                }}
                style={{ flex: 1, color: colors.text, fontSize: 18, paddingVertical: space.md }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Look up barcode"
                onPress={() => {
                  if (code.trim()) void lookup(code.trim());
                }}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                  marginRight: 4,
                })}
              >
                <Icon name="chevron" size={22} color={colors.onPrimary} />
              </Pressable>
            </View>
          ) : null}

          {lookingUp ? (
            <AppText variant="footnote" tone="secondary" style={{ textAlign: 'center' }}>
              Looking it up…
            </AppText>
          ) : null}
        </>
      )}

      {error ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="footnote" tone="danger" selectable>
            {error}
          </AppText>
          <Button label="Enter manually" variant="secondary" onPress={() => router.replace('/add/food')} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Button
            label={componentMode ? 'Add to meal' : 'Add to log'}
            disabled={!product}
            loading={addFood.isPending}
            onPress={save}
          />
        </View>
      </View>
    </Screen>
  );
}
