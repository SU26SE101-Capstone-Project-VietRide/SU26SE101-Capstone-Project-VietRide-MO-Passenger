import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import {
  ArrowLeft,
  Buildings,
  MagnifyingGlass,
  MapPin,
  MapTrifold,
} from 'phosphor-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useLocationChildren,
  useLocations,
} from '@features/location/hooks/useLocations';
import type { Location } from '@features/location/types/location';
import {
  isLocationLeafType,
  isLocationRootType,
} from '@features/location/types/location';
import type { ParcelStackParamList } from '@app/navigation/types';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeLocationSearchText } from '@features/location/utils/locationSearch';
import { useParcelStore } from '../store/useParcelStore';

type NavProp = NativeStackNavigationProp<ParcelStackParamList, 'CityPicker'>;
type RouteProps = RouteProp<ParcelStackParamList, 'CityPicker'>;
type Step = 'province' | 'ward';

const locationKeyExtractor = (item: Location) => item.id;

const typeKey = (type: Location['type']): string => {
  switch (type) {
    case 'MUNICIPALITY': return 'parcel.locations.municipality';
    case 'PROVINCE': return 'parcel.locations.province';
    case 'WARD': return 'parcel.locations.ward';
    case 'COMMUNE': return 'parcel.locations.commune';
    case 'SPECIAL_ZONE': return 'parcel.locations.specialZone';
    default: return 'parcel.locations.province';
  }
};

interface LocationOptionProps {
  location: Location;
  chevron: boolean;
  onSelect: (location: Location) => void;
}

const LocationOption = memo(function LocationOption({
  location,
  chevron,
  onSelect,
}: LocationOptionProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const typeLabel = t(typeKey(location.type));
  const handlePress = useCallback(() => {
    onSelect(location);
  }, [location, onSelect]);

  return (
    <Pressable
      accessibilityLabel={t('parcel.locations.locationAccessibility', {
        name: location.name,
        type: typeLabel,
      })}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
    >
      <View style={styles.itemIcon}>
        {isLocationRootType(location.type) ? (
          <Buildings size={16} color={theme.colors.primary} weight="fill" />
        ) : (
          <MapPin size={16} color={theme.colors.primary} weight="fill" />
        )}
      </View>
      <View style={styles.itemTextWrap}>
        <Text style={styles.itemName}>{location.name}</Text>
      </View>
      {chevron ? (
        <View style={styles.itemArrow}>
          <ArrowLeft
            size={16}
            color={theme.colors.textTertiary}
            weight="bold"
            style={styles.arrowForward}
          />
        </View>
      ) : null}
    </Pressable>
  );
});

