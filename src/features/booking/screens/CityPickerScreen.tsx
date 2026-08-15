/**
 * Location picker aligned to BE GET /v1/locations.
 * 1) Roots (no parentCode) → province / municipality
 * 2) Children (?parentCode=) → ward / commune / special zone, or entire province
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  ArrowLeft,
  Buildings,
  MapPin,
  MagnifyingGlass,
  MapTrifold,
} from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BookingStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { RouteProp } from '@react-navigation/native';
import {
  useLocationChildren,
  useLocations,
} from '@features/location/hooks/useLocations';
import type { Location } from '@features/location/types/location';
import {
  isLocationLeafType,
  isLocationRootType,
} from '@features/location/types/location';
import { normalizeLocationSearchText } from '@features/location/utils/locationSearch';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'CityPicker'>;
type CityPickerRouteProp = RouteProp<BookingStackParamList, 'CityPicker'>;
type Step = 'province' | 'ward';

const keyExtractor = (item: Location) => item.id;

const typeKey = (type: Location['type']): string => {
  switch (type) {
    case 'MUNICIPALITY': return 'booking.locations.municipality';
    case 'PROVINCE': return 'booking.locations.province';
    case 'WARD': return 'booking.locations.ward';
    case 'COMMUNE': return 'booking.locations.commune';
    case 'SPECIAL_ZONE': return 'booking.locations.specialZone';
    default: return 'booking.locations.province';
  }
};

const LocationRow = memo(function LocationRow({
  location,
  onSelect,
  chevron,
}: {
  location: Location;
  onSelect: (location: Location) => void;
  chevron: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const typeLabel = t(typeKey(location.type));

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
      onPress={() => onSelect(location)}
      accessibilityRole="button"
      accessibilityLabel={t('booking.locations.locationAccessibility', {
        name: location.name,
        type: typeLabel,
      })}
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

export function CityPickerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<CityPickerRouteProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const setSearchParams = useBookingStore((s) => s.setSearchParams);
  const mode = route.params.mode;

  const [step, setStep] = useState<Step>('province');
  const [province, setProvince] = useState<Location | null>(null);
  const [query, setQuery] = useState('');

  const rootsQuery = useLocations();
  const wardsQuery = useLocationChildren(step === 'ward' ? province?.code : undefined);

  useEffect(() => {
    setQuery('');
  }, [step]);

  const filterByQuery = useCallback((rows: Location[]) => {
    const q = normalizeLocationSearchText(query);
    if (!q) return rows;
    return rows.filter((row) => normalizeLocationSearchText(row.name).includes(q));
  }, [query]);

  const provinceRows = useMemo(
    () => filterByQuery(
      (rootsQuery.data ?? []).filter((l) => isLocationRootType(l.type)),
    ),
    [filterByQuery, rootsQuery.data],
  );

  const wardRows = useMemo(
    () => filterByQuery(
      (wardsQuery.data ?? []).filter((l) => isLocationLeafType(l.type)),
    ),
    [filterByQuery, wardsQuery.data],
  );

  const commit = useCallback((root: Location, leaf: Location | null) => {
    const label = leaf
      ? t('booking.locations.wardInProvince', { ward: leaf.name, province: root.name })
      : root.name;

    if (mode === 'from') {
      setSearchParams({
        from: label,
        originLocationCode: root.code,
        originWardCode: leaf?.code ?? '',
        originStationId: '',
        originStationName: '',
      });
    } else {
      setSearchParams({
        to: label,
        destinationLocationCode: root.code,
        destinationWardCode: leaf?.code ?? '',
        destinationStationId: '',
        destinationStationName: '',
      });
    }
    navigation.goBack();
  }, [mode, navigation, setSearchParams, t]);

  const onPickProvince = useCallback((row: Location) => {
    setProvince(row);
    setStep('ward');
  }, []);

  const onPickWard = useCallback((row: Location) => {
    if (province) commit(province, row);
  }, [commit, province]);

  const onPickEntireProvince = useCallback(() => {
    if (province) commit(province, null);
  }, [commit, province]);

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

  const empty = useMemo(() => {
    if (active.isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.empty}>
            {step === 'ward' ? t('booking.locations.loadingWards') : t('booking.locations.loading')}
          </Text>
        </View>
      );
    }
    if (active.isError) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.empty}>{t('booking.locations.loadError')}</Text>
          <Pressable
            onPress={() => active.refetch()}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <Text style={styles.empty}>
        {step === 'ward' ? t('booking.locations.noWardMatches') : t('booking.locations.noMatches')}
      </Text>
    );
  }, [active, step, styles, t, theme.colors.primary]);

  return (
    <View style={styles.root}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="cityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={theme.isDark ? 0.18 : 0.12} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#cityGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <KeyboardAvoidingView
          behavior="translate-with-padding"
          style={styles.keyboardContainer}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={onBack}
              style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
            >
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {step === 'ward'
                ? t('booking.locations.wardTitle')
                : mode === 'from'
                  ? t('booking.locations.departureTitle')
                  : t('booking.locations.destinationTitle')}
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
              ? t('booking.locations.stepProvinceHint')
              : t('booking.locations.stepWardHint')}
          </Text>

          <View style={styles.searchBox}>
            <MagnifyingGlass size={16} color={theme.colors.textTertiary} weight="bold" />
            <TextInput
              style={styles.searchInput}
              placeholder={
                step === 'ward'
                  ? t('booking.locations.searchWardPlaceholder')
                  : t('booking.locations.searchPlaceholder')
              }
              placeholderTextColor={theme.colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus={step === 'province'}
              returnKeyType="search"
            />
          </View>

          <FlashList
            data={list}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }: ListRenderItemInfo<Location>) => (
              <LocationRow
                location={item}
                onSelect={step === 'province' ? onPickProvince : onPickWard}
                chevron={step === 'province'}
              />
            )}
            ListHeaderComponent={
              step === 'ward' && province && !active.isLoading && !active.isError ? (
                <Pressable
                  onPress={onPickEntireProvince}
                  style={({ pressed }) => [styles.entireProvinceRow, pressed ? styles.pressed : null]}
                  accessibilityRole="button"
                >
                  <View style={styles.entireProvinceIcon}>
                    <MapTrifold size={18} color={theme.colors.primary} weight="fill" />
                  </View>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemName}>
                      {t('booking.locations.entireProvince', { province: province.name })}
                    </Text>
                    <Text style={styles.itemRegion}>
                      {t('booking.locations.entireProvinceHint')}
                    </Text>
                  </View>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={empty}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  gradientContainer: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, height: 300, zIndex: 0,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  headerTitle: {
    flex: 1, marginHorizontal: spacing.sm, textAlign: 'center' as const,
    fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: theme.colors.textPrimary,
  },
  headerSpacer: { width: 40 },
  provinceChip: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.xs,
    alignSelf: 'center' as const, marginHorizontal: spacing.xl, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999,
    backgroundColor: theme.colors.primaryFaded,
  },
  provinceChipText: {
    fontFamily: fontFamilies.medium, fontSize: fontSizes.xs,
    color: theme.colors.primary, maxWidth: 260,
  },
  stepHint: {
    paddingHorizontal: spacing.xl, marginBottom: spacing.sm,
    fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, color: theme.colors.textSecondary,
  },
  searchBox: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm,
    marginHorizontal: spacing.xl, paddingHorizontal: spacing.md, height: 48, borderRadius: 16,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surface,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
    ...theme.effects.cardShadow, marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1, fontFamily: fontFamilies.regular, fontSize: fontSizes.md,
    color: theme.colors.textPrimary, padding: 0,
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  entireProvinceRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md,
    paddingVertical: spacing.md, marginBottom: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  entireProvinceIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  item: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  itemTextWrap: { flex: 1 },
  itemName: {
    fontFamily: fontFamilies.medium, fontSize: fontSizes.md, color: theme.colors.textPrimary,
  },
  itemRegion: {
    fontFamily: fontFamilies.regular, fontSize: fontSizes.xs,
    color: theme.colors.textTertiary, marginTop: 2,
  },
  itemArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  empty: {
    fontFamily: fontFamilies.regular, fontSize: fontSizes.md,
    color: theme.colors.textTertiary, textAlign: 'center' as const,
  },
  stateContainer: {
    alignItems: 'center' as const, gap: spacing.md, marginTop: spacing.xxl,
  },
  retryButton: {
    minWidth: 112, height: 40, paddingHorizontal: spacing.lg, borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  retryText: {
    fontFamily: fontFamilies.bold, fontSize: fontSizes.sm, color: theme.colors.textInverse,
  },
  arrowForward: { transform: [{ rotate: '180deg' }] },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
