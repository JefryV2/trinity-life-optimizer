import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { DetailHeader } from '@/components/ui/detail-header';
import { Icon } from '@/components/ui/icon';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { toast } from '@/components/ui/toast';
import {
  analyseMealPhoto,
  mealVisionConfigured,
  type MealVisionItem,
} from '@/features/health/meal-vision';
import { useFoodSearch, type FoodSearchResult } from '@/features/health/use-food-search';
import { useHealth } from '@/features/health/use-health';
import { formatNumber } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

const MEALS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const mealForNow = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const round0 = (value: number) => Math.round(value);

const totalsFor = (items: MealVisionItem[]) =>
  items.reduce(
    (sum, item) => {
      const factor = item.grams / 100;
      return {
        calories: sum.calories + item.per100.calories * factor,
        protein: sum.protein + item.per100.protein * factor,
        carbs: sum.carbs + item.per100.carbs * factor,
        fat: sum.fat + item.per100.fat * factor,
        fiber: sum.fiber + (item.per100.fiber ?? 0) * factor,
        sugar: sum.sugar + (item.per100.sugar ?? 0) * factor,
        sodium: sum.sodium + (item.per100.sodium ?? 0) * factor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  );

export default function MealPhotoScreen() {
  const { colors } = useTheme();
  const { addFood } = useHealth();
  const [permission, requestPermission] = useCameraPermissions();
  const search = useFoodSearch();
  const camera = useRef<CameraView>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [manualOnly, setManualOnly] = useState(false);
  const [items, setItems] = useState<MealVisionItem[]>([]);
  const [name, setName] = useState('Photo meal');
  const [meal, setMeal] = useState(mealForNow());
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [manualVisible, setManualVisible] = useState(false);
  const [manual, setManual] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const showReview = Boolean(photo) || manualOnly;
  const friendlyError = error?.includes('not connected')
    ? 'I could not read this photo. Add what you see below.'
    : error;
  const totals = totalsFor(items);
  const canSave = items.length > 0 && !saving && !analyzing;

  const takePhoto = async () => {
    if (!camera.current) return;
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.7 });
      if (!shot?.uri) return;
      setManualOnly(false);
      setPhoto(shot.uri);
      setItems([]);
      setError(null);
      setAnalyzing(true);
      try {
        const detected = await analyseMealPhoto(shot.uri);
        setItems(detected);
        if (detected.length > 0) {
          setName(
            detected
              .slice(0, 2)
              .map((item) => item.name)
              .join(' + ')
              .slice(0, 100),
          );
        }
        if (detected.length === 0) {
          setError('Nothing was identified. Add what you see below.');
        }
      } catch (caught) {
        console.warn('Meal photo analysis failed', caught);
        setError('I could not read that photo. Add what you see below.');
      } finally {
        setAnalyzing(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not take the photo.');
    }
  };

  const addSearchResult = (result: FoodSearchResult) => {
    setItems((current) => [
      ...current,
      {
        id: `search-${Date.now()}`,
        name: result.brand ? `${result.name} (${result.brand})` : result.name,
        grams: 100,
        per100: {
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          fiber: result.fiber,
          sugar: result.sugar,
          sodium: result.sodium,
          micros: result.micros,
        },
      },
    ]);
    setSearchVisible(false);
    setQuery('');
    setError(null);
    search.reset();
  };

  const addManual = () => {
    const calories = Number(manual.calories.replace(',', '.'));
    const protein = Number(manual.protein.replace(',', '.'));
    const carbs = Number(manual.carbs.replace(',', '.'));
    const fat = Number(manual.fat.replace(',', '.'));
    if (!manual.name.trim()) {
      setError('Name the ingredient.');
      return;
    }
    if (!Number.isFinite(calories) || calories <= 0) {
      setError('Enter the ingredient calories.');
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        name: manual.name.trim(),
        grams: 100,
        per100: {
          calories,
          protein: Number.isFinite(protein) ? protein : 0,
          carbs: Number.isFinite(carbs) ? carbs : 0,
          fat: Number.isFinite(fat) ? fat : 0,
        },
      },
    ]);
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setManualVisible(false);
    setError(null);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await addFood.mutateAsync({
        name: name.trim() || 'Photo meal',
        meal,
        calories: round0(totals.calories),
        protein: round1(totals.protein),
        carbs: round1(totals.carbs),
        fat: round1(totals.fat),
        fiber: round1(totals.fiber),
        sugar: round1(totals.sugar),
        sodium: round0(totals.sodium),
        components: items.map(({ name: itemName, grams, per100 }) => ({
          name: itemName,
          grams,
          per100,
          portion: null,
        })),
        notes: `Photo estimate. Confirm each portion before logging. ${items.length} component${
          items.length === 1 ? '' : 's'
        }.`.slice(0, 300),
        occurredAt: new Date().toISOString(),
      });
      toast.show('Meal added');
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the meal.');
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.lg }}>
        <DetailHeader title="Photo meal" fallback="/(tabs)/health" />
        <AppText variant="callout" tone="secondary">
          Camera access is needed to photograph a meal.
        </AppText>
        <Button label="Enable camera" onPress={() => void requestPermission()} />
      </Screen>
    );
  }

  if (!permission.granted && !manualOnly) {
    return (
      <Screen contentContainerStyle={{ paddingTop: space.lg }}>
        <DetailHeader title="Photo meal" fallback="/(tabs)/health" />
        <Panel style={{ gap: space.md }}>
          <AppText variant="headline">Let Auxo see your plate</AppText>
          <AppText variant="callout" tone="secondary">
            Camera access is off. You can still add ingredients manually.
          </AppText>
        </Panel>
        <Button label="Ask for camera access" onPress={() => void requestPermission()} />
        <Button
          label="Add ingredients without a photo"
          variant="secondary"
          onPress={() => {
            setManualOnly(true);
            setError(null);
            setSearchVisible(true);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.section }}>
      <DetailHeader
        title="Photo meal"
        fallback="/(tabs)/health"
        right={
          photo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retake photo"
              onPress={() => {
                setPhoto(null);
                setManualOnly(false);
                setItems([]);
                setError(null);
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <AppText variant="callout" tone="primary" style={{ fontWeight: '700' }}>
                Retake
              </AppText>
            </Pressable>
          ) : undefined
        }
      />

      {!showReview ? (
        <>
          <View
            style={{
              height: 360,
              borderRadius: radius.group,
              overflow: 'hidden',
              backgroundColor: colors.surfaceAlt,
            }}
          >
            <CameraView
              ref={camera}
              pointerEvents="none"
              style={{ flex: 1 }}
              facing="back"
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 18,
                right: 18,
                top: 18,
                bottom: 18,
                borderRadius: radius.inner,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.28)',
              }}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take meal photo"
            onPress={() => void takePhoto()}
            style={({ pressed }) => ({
              alignSelf: 'center',
              width: 78,
              height: 78,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
              }}
            />
          </Pressable>

          <AppText variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
            Fill the frame with the plate. Include a fork, hand or drink for scale.
          </AppText>
          <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
            The photo is sent only when you take it. Nothing is logged until you confirm.
          </AppText>

          {error ? (
            <AppText variant="footnote" tone="danger" selectable>
              {friendlyError}
            </AppText>
          ) : null}

          <Button
            label="Add ingredients without a photo"
            variant="secondary"
            onPress={() => {
              setManualOnly(true);
              setSearchVisible(true);
            }}
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={{ width: 92, height: 92, borderRadius: radius.inner }}
              />
            ) : (
              <View
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: radius.inner,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="camera" size={28} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" tone="primary">
                PHOTO MEAL
              </AppText>
              <AppText style={{ fontSize: 24, lineHeight: 28, fontWeight: '800' }}>
                {analyzing ? 'Reading the plate…' : photo ? 'Check what Auxo saw' : 'Add what is on the plate'}
              </AppText>
              <AppText variant="footnote" tone="tertiary">
                {analyzing
                  ? 'Estimating components and portion size.'
                  : 'Estimates, not measurements. Adjust anything that looks off.'}
              </AppText>
            </View>
          </View>

          {analyzing ? (
            <Panel style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="footnote" tone="secondary">
                {mealVisionConfigured
                  ? 'Looking for ingredients and portion sizes.'
                  : 'I cannot read this photo yet. Add the ingredients below.'}
              </AppText>
            </Panel>
          ) : null}

          {!analyzing ? (
            <>
              {error ? (
                <Panel style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="info" size={18} color={colors.primary} />
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {friendlyError}
                    </AppText>
                  </View>
                  <AppText variant="footnote" tone="tertiary">
                    You can add missing ingredients and set the grams yourself.
                  </AppText>
                </Panel>
              ) : null}

              <TextInput
                accessibilityLabel="Meal name"
                value={name}
                onChangeText={setName}
                placeholder="Name this meal"
                placeholderTextColor={colors.textFaint}
                maxLength={100}
                style={{
                  minHeight: 54,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  paddingHorizontal: space.lg,
                  color: colors.text,
                  fontSize: 18,
                }}
              />

              <Chips options={MEALS} value={meal} onChange={setMeal} />

              <View style={{ gap: space.sm }}>
                {items.map((item) => {
                  const factor = item.grams / 100;
                  return (
                    <Panel key={item.id} style={{ gap: space.sm }}>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}
                      >
                        <View style={{ flex: 1, gap: 1 }}>
                          <AppText variant="headline" numberOfLines={2}>
                            {item.name}
                          </AppText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="caption" tone="tertiary">
                              {`${round0(item.per100.calories * factor)} kcal`}
                            </AppText>
                            {item.confidence !== undefined ? (
                              <AppText
                                variant="caption"
                                style={{
                                  color:
                                    item.confidence < 0.6
                                      ? colors.amber
                                      : colors.textTertiary,
                                }}
                              >
                                {`${Math.round(item.confidence * 100)}% confidence`}
                              </AppText>
                            ) : null}
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name}`}
                          hitSlop={8}
                          onPress={() =>
                            setItems((current) => current.filter((entry) => entry.id !== item.id))
                          }
                          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                        >
                          <Icon name="close" size={18} color={colors.textTertiary} />
                        </Pressable>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Decrease ${item.name}`}
                          onPress={() =>
                            setItems((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, grams: Math.max(10, entry.grams - 10) }
                                  : entry,
                              ),
                            )
                          }
                          style={({ pressed }) => ({
                            width: 44,
                            height: 44,
                            borderRadius: radius.pill,
                            backgroundColor: colors.surfaceSunken,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          <Icon name="minus" size={19} color={colors.textSecondary} />
                        </Pressable>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
                            {`${item.grams} g`}
                          </AppText>
                          <AppText variant="caption" tone="tertiary">
                            portion
                          </AppText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Increase ${item.name}`}
                          onPress={() =>
                            setItems((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, grams: Math.min(2000, entry.grams + 10) }
                                  : entry,
                              ),
                            )
                          }
                          style={({ pressed }) => ({
                            width: 44,
                            height: 44,
                            borderRadius: radius.pill,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Icon name="plus" size={19} color={colors.onPrimary} />
                        </Pressable>
                      </View>
                    </Panel>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add missing ingredient"
                onPress={() => setSearchVisible(true)}
                style={({ pressed }) => ({
                  minHeight: 58,
                  borderRadius: radius.inner,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Icon name="plus" size={19} color={colors.primary} />
                <AppText variant="callout" tone="primary">
                  Add a missing ingredient
                </AppText>
              </Pressable>

              <Panel style={{ gap: space.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: space.md,
                  }}
                >
                  <AppText variant="headline" tone="secondary">
                    Estimated meal
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                    <AppText
                      variant="display"
                      style={{ fontSize: 42, lineHeight: 46, letterSpacing: -2.2 }}
                    >
                      {round0(totals.calories)}
                    </AppText>
                    <AppText variant="footnote" tone="tertiary">
                      kcal
                    </AppText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  {[
                    { label: 'Protein', value: totals.protein, color: colors.primary },
                    { label: 'Carbs', value: totals.carbs, color: colors.bonds },
                    { label: 'Fat', value: totals.fat, color: colors.wealth },
                  ].map((macro) => (
                    <View
                      key={macro.label}
                      style={{
                        flex: 1,
                        borderRadius: radius.inner,
                        backgroundColor: colors.surfaceSunken,
                        padding: space.md,
                        gap: 1,
                      }}
                    >
                      <AppText variant="callout" style={{ color: macro.color, fontWeight: '700' }}>
                        {macro.label}
                      </AppText>
                      <AppText variant="headline" style={{ fontSize: 22, lineHeight: 26 }}>
                        {`${round0(macro.value)} g`}
                      </AppText>
                    </View>
                  ))}
                </View>
                <AppText variant="footnote" tone="tertiary">
                  Based on the photo and the portions above. Check before logging.
                </AppText>
              </Panel>

              <Button
                label={items.length > 0 ? 'Log this meal' : 'Add at least one ingredient'}
                loading={saving}
                disabled={!canSave}
                onPress={() => void save()}
              />
            </>
          ) : null}
        </>
      )}

      <Sheet
        visible={searchVisible}
        title="Add an ingredient"
        subtitle="Search Open Food Facts or enter it yourself"
        onClose={() => setSearchVisible(false)}
      >
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Food"
              value={query}
              onChangeText={setQuery}
              placeholder="chicken breast, rice, olive oil…"
              onSubmitEditing={() => {
                if (query.trim().length >= 2) search.mutate(query.trim());
              }}
              returnKeyType="search"
              autoFocus
            />
          </View>
          <Button
            label="Search"
            size="small"
            loading={search.isPending}
            onPress={() => {
              if (query.trim().length >= 2) search.mutate(query.trim());
            }}
          />
        </View>

        <Button
          label="Enter a custom ingredient"
          variant="secondary"
          size="small"
          onPress={() => {
            setSearchVisible(false);
            setManualVisible(true);
          }}
        />

        {search.isError ? (
          <AppText variant="footnote" tone="danger">
            {search.error.message}
          </AppText>
        ) : null}

        {search.data?.length === 0 ? (
          <AppText variant="footnote" tone="secondary">
            No matches. Try a simpler term or enter it manually.
          </AppText>
        ) : null}

        <FlatList
          data={search.data ?? []}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => addSearchResult(item)}
              style={({ pressed }) => ({
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.separator,
                opacity: pressed ? 0.6 : 1,
                gap: 2,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.md }}>
                <AppText variant="callout" style={{ flex: 1 }} numberOfLines={2}>
                  {item.name}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  {item.calories} kcal
                </AppText>
              </View>
              <AppText variant="caption" tone="tertiary">
                {item.brand ? `${item.brand} · ` : ''}
                {item.serving}
              </AppText>
            </Pressable>
          )}
        />
      </Sheet>

      <Sheet
        visible={manualVisible}
        title="Custom ingredient"
        subtitle="Values per 100 g"
        onClose={() => setManualVisible(false)}
      >
        <TextField
          label="Name"
          value={manual.name}
          onChangeText={(value) => setManual((current) => ({ ...current, name: value }))}
          placeholder="Homemade sauce"
          maxLength={80}
          autoFocus
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Calories"
              value={manual.calories}
              onChangeText={(value) => setManual((current) => ({ ...current, calories: value }))}
              keyboardType="decimal-pad"
              placeholder="120"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Protein"
              value={manual.protein}
              onChangeText={(value) => setManual((current) => ({ ...current, protein: value }))}
              keyboardType="decimal-pad"
              placeholder="5"
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Carbs"
              value={manual.carbs}
              onChangeText={(value) => setManual((current) => ({ ...current, carbs: value }))}
              keyboardType="decimal-pad"
              placeholder="10"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Fat"
              value={manual.fat}
              onChangeText={(value) => setManual((current) => ({ ...current, fat: value }))}
              keyboardType="decimal-pad"
              placeholder="4"
            />
          </View>
        </View>
        {error ? (
          <AppText variant="footnote" tone="danger">
            {friendlyError}
          </AppText>
        ) : null}
        <Button label="Add ingredient" onPress={addManual} />
      </Sheet>
    </Screen>
  );
}
