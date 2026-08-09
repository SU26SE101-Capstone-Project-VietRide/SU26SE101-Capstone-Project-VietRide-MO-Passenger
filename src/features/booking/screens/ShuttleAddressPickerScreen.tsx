/**
 * ShuttleAddressPickerScreen — map-first Google Places address picker.
 *
 * Layout A: stable MapView, floating search, suggestion list + map markers for
 * Google predictions, bottom preview sheet (select CTA), terminal marker,
 * draggable refine pin, and confirmation surface. Never saves raw unverified
 * text. GPS permission is not requested on open.
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
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
  type MapViewProps,
  type PoiClickEvent,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MagnifyingGlass,
  MapPin,
  X,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import type { BookingStackParamList } from '@app/navigation/types';
import { Button } from '@shared/components/Button';
import { appConfig } from '@shared/constants/config';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useDebounce, useThemedStyles } from '@shared/hooks';
import { useMotion } from '@shared/motion';
import {
  isNativePlacesAvailable,
  isPlacesRequestError,
  resolveMapPlaceSelection,
  resolvePlaceDetails,
  usePlacesSession,
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
import {
  getGeoDistanceKm,
  isValidGeoCoordinate,
} from '@shared/utils/geo';
import {
  SHUTTLE_PICKER_DARK_MAP_STYLE,
  SHUTTLE_PICKER_LIGHT_MAP_STYLE,
  getTrackingMapPalette,
} from '@features/tracking/components/trackingMapStyles';

import { useBookingStore } from '../store/useBookingStore';
import {
  composeShuttleServiceAddress,
  SHUTTLE_ADDRESS_MAX_LENGTH,
  validateShuttleService,
} from '../utils/shuttle';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'ShuttleAddressPicker'>;
type Route = RouteProp<BookingStackParamList, 'ShuttleAddressPicker'>;

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LENGTH = 3;
const MAX_PREDICTIONS = 5;
const MAX_REFINE_METERS = 300;
const BIAS_RADIUS_METERS = 5_000;
const COUNTRY_CODE = 'vn';
const DEFAULT_DELTA = 0.018;
const MARKER_TRACKS_VIEW_CHANGES_MS = 500;

type SelectedPlaceState = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  origin: GeoCoordinate;
  pin: GeoCoordinate;
};

const toRegion = (coordinate: GeoCoordinate, delta = DEFAULT_DELTA): Region => ({
  latitude: coordinate.latitude,
  longitude: coordinate.longitude,
  latitudeDelta: delta,
  longitudeDelta: delta,
});

const normalizeQuery = (value: string): string => value.trim().replace(/\s+/g, ' ');

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
    case 'UNSUPPORTED':
      return 'booking.shuttlePicker.errors.unsupported';
    case 'INVALID_PLACE':
      return 'booking.shuttlePicker.errors.invalidPlace';
    case 'INVALID_SESSION':
      return 'booking.shuttlePicker.errors.session';
    default:
      return 'booking.shuttlePicker.errors.unavailable';
  }
};

const SuggestionRow = memo(function SuggestionRowComponent({
  item,
  hasMapPin,
  isHighlighted,
  onPress,
}: {
  item: PlacePrediction;
  hasMapPin: boolean;
  isHighlighted: boolean;
  onPress: (item: PlacePrediction) => void;
}): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.primaryText}. ${item.secondaryText}`}
      accessibilityState={{ selected: isHighlighted }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.suggestionRow,
        isHighlighted ? styles.suggestionRowActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <MapPin
        size={18}
        color={isHighlighted ? theme.colors.primary : theme.colors.textSecondary}
        weight={hasMapPin || isHighlighted ? 'fill' : 'duotone'}
      />
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

const PredictionMapMarker = memo(function PredictionMapMarkerComponent({
  place,
  index,
  highlighted,
  onPress,
}: {
  place: ResolvedPlace;
  index: number;
  highlighted: boolean;
  onPress: (placeId: string) => void;
}): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(place.placeId), [onPress, place.placeId]);

  return (
    <Marker
      coordinate={{
        latitude: place.latitude,
        longitude: place.longitude,
      }}
      identifier={`prediction-${place.placeId}`}
      title={place.displayName}
      description={place.formattedAddress}
      // Small set of pins (≤5); keep tracking so Android paints custom views.
      tracksViewChanges
      onPress={handlePress}
      zIndex={highlighted ? 20 : 10 + index}
      accessibilityLabel={place.displayName}
    >
      <View
        style={[
          styles.predictionMarker,
          highlighted ? styles.predictionMarkerActive : null,
        ]}
      >
        <Text
          style={[
            styles.predictionMarkerIndex,
            highlighted ? styles.predictionMarkerIndexActive : null,
          ]}
        >
          {index + 1}
        </Text>
        <MapPin
          size={highlighted ? 22 : 18}
          color={highlighted ? theme.colors.primary : theme.colors.textPrimary}
          weight="fill"
        />
      </View>
    </Marker>
  );
});

export function ShuttleAddressPickerScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { reduceMotion } = useMotion();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<Route>();
  const mapPalette = getTrackingMapPalette(theme.isDark);

  const {
    leg,
    direction,
    stationId,
    stationName,
    stationLatitude,
    stationLongitude,
  } = route.params;

  const isDropoff = direction === 'dropoff';
  const stationCoordinate = useMemo<GeoCoordinate>(() => ({
    latitude: stationLatitude,
    longitude: stationLongitude,
  }), [stationLatitude, stationLongitude]);

  const {
    currentLeg,
    selectedShuttlePickup,
    selectedShuttleDropoff,
    setSelectedShuttlePickup,
    setSelectedShuttleDropoff,
  } = useBookingStore(useShallow((state) => ({
    currentLeg: state.currentLeg,
    selectedShuttlePickup: state.selectedShuttlePickup,
    selectedShuttleDropoff: state.selectedShuttleDropoff,
    setSelectedShuttlePickup: state.setSelectedShuttlePickup,
    setSelectedShuttleDropoff: state.setSelectedShuttleDropoff,
  })));

  const existingDraft = useMemo(() => {
    const draft = isDropoff ? selectedShuttleDropoff : selectedShuttlePickup;
    if (!draft || draft.stationId !== stationId) {
      return null;
    }
    return draft;
  }, [isDropoff, selectedShuttleDropoff, selectedShuttlePickup, stationId]);

  const mapsEnabled = Platform.OS === 'android'
    ? appConfig.nativeGoogleMapsEnabled.android
    : appConfig.nativeGoogleMapsEnabled.ios;
  const placesAvailable = mapsEnabled && isNativePlacesAvailable();

  const {
    ensureSession,
    endSession: endPlacesSessionOwned,
    clearLocalSession,
    findPredictions: findPredictionsWithSession,
    controller: placesSession,
  } = usePlacesSession();

  const mapRef = useRef<MapView | null>(null);
  const requestIdRef = useRef(0);
  const pinTracksViewChangesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [searchInputActive, setSearchInputActive] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  /** Place Details cache for map markers / sheet — keyed by placeId. */
  const [previewByPlaceId, setPreviewByPlaceId] = useState<Record<string, ResolvedPlace>>({});
  /** Place open in the bottom preview sheet (marker or list). */
  const [sheetPlaceId, setSheetPlaceId] = useState<string | null>(null);
  const [isSheetResolving, setIsSheetResolving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [confirmCardHeight, setConfirmCardHeight] = useState(0);
  const [bannerError, setBannerError] = useState<string | null>(
    placesAvailable ? null : t('booking.shuttlePicker.errors.unsupported'),
  );
  const [selected, setSelected] = useState<SelectedPlaceState | null>(() => {
    if (!existingDraft) {
      return null;
    }
    const origin = {
      latitude: existingDraft.latitude,
      longitude: existingDraft.longitude,
    };
    return {
      placeId: 'draft',
      displayName: existingDraft.address,
      formattedAddress: existingDraft.address,
      origin,
      pin: origin,
    };
  });
  /** Policy A: drag refines coordinates only; keep POI name and show badge. */
  const [pinRefined, setPinRefined] = useState(false);
  const [pinTracksViewChanges, setPinTracksViewChanges] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchBiasRef = useRef<GeoCoordinate>(selected?.pin ?? stationCoordinate);

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const normalizedDebouncedQuery = useMemo(
    () => normalizeQuery(debouncedQuery),
    [debouncedQuery],
  );

  const initialRegion = useMemo(
    () => toRegion(selected?.pin ?? stationCoordinate, selected ? 0.01 : DEFAULT_DELTA),
    // Stable initial region only — do not remount MapView when pin moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Shuttle picker keeps Google POI pins; tracking maps use a quieter style.
  const mapStyle = theme.isDark
    ? SHUTTLE_PICKER_DARK_MAP_STYLE
    : SHUTTLE_PICKER_LIGHT_MAP_STYLE;

  const clearPinTracksTimer = useCallback(() => {
    if (pinTracksViewChangesTimerRef.current) {
      clearTimeout(pinTracksViewChangesTimerRef.current);
      pinTracksViewChangesTimerRef.current = null;
    }
  }, []);

  const scheduleStopTrackingViewChanges = useCallback(() => {
    clearPinTracksTimer();
    setPinTracksViewChanges(true);
    pinTracksViewChangesTimerRef.current = setTimeout(() => {
      setPinTracksViewChanges(false);
    }, MARKER_TRACKS_VIEW_CHANGES_MS);
  }, [clearPinTracksTimer]);

  useEffect(() => {
    if (currentLeg !== leg) {
      // Stale route for a different booking leg — leave without writing state.
      navigation.goBack();
    }
  }, [currentLeg, leg, navigation]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => () => {
    clearPinTracksTimer();
    // Session cleanup is owned by usePlacesSession unmount.
  }, [clearPinTracksTimer]);

  useEffect(() => {
    if (selected?.pin) {
      // Keep the next user-initiated search biased to the visible selection
      // without making pin movement itself trigger another Places request.
      searchBiasRef.current = selected.pin;
    }
  }, [selected?.pin]);

  useEffect(() => {
    if (!placesAvailable || !searchInputActive) {
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

    const bias = searchBiasRef.current;

    const runSearch = async (): Promise<void> => {
      try {
        const nextPredictions = await findPredictionsWithSession({
          query: normalizedDebouncedQuery,
          latitude: bias.latitude,
          longitude: bias.longitude,
          radiusMeters: BIAS_RADIUS_METERS,
          countryCode: COUNTRY_CODE,
          maxResults: MAX_PREDICTIONS,
        });
        if (cancelled || requestIdRef.current !== requestId) {
          return;
        }
        setPredictions(nextPredictions);
        if (nextPredictions.length === 0) {
          setSearchError(t('booking.shuttlePicker.errors.noResults'));
        }
      } catch (error) {
        if (cancelled || requestIdRef.current !== requestId) {
          return;
        }
        setPredictions([]);
        const code = isPlacesRequestError(error) ? error.code : 'UNAVAILABLE';
        setSearchError(t(placesErrorTranslationKey(code)));
        if (code === 'CONFIGURATION' || code === 'UNSUPPORTED') {
          setBannerError(t(placesErrorTranslationKey(code)));
        }
        if (code === 'INVALID_SESSION') {
          clearLocalSession();
        }
      } finally {
        if (!cancelled && requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    };
    runSearch().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    clearLocalSession,
    findPredictionsWithSession,
    normalizedDebouncedQuery,
    placesAvailable,
    searchInputActive,
    t,
  ]);

  const animateToCoordinate = useCallback((coordinate: GeoCoordinate, delta = 0.01) => {
    mapRef.current?.animateToRegion(
      toRegion(coordinate, delta),
      reduceMotion ? 0 : 280,
    );
  }, [reduceMotion]);

  const closePreviewSheet = useCallback(() => {
    setSheetPlaceId(null);
    setIsSheetResolving(false);
  }, []);

  /**
   * Open the bottom preview sheet for a place.
   * Map POI taps always pass a coordinate seed — the sheet must become
   * selectable immediately from that seed. Place Details is best-effort
   * enrichment (full street address); it must never block selection.
   */
  const openPreviewSheet = useCallback(async (
    placeId: string,
    seed?: Partial<ResolvedPlace> & Pick<ResolvedPlace, 'latitude' | 'longitude'>,
  ) => {
    if (isResolving) {
      return;
    }

    const normalizedPlaceId = placeId.trim();
    if (!normalizedPlaceId) {
      return;
    }

    // Search-list path needs Places. Map POI seeds only need coordinates.
    if (!seed && !placesAvailable) {
      setSearchError(t('booking.shuttlePicker.errors.unsupported'));
      return;
    }

    Keyboard.dismiss();
    setSearchError(null);

    // Apply seed synchronously in local state intent: always register the
    // place before any await so the first paint can show name + CTA.
    if (seed && isValidGeoCoordinate({ latitude: seed.latitude, longitude: seed.longitude })) {
      const displayName = (seed.displayName ?? '').trim()
        || t('booking.shuttlePicker.poiFallbackName');
      const formattedAddress = (seed.formattedAddress ?? '').trim() || displayName;
      setPreviewByPlaceId((current) => ({
        ...current,
        [normalizedPlaceId]: {
          placeId: normalizedPlaceId,
          displayName,
          formattedAddress,
          latitude: seed.latitude,
          longitude: seed.longitude,
        },
      }));
      setSheetPlaceId(normalizedPlaceId);
      animateToCoordinate({
        latitude: seed.latitude,
        longitude: seed.longitude,
      }, 0.012);
    } else {
      const cached = previewByPlaceId[normalizedPlaceId];
      if (cached) {
        setSheetPlaceId(normalizedPlaceId);
        setIsSheetResolving(false);
        animateToCoordinate({
          latitude: cached.latitude,
          longitude: cached.longitude,
        }, 0.012);
        return;
      }
      setSheetPlaceId(normalizedPlaceId);
    }

    // Synthetic map-poi ids are not resolvable via Place Details.
    const canResolveDetails = placesAvailable
      && !normalizedPlaceId.startsWith('map-poi:');

    if (!canResolveDetails) {
      setIsSheetResolving(false);
      return;
    }

    setIsSheetResolving(true);
    try {
      const sessionId = await ensureSession();
      const place = await resolvePlaceDetails({
        sessionId,
        placeId: normalizedPlaceId,
        endSession: false,
      });
      setPreviewByPlaceId((current) => ({
        ...current,
        [normalizedPlaceId]: place,
      }));
      animateToCoordinate({
        latitude: place.latitude,
        longitude: place.longitude,
      }, 0.012);
    } catch (error) {
      // Keep the seed-based sheet open. Details failure is non-fatal for POI.
      if (!seed && !previewByPlaceId[normalizedPlaceId]) {
        const code = isPlacesRequestError(error) ? error.code : 'UNAVAILABLE';
        const displayCode = code === 'INVALID_SESSION' ? 'UNAVAILABLE' : code;
        setSearchError(t(placesErrorTranslationKey(displayCode)));
        setSheetPlaceId(null);
      }
      if (isPlacesRequestError(error) && error.code === 'INVALID_SESSION') {
        clearLocalSession();
      }
    } finally {
      setIsSheetResolving(false);
    }
  }, [
    animateToCoordinate,
    clearLocalSession,
    ensureSession,
    isResolving,
    placesAvailable,
    previewByPlaceId,
    t,
  ]);

  const handlePredictionPress = useCallback((prediction: PlacePrediction) => {
    openPreviewSheet(prediction.placeId).catch(() => undefined);
  }, [openPreviewSheet]);

  const handlePredictionMarkerPress = useCallback((placeId: string) => {
    openPreviewSheet(placeId).catch(() => undefined);
  }, [openPreviewSheet]);

  /**
   * Native Google Map POI (restaurant, shop, building…).
   * Name + lat/lng come from the map tile event — enough to open the sheet
   * and select without waiting on Place Details.
   */
  const handlePoiClick = useCallback((event: PoiClickEvent) => {
    const { placeId, name, coordinate } = event.nativeEvent;
    if (!isValidGeoCoordinate(coordinate)) {
      return;
    }

    const trimmedId = placeId?.trim() ?? '';
    // Some map POIs omit placeId; still allow selection via coordinates.
    const resolvedId = trimmedId.length > 0
      ? trimmedId
      : `map-poi:${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
    const label = name?.trim() || t('booking.shuttlePicker.poiFallbackName');

    openPreviewSheet(resolvedId, {
      displayName: label,
      formattedAddress: label,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    }).catch(() => undefined);
  }, [openPreviewSheet, t]);

  const applyResolvedPlace = useCallback((place: ResolvedPlace) => {
    const coordinate = {
      latitude: place.latitude,
      longitude: place.longitude,
    };
    setSelected({
      placeId: place.placeId,
      displayName: place.displayName,
      formattedAddress: place.formattedAddress.slice(0, SHUTTLE_ADDRESS_MAX_LENGTH),
      origin: coordinate,
      pin: coordinate,
    });
    setPinRefined(false);
    setQuery(place.displayName);
    setSearchInputActive(false);
    setPredictions([]);
    setPreviewByPlaceId({});
    setSheetPlaceId(null);
    setIsSheetResolving(false);
    setIsSearching(false);
    setSearchError(null);
    scheduleStopTrackingViewChanges();
    animateToCoordinate(coordinate);
  }, [animateToCoordinate, scheduleStopTrackingViewChanges]);

  const handleSelectSheetPlace = useCallback(async () => {
    if (!sheetPlaceId || isResolving) {
      return;
    }
    if (!placesAvailable) {
      setSearchError(t('booking.shuttlePicker.errors.unsupported'));
      return;
    }

    setIsResolving(true);
    setSearchError(null);

    const seed = previewByPlaceId[sheetPlaceId] ?? null;

    try {
      const place = await resolveMapPlaceSelection({
        placeId: sheetPlaceId,
        seed,
        session: placesSession,
      });

      await endPlacesSessionOwned();
      applyResolvedPlace(place);
    } catch (error) {
      const code = isPlacesRequestError(error) ? error.code : 'UNAVAILABLE';
      if (code === 'INVALID_SESSION') {
        clearLocalSession();
      }
      const base = t(placesErrorTranslationKey(code));
      const detail = isPlacesRequestError(error) ? error.message.trim() : '';
      const shouldShowDetail = Boolean(
        detail
        && detail.length > 0
        && detail !== base
        && (code === 'INVALID_PLACE' || code === 'CONFIGURATION' || code === 'UNAVAILABLE'),
      );
      setSearchError(shouldShowDetail ? `${base} (${detail})` : base);
    } finally {
      setIsResolving(false);
    }
  }, [
    applyResolvedPlace,
    clearLocalSession,
    endPlacesSessionOwned,
    isResolving,
    placesAvailable,
    placesSession,
    previewByPlaceId,
    sheetPlaceId,
    t,
  ]);

  const handleMarkerDragEnd = useCallback((coordinate: LatLng) => {
    setSelected((current) => {
      if (!current) {
        return current;
      }
      if (!isValidGeoCoordinate(coordinate)) {
        setSearchError(t('booking.shuttlePicker.errors.invalidCoordinates'));
        return current;
      }

      const distanceKm = getGeoDistanceKm(current.origin, coordinate);
      const distanceMeters = distanceKm === null ? null : distanceKm * 1000;
      if (distanceMeters === null || distanceMeters > MAX_REFINE_METERS) {
        setSearchError(t('booking.shuttlePicker.errors.refineTooFar'));
        scheduleStopTrackingViewChanges();
        // Snap back to the last valid pin.
        animateToCoordinate(current.pin, 0.008);
        return { ...current };
      }

      setSearchError(null);
      setPinRefined(true);
      scheduleStopTrackingViewChanges();
      // Keep displayName + formattedAddress — drag only refines coordinates.
      return {
        ...current,
        pin: {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        },
      };
    });
  }, [animateToCoordinate, scheduleStopTrackingViewChanges, t]);

  const serviceAddress = useMemo(() => {
    if (!selected) {
      return '';
    }
    // Persist POI title + street line so "S802 Origami, Long Bình…" is not
    // reduced to area-only formattedAddress.
    return composeShuttleServiceAddress(
      selected.displayName,
      selected.formattedAddress,
    );
  }, [selected]);

  const validation = useMemo(() => {
    if (!selected || !serviceAddress) {
      return null;
    }
    return validateShuttleService({
      address: serviceAddress,
      latitude: selected.pin.latitude,
      longitude: selected.pin.longitude,
    });
  }, [selected, serviceAddress]);

  // Existing drafts may be reconfirmed without another Places resolve.
  const confirmEnabled = Boolean(
    validation?.value
    && placesAvailable
    && !isResolving
    && selected,
  );

  const handleConfirm = useCallback(() => {
    if (!validation?.value || !selected) {
      setSearchError(t('booking.shuttlePicker.errors.verifyBeforeSave'));
      return;
    }

    const draft = {
      stationId,
      address: validation.value.address,
      latitude: validation.value.latitude,
      longitude: validation.value.longitude,
    };

    if (isDropoff) {
      setSelectedShuttleDropoff(draft);
    } else {
      setSelectedShuttlePickup(draft);
    }

    navigation.goBack();
  }, [
    isDropoff,
    navigation,
    selected,
    setSelectedShuttleDropoff,
    setSelectedShuttlePickup,
    stationId,
    t,
    validation,
  ]);

  const handleClearQuery = useCallback(() => {
    requestIdRef.current += 1;
    setSearchInputActive(false);
    setQuery('');
    setPredictions([]);
    setPreviewByPlaceId({});
    setSheetPlaceId(null);
    setIsSheetResolving(false);
    setIsSearching(false);
    setSearchError(null);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSearchInputActive(true);
    setSheetPlaceId(null);
  }, []);

  const handleBack = useCallback(() => {
    endPlacesSessionOwned().catch(() => undefined);
    navigation.goBack();
  }, [endPlacesSessionOwned, navigation]);

  const onMapReady = useCallback<NonNullable<MapViewProps['onMapReady']>>(() => {
    if (selected) {
      animateToCoordinate(selected.pin, 0.01);
      scheduleStopTrackingViewChanges();
      return;
    }
    animateToCoordinate(stationCoordinate, DEFAULT_DELTA);
  }, [animateToCoordinate, scheduleStopTrackingViewChanges, selected, stationCoordinate]);

  const showSuggestions = searchInputActive && (
    predictions.length > 0
    || isSearching
    || Boolean(searchError && normalizedDebouncedQuery.length >= MIN_QUERY_LENGTH)
  );

  const predictionMarkers = useMemo(
    () => predictions
      .map((item, index) => {
        const place = previewByPlaceId[item.placeId];
        if (!place) {
          return null;
        }
        return { place, index };
      })
      .filter((item): item is { place: ResolvedPlace; index: number } => item !== null),
    [predictions, previewByPlaceId],
  );

  const sheetPlace = sheetPlaceId ? previewByPlaceId[sheetPlaceId] ?? null : null;
  const sheetPrediction = useMemo(() => {
    if (!sheetPlaceId) {
      return null;
    }
    return predictions.find((item) => item.placeId === sheetPlaceId) ?? null;
  }, [predictions, sheetPlaceId]);

  const sheetDisplayName = sheetPlace?.displayName
    ?? sheetPrediction?.primaryText
    ?? '';
  const sheetAddress = sheetPlace
    ? composeShuttleServiceAddress(sheetPlace.displayName, sheetPlace.formattedAddress)
    : (sheetPrediction?.secondaryText || sheetPrediction?.fullText || '');

  const bottomOffset = Math.max(insets.bottom, spacing.md) + (keyboardHeight > 0 ? spacing.sm : 0);
  const mapPadding = useMemo(
    () => ({
      top: 0,
      left: 0,
      right: 0,
      // Keep Google's native logo/legal attribution above the bottom sheet.
      // The fallback also protects the first layout before onLayout fires.
      bottom: Math.max(confirmCardHeight + bottomOffset + spacing.sm, 220),
    }),
    [bottomOffset, confirmCardHeight],
  );
  const containerPadStyle = useMemo(
    () => ({
      paddingTop: insets.top + spacing.sm,
      paddingBottom: bottomOffset,
    }),
    [bottomOffset, insets.top],
  );

  const stationMarkerCoordinate = useMemo(
    () => stationCoordinate,
    [stationCoordinate],
  );
  const selectedPinCoordinate = selected?.pin;
  const sheetVisible = Boolean(sheetPlaceId);

  return (
    <View style={styles.root}>
      {mapsEnabled ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          mapPadding={mapPadding}
          customMapStyle={mapStyle}
          googleRenderer="LATEST"
          mapType="standard"
          userInterfaceStyle={theme.isDark ? 'dark' : 'light'}
          loadingEnabled
          loadingBackgroundColor={theme.colors.surfaceAlt}
          loadingIndicatorColor={mapPalette.shuttleStation}
          moveOnMarkerPress={false}
          pitchEnabled={false}
          rotateEnabled={false}
          showsBuildings
          showsCompass={false}
          showsIndoorLevelPicker={false}
          showsIndoors={false}
          showsMyLocationButton={false}
          showsPointsOfInterest
          showsTraffic={false}
          showsUserLocation={false}
          toolbarEnabled={false}
          poiClickEnabled
          onPoiClick={handlePoiClick}
          onMapReady={onMapReady}
          accessibilityLabel={t('booking.shuttlePicker.mapAccessibility')}
        >
          <Marker
            coordinate={stationMarkerCoordinate}
            title={stationName}
            description={t('booking.shuttlePicker.terminalMarker')}
            pinColor={mapPalette.shuttleStation}
            tracksViewChanges={false}
            identifier="shuttle-terminal"
          />
          {predictionMarkers.map(({ place, index }) => (
            <PredictionMapMarker
              key={place.placeId}
              place={place}
              index={index}
              highlighted={sheetPlaceId === place.placeId}
              onPress={handlePredictionMarkerPress}
            />
          ))}
          {selectedPinCoordinate && predictionMarkers.length === 0 ? (
            <Marker
              coordinate={selectedPinCoordinate}
              draggable
              title={selected?.displayName}
              description={t('booking.shuttlePicker.pinGuidance')}
              pinColor={theme.isDark ? '#FB923C' : '#F97316'}
              tracksViewChanges={pinTracksViewChanges}
              identifier="shuttle-selected"
              onDragStart={() => setPinTracksViewChanges(true)}
              onDragEnd={(event) => handleMarkerDragEnd(event.nativeEvent.coordinate)}
            />
          ) : null}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback]}>
          <Text style={styles.mapFallbackText}>
            {t('booking.shuttlePicker.errors.configuration')}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={[styles.overlayInner, containerPadStyle]} pointerEvents="box-none">
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                onPress={handleBack}
                style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
                hitSlop={8}
              >
                <ArrowLeft size={22} color={theme.colors.textPrimary} weight="bold" />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {t(isDropoff
                    ? 'booking.shuttlePicker.dropoffTitle'
                    : 'booking.shuttlePicker.pickupTitle')}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={2}>
                  {t(isDropoff
                    ? 'booking.shuttlePicker.dropoffSubtitle'
                    : 'booking.shuttlePicker.pickupSubtitle', {
                    station: stationName,
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.searchRow}>
              <MagnifyingGlass size={18} color={theme.colors.textTertiary} weight="bold" />
              <TextInput
                value={query}
                onChangeText={handleQueryChange}
                placeholder={t(isDropoff
                  ? 'booking.shuttlePicker.dropoffSearchPlaceholder'
                  : 'booking.shuttlePicker.searchPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="sentences"
                returnKeyType="search"
                editable={placesAvailable && !isResolving}
                accessibilityLabel={t(isDropoff
                  ? 'booking.shuttlePicker.dropoffSearchAccessibility'
                  : 'booking.shuttlePicker.searchAccessibility')}
                maxLength={SHUTTLE_ADDRESS_MAX_LENGTH}
              />
              {query.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('booking.shuttlePicker.clearSearch')}
                  onPress={handleClearQuery}
                  style={styles.clearButton}
                  hitSlop={8}
                >
                  <X size={16} color={theme.colors.textSecondary} weight="bold" />
                </Pressable>
              ) : null}
            </View>

            {bannerError ? (
              <Text style={styles.bannerError} accessibilityLiveRegion="polite">
                {bannerError}
              </Text>
            ) : null}
          </View>

          {showSuggestions ? (
            <View style={styles.suggestionsCard}>
              {isSearching ? (
                <View style={styles.suggestionsStatus}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.suggestionsStatusText}>
                    {t('booking.shuttlePicker.searching')}
                  </Text>
                </View>
              ) : null}

              {!isSearching && searchError ? (
                <Text style={styles.suggestionsError}>{searchError}</Text>
              ) : null}

              {!isSearching && predictions.length > 0 ? (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={styles.suggestionsList}
                >
                  {predictions.map((item) => (
                    <SuggestionRow
                      key={item.placeId}
                      item={item}
                      hasMapPin={Boolean(previewByPlaceId[item.placeId])}
                      isHighlighted={sheetPlaceId === item.placeId}
                      onPress={handlePredictionPress}
                    />
                  ))}
                </ScrollView>
              ) : null}

              {!isSearching && predictions.length > 0 && predictionMarkers.length > 0 ? (
                <Text style={styles.suggestionsHint}>
                  {t('booking.shuttlePicker.tapMarkerHint')}
                </Text>
              ) : null}

              <Text style={styles.attribution}>
                {t('booking.shuttlePicker.googleAttribution')}
              </Text>
            </View>
          ) : null}

          <View style={styles.flexSpacer} pointerEvents="none" />

          {!sheetVisible ? (
            <View
              style={styles.confirmCard}
              onLayout={(event) => {
                const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                setConfirmCardHeight((currentHeight) => (
                  currentHeight === nextHeight ? currentHeight : nextHeight
                ));
              }}
            >
              {selected ? (
                <>
                  <Text style={styles.confirmTitle} numberOfLines={2}>
                    {selected.displayName}
                  </Text>
                  <Text style={styles.confirmAddress} numberOfLines={4}>
                    {serviceAddress || selected.formattedAddress}
                  </Text>
                  {pinRefined ? (
                    <View style={styles.refinedBadge} accessibilityRole="text">
                      <Text style={styles.refinedBadgeText}>
                        {t('booking.shuttlePicker.pinRefinedBadge')}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.confirmHint}>
                    {pinRefined
                      ? t('booking.shuttlePicker.pinRefinedHint')
                      : t('booking.shuttlePicker.pinGuidance')}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.confirmHint}>
                    {t('booking.shuttlePicker.selectHint')}
                  </Text>
                  <Text style={styles.confirmHint}>
                    {t('booking.shuttlePicker.poiTapHint')}
                  </Text>
                </>
              )}

              {searchError && !showSuggestions ? (
                <Text style={styles.confirmError}>{searchError}</Text>
              ) : null}

              {isResolving ? (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.resolvingText}>
                    {t('booking.shuttlePicker.resolving')}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t(isDropoff
                  ? 'booking.shuttlePicker.confirmDropoff'
                  : 'booking.shuttlePicker.confirmPickup')}
                onPress={handleConfirm}
                disabled={!confirmEnabled}
                fullWidth
                style={styles.confirmButton}
              />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={sheetVisible}
        transparent
        animationType={reduceMotion ? 'none' : 'slide'}
        hardwareAccelerated
        statusBarTranslucent
        onRequestClose={closePreviewSheet}
      >
        <View style={styles.sheetModalRoot}>
          <Pressable
            accessible={false}
            style={styles.sheetBackdrop}
            onPress={closePreviewSheet}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.previewSheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetEyebrow}>
                  {t(isDropoff
                    ? 'booking.shuttlePicker.previewDropoffEyebrow'
                    : 'booking.shuttlePicker.previewPickupEyebrow')}
                </Text>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {sheetDisplayName || t('booking.shuttlePicker.resolving')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                onPress={closePreviewSheet}
                style={({ pressed }) => [styles.sheetCloseButton, pressed ? styles.pressed : null]}
                hitSlop={8}
              >
                <X size={18} color={theme.colors.textPrimary} weight="bold" />
              </Pressable>
            </View>

            {sheetPlace ? (
              <Text style={styles.sheetAddress} numberOfLines={4}>
                {sheetAddress || sheetPlace.displayName}
              </Text>
            ) : (
              <View style={styles.sheetLoadingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.sheetLoadingText}>
                  {t('booking.shuttlePicker.resolving')}
                </Text>
              </View>
            )}

            {isSheetResolving ? (
              <View style={styles.sheetLoadingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.sheetLoadingText}>
                  {t('booking.shuttlePicker.enrichingAddress')}
                </Text>
              </View>
            ) : null}

            {searchError && sheetVisible ? (
              <Text style={styles.confirmError}>{searchError}</Text>
            ) : null}

            <Text style={styles.sheetHint}>
              {t('booking.shuttlePicker.previewHint')}
            </Text>

            <Button
              title={isResolving
                ? t('booking.shuttlePicker.verifyingPlace')
                : t(isDropoff
                  ? 'booking.shuttlePicker.selectThisDropoff'
                  : 'booking.shuttlePicker.selectThisPickup')}
              onPress={() => {
                handleSelectSheetPlace().catch(() => undefined);
              }}
              // Sheet can open from map seed; confirm always re-fetches Places.
              disabled={!sheetPlace || isResolving}
              loading={isResolving}
              fullWidth
              style={styles.confirmButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    ...({ position: 'absolute' as const }),
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mapFallback: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing.xl,
    backgroundColor: theme.colors.surfaceAlt,
  },
  mapFallbackText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  overlay: {
    flex: 1,
  },
  overlayInner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headerCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    // Solid elevated surface over the map — glassSurfaceSoft is too transparent.
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    gap: spacing.sm,
    ...theme.effects.floatingShadow,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surfaceAlt,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: spacing.xs,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  searchRow: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.fieldBorder
      : theme.colors.divider,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bannerError: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.error,
  },
  suggestionsCard: {
    marginTop: spacing.sm,
    maxHeight: 280,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    ...theme.effects.floatingShadow,
  },
  suggestionsList: {
    maxHeight: 220,
  },
  suggestionRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  suggestionRowActive: {
    backgroundColor: theme.colors.primaryFaded,
  },
  suggestionCopy: {
    flex: 1,
    minWidth: 0,
  },
  suggestionPrimary: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  suggestionSecondary: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  suggestionsStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionsStatusText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  suggestionsError: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.error,
  },
  suggestionsHint: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  attribution: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
  },
  flexSpacer: {
    flex: 1,
  },
  confirmCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    gap: spacing.sm,
    ...theme.effects.floatingShadow,
  },
  confirmTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  confirmAddress: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  refinedBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  refinedBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  confirmHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  confirmError: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.error,
  },
  resolvingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  resolvingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    marginTop: spacing.xs,
  },
  predictionMarker: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 36,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    gap: 2,
  },
  predictionMarkerActive: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  predictionMarkerIndex: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  predictionMarkerIndexActive: {
    color: theme.colors.primary,
  },
  sheetModalRoot: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  sheetBackdrop: {
    ...({ position: 'absolute' as const }),
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Dim entire screen (map + header) so only the sheet stays readable.
    backgroundColor: theme.isDark
      ? 'rgba(1, 10, 10, 0.78)'
      : 'rgba(15, 23, 42, 0.58)',
  },
  previewSheet: {
    borderTopLeftRadius: borderRadius.xl + 8,
    borderTopRightRadius: borderRadius.xl + 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // Near-opaque sheet — glassSurfaceSoft blends into map behind.
    backgroundColor: theme.effects.isLiquid
      ? (theme.isDark ? 'rgba(13, 34, 33, 0.98)' : 'rgba(255, 255, 255, 0.98)')
      : theme.colors.surfaceElevated,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    gap: spacing.sm,
    ...theme.effects.floatingShadow,
  },
  sheetHandle: {
    alignSelf: 'center' as const,
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.divider,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sheetEyebrow: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  sheetTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.fieldBorder
      : theme.colors.divider,
  },
  sheetAddress: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  sheetHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  sheetLoadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    minHeight: 44,
  },
  sheetLoadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  pressed: {
    opacity: 0.82,
  },
});
