/**
 * Full-screen provider-backed address search for Shuttle pickup/drop-off.
 * Selecting a prediction resolves place details, saves the verified address,
 * and immediately returns to the booking flow. Raw input is never persisted.
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CheckCircle,
  MagnifyingGlass,
  MapPin,
  X,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import type { BookingStackParamList } from '@app/navigation/types';
import { appConfig } from '@shared/constants/config';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useDebounce, useThemedStyles } from '@shared/hooks';
import {
  isPlacesRequestAborted,
  isPlacesRequestError,
  usePlacesSearch,
  type PlacePrediction,
  type PlacesErrorCode,
  type ResolvedPlace,
} from '@shared/places';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { GeoCoordinate } from '@shared/types/common';

import { useBookingStore } from '../store/useBookingStore';
import {
  checkShuttleAddressAgainstStation,
  composeShuttleServiceAddress,
  SHUTTLE_ADDRESS_MAX_LENGTH,
  SHUTTLE_MAX_ROAD_DISTANCE_KM,
  SHUTTLE_MAX_ROAD_DISTANCE_METERS,
  validateShuttleService,
} from '../utils/shuttle';

type NavProp = NativeStackNavigationProp<
  BookingStackParamList,
  'ShuttleAddressPicker'
>;
type PickerRoute = RouteProp<BookingStackParamList, 'ShuttleAddressPicker'>;

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 3;
const MAX_PREDICTIONS = 5;
const BIAS_RADIUS_METERS = SHUTTLE_MAX_ROAD_DISTANCE_METERS;

const normalizeQuery = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const placesErrorTranslationKey = (code: PlacesErrorCode): string => {
  switch (code) {
    case 'CONFIGURATION':
      return 'booking.shuttlePicker.errors.configuration';
    case 'OFFLINE':
      return 'booking.shuttlePicker.errors.offline';
    case 'NO_RESULTS':
      return 'booking.shuttlePicker.errors.noResults';
    case 'QUOTA':
      return 'booking.shuttlePicker.errors.quota';
    case 'INVALID_PLACE':
      return 'booking.shuttlePicker.errors.invalidPlace';
    default:
      return 'booking.shuttlePicker.errors.unavailable';
  }
};

const predictionKeyExtractor = (item: PlacePrediction): string => item.placeId;

const SuggestionRow = memo(function SuggestionRow({
  item,
  resolving,
  disabled,
  onPress,
}: {
  item: PlacePrediction;
  resolving: boolean;
  disabled: boolean;
  onPress: (item: PlacePrediction) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        item.secondaryText
          ? `${item.primaryText}. ${item.secondaryText}`
          : item.primaryText
      }
      accessibilityState={{ busy: resolving, disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.suggestionRow,
        pressed && !disabled ? styles.pressed : null,
        disabled && !resolving ? styles.disabled : null,
      ]}
    >
      <View style={styles.suggestionIcon}>
        {resolving ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <MapPin size={20} color={theme.colors.primary} weight="duotone" />
        )}
      </View>
      <View style={styles.suggestionCopy}>
        <Text style={styles.suggestionPrimary} numberOfLines={2}>
          {item.primaryText}
        </Text>
        {item.secondaryText ? (
          <Text style={styles.suggestionSecondary} numberOfLines={2}>
            {item.secondaryText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export function ShuttlePlacesAddressPickerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavProp>();
  const route = useRoute<PickerRoute>();
  const inputRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);
  const selectionRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const {
    leg,
    direction,
    stationId,
    stationName,
    stationLatitude,
    stationLongitude,
  } = route.params;
  const isDropoff = direction === 'dropoff';
  const stationCoordinate = useMemo<GeoCoordinate>(
    () => ({ latitude: stationLatitude, longitude: stationLongitude }),
    [stationLatitude, stationLongitude],
  );

  const {
    currentLeg,
    selectedShuttlePickup,
    selectedShuttleDropoff,
    setSelectedShuttlePickup,
    setSelectedShuttleDropoff,
  } = useBookingStore(
    useShallow(state => ({
      currentLeg: state.currentLeg,
      selectedShuttlePickup: state.selectedShuttlePickup,
      selectedShuttleDropoff: state.selectedShuttleDropoff,
      setSelectedShuttlePickup: state.setSelectedShuttlePickup,
      setSelectedShuttleDropoff: state.setSelectedShuttleDropoff,
    })),
  );

  const existingDraft = useMemo(() => {
    const draft = isDropoff ? selectedShuttleDropoff : selectedShuttlePickup;
    return draft?.stationId === stationId ? draft : null;
  }, [isDropoff, selectedShuttleDropoff, selectedShuttlePickup, stationId]);

  const placesAvailable = appConfig.goongPlacesEnabled;
  const {
    cancelPendingRequests,
    cancelSearch,
    findPredictions,
    resolvePlaceDetails,
  } = usePlacesSearch();

  const [query, setQuery] = useState(existingDraft?.address ?? '');
  const [hasEditedQuery, setHasEditedQuery] = useState(!existingDraft);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(
    placesAvailable ? null : t('booking.shuttlePicker.errors.configuration'),
  );
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const normalizedDebouncedQuery = useMemo(
    () => normalizeQuery(debouncedQuery),
    [debouncedQuery],
  );
  const normalizedQuery = useMemo(() => normalizeQuery(query), [query]);

  useEffect(() => {
    if (currentLeg !== leg) navigation.goBack();
  }, [currentLeg, leg, navigation]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      selectionRequestIdRef.current += 1;
      cancelPendingRequests();
    },
    [cancelPendingRequests],
  );

  useEffect(() => {
    if (!placesAvailable || !hasEditedQuery) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }
    if (normalizedDebouncedQuery.length < MIN_QUERY_LENGTH) {
      setPredictions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsSearching(true);
    setSearchError(null);

    const search = async (): Promise<void> => {
      try {
        const results = await findPredictions({
          query: normalizedDebouncedQuery,
          location: stationCoordinate,
          radiusMeters: BIAS_RADIUS_METERS,
          maxResults: MAX_PREDICTIONS,
        });
        if (cancelled || requestIdRef.current !== requestId) return;
        setPredictions(results);
        if (results.length === 0) {
          setSearchError(t('booking.shuttlePicker.errors.noResults'));
        }
      } catch (error) {
        if (cancelled || requestIdRef.current !== requestId) return;
        if (isPlacesRequestAborted(error)) return;
        const code = isPlacesRequestError(error) ? error.code : 'UNAVAILABLE';
        setPredictions([]);
        setSearchError(t(placesErrorTranslationKey(code)));
        if (code === 'CONFIGURATION') {
          setBannerError(t(placesErrorTranslationKey(code)));
        }
      } finally {
        if (!cancelled && requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    };

    search().catch(() => undefined);
    return () => {
      cancelled = true;
      cancelSearch();
    };
  }, [
    cancelSearch,
    findPredictions,
    hasEditedQuery,
    normalizedDebouncedQuery,
    placesAvailable,
    stationCoordinate,
    t,
  ]);

  const saveResolvedPlace = useCallback(
    (place: ResolvedPlace): boolean => {
      const address = composeShuttleServiceAddress(
        place.displayName,
        place.formattedAddress,
      );
      const validation = validateShuttleService({
        address,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      if (!validation.value) {
        setSearchError(t('booking.shuttlePicker.errors.invalidPlace'));
        return false;
      }

      const range = checkShuttleAddressAgainstStation(
        validation.value,
        stationCoordinate,
      );
      if (!range.ok) {
        setSearchError(
          range.reason === 'TOO_FAR'
            ? t(
              isDropoff
                ? 'booking.shuttlePicker.errors.tooFarFromDestination'
                : 'booking.shuttlePicker.errors.tooFarFromDeparture',
              { station: stationName, limitKm: SHUTTLE_MAX_ROAD_DISTANCE_KM },
            )
            : t('booking.shuttlePicker.errors.invalidPlace'),
        );
        return false;
      }

      const draft = { stationId, ...validation.value };
      if (isDropoff) setSelectedShuttleDropoff(draft);
      else setSelectedShuttlePickup(draft);

      Keyboard.dismiss();
      navigation.goBack();
      return true;
    },
    [
      isDropoff,
      navigation,
      setSelectedShuttleDropoff,
      setSelectedShuttlePickup,
      stationCoordinate,
      stationId,
      stationName,
      t,
    ],
  );

  const handlePredictionPress = useCallback(
    async (prediction: PlacePrediction) => {
      if (resolvingPlaceId || !placesAvailable) return;
      const selectionRequestId = selectionRequestIdRef.current + 1;
      selectionRequestIdRef.current = selectionRequestId;
      setResolvingPlaceId(prediction.placeId);
      setSearchError(null);

      try {
        const place = await resolvePlaceDetails({
          placeId: prediction.placeId,
        });
        if (
          !mountedRef.current
          || selectionRequestIdRef.current !== selectionRequestId
        ) return;
        saveResolvedPlace(place);
      } catch (error) {
        if (
          !mountedRef.current
          || selectionRequestIdRef.current !== selectionRequestId
        ) return;
        if (isPlacesRequestAborted(error)) return;
        const code = isPlacesRequestError(error) ? error.code : 'UNAVAILABLE';
        setSearchError(t(placesErrorTranslationKey(code)));
      } finally {
        if (
          mountedRef.current
          && selectionRequestIdRef.current === selectionRequestId
        ) setResolvingPlaceId(null);
      }
    },
    [
      placesAvailable,
      resolvingPlaceId,
      resolvePlaceDetails,
      saveResolvedPlace,
      t,
    ],
  );

  const handleQueryChange = useCallback((value: string) => {
    selectionRequestIdRef.current += 1;
    cancelPendingRequests();
    requestIdRef.current += 1;
    setQuery(value);
    setHasEditedQuery(true);
    setPredictions([]);
    setIsSearching(false);
    setResolvingPlaceId(null);
    setSearchError(null);
  }, [cancelPendingRequests]);

  const handleClearQuery = useCallback(() => {
    selectionRequestIdRef.current += 1;
    cancelPendingRequests();
    requestIdRef.current += 1;
    setQuery('');
    setHasEditedQuery(true);
    setPredictions([]);
    setIsSearching(false);
    setResolvingPlaceId(null);
    setSearchError(null);
    inputRef.current?.focus();
  }, [cancelPendingRequests]);

  const handleBack = useCallback(() => {
    selectionRequestIdRef.current += 1;
    cancelPendingRequests();
    navigation.goBack();
  }, [cancelPendingRequests, navigation]);

  const renderPrediction = useCallback(
    ({ item }: ListRenderItemInfo<PlacePrediction>) => (
      <SuggestionRow
        item={item}
        resolving={resolvingPlaceId === item.placeId}
        disabled={Boolean(resolvingPlaceId)}
        onPress={prediction => {
          handlePredictionPress(prediction).catch(() => undefined);
        }}
      />
    ),
    [handlePredictionPress, resolvingPlaceId],
  );

  const showQueryHint =
    hasEditedQuery &&
    normalizedQuery.length > 0 &&
    normalizedQuery.length < MIN_QUERY_LENGTH;
  const showPredictions = predictions.length > 0;
  const showExistingAddress = Boolean(existingDraft && !hasEditedQuery);
  const showEmptyState =
    hasEditedQuery &&
    normalizedQuery.length === 0 &&
    !isSearching &&
    !searchError;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior="translate-with-padding"
          style={styles.keyboardContainer}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={handleBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <ArrowLeft
                size={21}
                color={theme.colors.textPrimary}
                weight="bold"
              />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {t(
                  isDropoff
                    ? 'booking.shuttlePicker.dropoffTitle'
                    : 'booking.shuttlePicker.pickupTitle',
                )}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {stationName}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.searchBox}>
              <MagnifyingGlass
                size={20}
                color={theme.colors.primary}
                weight="bold"
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={handleQueryChange}
                placeholder={t(
                  isDropoff
                    ? 'booking.shuttlePicker.dropoffSearchPlaceholder'
                    : 'booking.shuttlePicker.searchPlaceholder',
                )}
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.searchInput}
                autoFocus
                selectTextOnFocus={Boolean(existingDraft)}
                autoCorrect={false}
                autoCapitalize="sentences"
                autoComplete="off"
                importantForAutofill="no"
                returnKeyType="search"
                editable={placesAvailable && !resolvingPlaceId}
                accessibilityLabel={t(
                  isDropoff
                    ? 'booking.shuttlePicker.dropoffSearchAccessibility'
                    : 'booking.shuttlePicker.searchAccessibility',
                )}
                maxLength={SHUTTLE_ADDRESS_MAX_LENGTH}
              />
              {query.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.shuttlePicker.clearSearch')}
                  onPress={handleClearQuery}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed ? styles.pressed : null,
                  ]}
                  hitSlop={8}
                >
                  <X
                    size={17}
                    color={theme.colors.textSecondary}
                    weight="bold"
                  />
                </Pressable>
              ) : null}
            </View>

            {bannerError ? (
              <Text style={styles.bannerError} accessibilityLiveRegion="polite">
                {bannerError}
              </Text>
            ) : null}

            <View style={styles.resultsArea}>
              {showExistingAddress ? (
                <View style={styles.inlineStatus}>
                  <CheckCircle
                    size={21}
                    color={theme.colors.success}
                    weight="fill"
                  />
                  <Text style={styles.inlineStatusText}>
                    {t('booking.shuttlePicker.existingAddressHint')}
                  </Text>
                </View>
              ) : null}

              {isSearching ? (
                <View
                  style={styles.inlineStatus}
                  accessibilityLiveRegion="polite"
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.inlineStatusText}>
                    {t('booking.shuttlePicker.searching')}
                  </Text>
                </View>
              ) : null}

              {!isSearching && showQueryHint ? (
                <Text style={styles.hintText}>
                  {t('booking.shuttlePicker.minimumQueryHint', {
                    count: MIN_QUERY_LENGTH,
                  })}
                </Text>
              ) : null}

              {!isSearching && searchError ? (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {searchError}
                </Text>
              ) : null}

              {!isSearching && showPredictions ? (
                <View style={styles.predictionsArea}>
                  <Text style={styles.attribution}>
                    {t('booking.shuttlePicker.providerAttribution')}
                  </Text>
                  <FlashList
                    data={predictions}
                    keyExtractor={predictionKeyExtractor}
                    renderItem={renderPrediction}
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={styles.predictionsContent}
                  />
                </View>
              ) : null}

              {showEmptyState ? (
                <View style={styles.emptyState}>
                  <MagnifyingGlass
                    size={28}
                    color={theme.colors.textTertiary}
                    weight="duotone"
                  />
                  <Text style={styles.emptyText}>
                    {t('booking.shuttlePicker.emptySearchHint')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  searchBox: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1.5,
    borderColor: theme.colors.borderFocused,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.isDark
      ? '0 4px 16px rgba(0, 0, 0, 0.22)'
      : '0 4px 16px rgba(31, 41, 55, 0.08)',
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  bannerError: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: theme.colors.error,
  },
  resultsArea: { flex: 1, minHeight: 0, paddingTop: spacing.md },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inlineStatusText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  hintText: {
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  errorText: {
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: theme.colors.error,
  },
  predictionsArea: { flex: 1, minHeight: 0 },
  attribution: {
    alignSelf: 'flex-end',
    paddingBottom: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  predictionsContent: { paddingBottom: spacing.lg },
  suggestionRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
  },
  suggestionCopy: { flex: 1, gap: spacing.xxs },
  suggestionPrimary: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  suggestionSecondary: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    maxWidth: 280,
    textAlign: 'center' as const,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
});
