import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { ListRenderItem } from 'react-native';
import { ArrowLeft, MagnifyingGlass, MapPin } from 'phosphor-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLocations } from '@features/location/hooks/useLocations';
import type { Location } from '@features/location/types/location';
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

const locationKeyExtractor = (item: Location) => item.id;

interface LocationOptionProps {
  location: Location;
  disabled: boolean;
  onSelect: (location: Location) => void;
}

const LocationOption = memo(function LocationOption({
  location,
  disabled,
  onSelect,
}: LocationOptionProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const disabledHint = t('parcel.locations.alreadySelected');
  const handlePress = useCallback(() => {
    onSelect(location);
  }, [location, onSelect]);

  return (
    <Pressable
      accessibilityLabel={disabled ? `${location.name}. ${disabledHint}` : location.name}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.item,
        disabled ? styles.itemDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <View style={styles.itemIcon}>
        <MapPin size={16} color={theme.colors.primary} weight="fill" />
      </View>
      <View style={styles.itemTextWrap}>
        <Text style={styles.itemName}>{location.name}</Text>
        {disabled ? <Text style={styles.itemRegion}>{disabledHint}</Text> : null}
      </View>
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
  const {
    data: locations = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useLocations();
  const fromLocationCode = useParcelStore(state => state.fromLocationCode);
  const toLocationCode = useParcelStore(state => state.toLocationCode);
  const setFromLocation = useParcelStore(state => state.setFromLocation);
  const setToLocation = useParcelStore(state => state.setToLocation);
  const [query, setQuery] = useState('');
  const mode = route.params.mode;
  const oppositeLocationCode =
    mode === 'from' ? toLocationCode : fromLocationCode;

  const filteredLocations = useMemo(() => {
    const activeLocations = locations.filter(location => location.isActive);
    const normalizedQuery = normalizeLocationSearchText(query);

    if (!normalizedQuery) {
      return activeLocations;
    }

    return activeLocations.filter(location => {
      return normalizeLocationSearchText(location.name).includes(normalizedQuery);
    });
  }, [locations, query]);

  const onSelectLocation = useCallback(
    (location: Location) => {
      if (location.code === oppositeLocationCode) {
        return;
      }

      if (mode === 'from') {
        setFromLocation(location.name, location.code);
      } else {
        setToLocation(location.name, location.code);
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
    },
    [mode, navigation, oppositeLocationCode, route.params.next, setFromLocation, setToLocation],
  );

  const renderLocation = useCallback<ListRenderItem<Location>>(
    ({ item }) => (
      <LocationOption
        disabled={item.code === oppositeLocationCode}
        location={item}
        onSelect={onSelectLocation}
      />
    ),
    [onSelectLocation, oppositeLocationCode],
  );

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.empty}>
            {t('parcel.locations.loading')}
          </Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.empty}>
            {t('parcel.locations.loadError')}
          </Text>
          <Pressable
            onPress={() => refetch()}
            disabled={isFetching}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            {isFetching ? (
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
        {t('parcel.locations.emptySearch')}
      </Text>
    );
  }, [
    isError,
    isFetching,
    isLoading,
    refetch,
    styles,
    t,
    theme.colors.primary,
    theme.colors.textInverse,
  ]);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardContainer}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.headerButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {mode === 'from'
              ? t('parcel.locations.originTitle')
              : t('parcel.locations.destinationTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchBox}>
          <MagnifyingGlass
            size={16}
            color={theme.colors.textTertiary}
            weight="bold"
          />
          <TextInput
            accessibilityLabel={t('parcel.locations.searchAccessibility')}
            style={styles.searchInput}
            placeholder={t('parcel.locations.searchPlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={filteredLocations}
          keyExtractor={locationKeyExtractor}
          contentContainerStyle={styles.list}
          renderItem={renderLocation}
          ListEmptyComponent={listEmpty}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          maxToRenderPerBatch={12}
          removeClippedSubviews={process.env.EXPO_OS === 'android'}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  keyboardContainer: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerButton: {
    ...theme.components.headerButton,
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  headerSpacer: { width: 38 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  retryButton: {
    minWidth: 112,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