export function ParcelCityPicker(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const setFromLocation = useParcelStore(state => state.setFromLocation);
  const setToLocation = useParcelStore(state => state.setToLocation);
  const [step, setStep] = useState<Step>('province');
  const [province, setProvince] = useState<Location | null>(null);
  const [query, setQuery] = useState('');
  const mode = route.params.mode;

  const rootsQuery = useLocations();
  const wardsQuery = useLocationChildren(step === 'ward' ? province?.code : undefined);

  useEffect(() => {
    setQuery('');
  }, [step]);

  useEffect(() => {
    setStep('province');
    setProvince(null);
    setQuery('');
  }, [mode]);

  const filterByQuery = useCallback((rows: Location[]) => {
    const normalizedQuery = normalizeLocationSearchText(query);
    if (!normalizedQuery) return rows;
    return rows.filter((row) =>
      normalizeLocationSearchText(row.name).includes(normalizedQuery),
    );
  }, [query]);

  const provinceRows = useMemo(
    () => filterByQuery(
      (rootsQuery.data ?? []).filter((location) =>
        location.isActive && isLocationRootType(location.type),
      ),
    ),
    [filterByQuery, rootsQuery.data],
  );

  const wardRows = useMemo(
    () => filterByQuery(
      (wardsQuery.data ?? []).filter((location) =>
        location.isActive && isLocationLeafType(location.type),
      ),
    ),
    [filterByQuery, wardsQuery.data],
  );

  const finish = useCallback((root: Location, leaf: Location | null) => {
    const label = leaf
      ? t('parcel.locations.wardInProvince', { ward: leaf.name, province: root.name })
      : root.name;

    if (mode === 'from') {
      setFromLocation(label, root.code, leaf?.code ?? '');
    } else {
      setToLocation(label, root.code, leaf?.code ?? '');
    }

    if (route.params.next === 'to') {
      navigation.replace('CityPicker', { mode: 'to', next: 'create' });
      return;
    }
    if (route.params.next === 'create') {
      navigation.replace('CreateParcel');
      return;
    }

    navigation.goBack();
  }, [mode, navigation, route.params.next, setFromLocation, setToLocation, t]);

  const onPickProvince = useCallback((row: Location) => {
    setProvince(row);
    setStep('ward');
  }, []);

  const onPickWard = useCallback((row: Location) => {
    if (province) finish(province, row);
  }, [finish, province]);

  const onPickEntireProvince = useCallback(() => {
    if (province) finish(province, null);
  }, [finish, province]);

  const onBack = useCallback(() => {
    if (step === 'ward') {
      setStep('province');
      setProvince(null);
      return;
    }
    navigation.goBack();
  }, [navigation, step]);

  const active = step === 'province' ? rootsQuery : wardsQuery;
  const list = step === 'province' ? provinceRows : wardRows;

  const renderLocation = useCallback(({ item }: ListRenderItemInfo<Location>) => (
    <LocationOption
      chevron={step === 'province'}
      location={item}
      onSelect={step === 'province' ? onPickProvince : onPickWard}
    />
  ), [onPickProvince, onPickWard, step]);

  const listEmpty = useMemo(() => {
    if (active.isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.empty}>
            {step === 'ward'
              ? t('parcel.locations.loadingWards')
              : t('parcel.locations.loading')}
          </Text>
        </View>
      );
    }

    if (active.isError) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.empty}>
            {t('parcel.locations.loadError')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            accessibilityState={{
              busy: active.isFetching,
              disabled: active.isFetching,
            }}
            disabled={active.isFetching}
            onPress={() => {
              if (!active.isFetching) {
                active.refetch().catch(() => undefined);
              }
            }}
            style={({ pressed }) => [
              styles.retryButton,
              active.isFetching ? styles.retryButtonDisabled : null,
              pressed && !active.isFetching ? styles.pressed : null,
            ]}
          >
            {active.isFetching ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textInverse}
              />
            ) : (
              <Text style={styles.retryText}>
                {t('common.retry')}
              </Text>
            )}
          </Pressable>
        </View>
      );
    }

    return (
      <Text style={styles.empty}>
        {step === 'ward'
          ? t('parcel.locations.noWardMatches')
          : t('parcel.locations.noMatches')}
      </Text>
    );
  }, [active, step, styles, t, theme.colors.primary, theme.colors.textInverse]);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior="translate-with-padding"
        style={styles.keyboardContainer}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.headerButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {step === 'ward'
              ? t('parcel.locations.wardTitle')
              : mode === 'from'
                ? t('parcel.locations.originTitle')
                : t('parcel.locations.destinationTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {step === 'ward' && province ? (
          <View style={styles.provinceChip}>
            <Buildings size={14} color={theme.colors.primary} weight="fill" />
            <Text style={styles.provinceChipText} numberOfLines={1}>
              {province.name}
            </Text>
          </View>
        ) : null}

        <Text style={styles.stepHint}>
          {step === 'province'
            ? t('parcel.locations.stepProvinceHint')
            : t('parcel.locations.stepWardHint')}
        </Text>

        <View style={styles.searchBox}>
          <MagnifyingGlass
            size={16}
            color={theme.colors.textTertiary}
            weight="bold"
          />
          <TextInput
            accessibilityLabel={t('parcel.locations.searchAccessibility')}
            style={styles.searchInput}
            placeholder={
              step === 'ward'
                ? t('parcel.locations.searchWardPlaceholder')
                : t('parcel.locations.searchPlaceholder')
            }
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus={step === 'province'}
            returnKeyType="search"
          />
        </View>

        <FlashList
          key={step}
          data={list}
          keyExtractor={locationKeyExtractor}
          contentContainerStyle={styles.list}
          renderItem={renderLocation}
          ListHeaderComponent={
            step === 'ward' && province && !active.isLoading && !active.isError ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('parcel.locations.entireProvinceAccessibility', {
                  province: province.name,
                })}
                onPress={onPickEntireProvince}
                style={({ pressed }) => [
                  styles.entireProvinceRow,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.entireProvinceIcon}>
                  <MapTrifold size={16} color={theme.colors.primary} weight="fill" />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemName}>
                    {t('parcel.locations.entireProvince', { province: province.name })}
                  </Text>
                  <Text style={styles.itemRegion}>
                    {t('parcel.locations.entireProvinceHint')}
                  </Text>
                </View>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={listEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  keyboardContainer: { flex: 1 },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerButton: {
    ...theme.components.headerButton,
    width: 44,
    height: 44,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: spacing.sm,
    textAlign: 'center' as const,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  headerSpacer: { width: 44 },
  provinceChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  provinceChipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
    maxWidth: 240,
  },
  stepHint: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.fieldBorder
      : theme.colors.divider,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  item: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  itemArrow: {
    width: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  arrowForward: { transform: [{ rotate: '180deg' }] },
  entireProvinceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  entireProvinceIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemTextWrap: { flex: 1 },
  itemName: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  itemRegion: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  stateContainer: {
    alignItems: 'center' as const,
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  retryButton: {
    minWidth: 112,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  retryButtonDisabled: {
    opacity: 0.55,
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
    marginTop: spacing.xxl,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
