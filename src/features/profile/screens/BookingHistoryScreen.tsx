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
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  CreditCard,
  FunnelSimple,
  NavigationArrow,
  Package,
  Ticket,
  User,
  Van,
  WarningCircle,
  X,
} from 'phosphor-react-native';

import type {
  MainTabParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { VnPayLogo } from '@shared/components';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useBookingHistory } from '@features/booking/hooks/useBookingHistory';
import { upsertBookingHistoryTicketSnapshot } from '@features/booking/utils/bookingHistoryCache';
import { formatOperationalSeatNumber } from '@features/booking/utils/operationalSeat';
import {
  resolveTicketJourneyPoint,
  TICKET_JOURNEY_COLOR_TOKENS,
} from '@features/booking/utils/ticketJourneyPresentation';
import { getTicketStatusPresentation } from '@features/booking/utils/ticketPresentation';
import { parcelKeys } from '@features/parcel/api/parcelQueryKeys';
import {
  getParcelClaimStatusLabelKey,
  getParcelSizePresentation,
  getParcelStatusPresentation,
} from '@features/parcel/utils/parcelPresentation';
import { getParcelPaymentStage } from '@features/parcel/utils/parcelPayment';
import { StatusChip } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import {
  useIsAppActive,
  useTabBarScrollBehavior,
  useThemedStyles,
} from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDate, formatTime, formatVnd } from '@shared/utils/format';
import {
  getPendingVnPaySession,
  reopenPendingVnPayPayment,
} from '@shared/payments';
import { PaymentReturnGate } from '@shared/utils/paymentRedirect';
import { PASSENGER_HISTORY_DEFAULT_PAGE_SIZE } from '../api/passengerHistoryApi';
import { ShuttleHistorySummary } from '../components/ShuttleHistorySummary';
import {
  PARCEL_HISTORY_FILTER_LABEL_KEYS,
  PASSENGER_PARCEL_HISTORY_FILTERS,
  PASSENGER_TICKET_HISTORY_FILTERS,
  TICKET_HISTORY_FILTER_LABEL_KEYS,
  type ParcelHistoryFilter,
  type TicketHistoryFilter,
} from '../config/passengerHistoryFilters';
import { flattenPassengerHistoryPages } from '../utils/passengerHistoryMerge';
import {
  useParcelRoleHistory,
  type ParcelHistoryRole,
} from '../hooks/useParcelRoleHistory';
import type {
  PassengerParcelHistoryItem,
  PassengerTicketHistoryItem,
} from '../types';

type HistoryTab = 'ticket' | 'parcel';
type HistoryPaymentType = 'TICKET' | 'PARCEL';
type BookingHistoryRoute = RouteProp<MainTabParamList, 'BookingHistory'>;
type BookingHistoryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'BookingHistory'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ticketKeyExtractor = (item: PassengerTicketHistoryItem): string =>
  item.id;
const parcelKeyExtractor = (item: PassengerParcelHistoryItem): string =>
  item.id;
const getPaymentItemKey = (type: HistoryPaymentType, id: string): string =>
  `${type}:${id}`;

interface PendingPaymentReturn {
  itemKey: string;
  type: HistoryPaymentType;
  userId: string;
}

type ContinuePaymentHandler = (
  itemId: string,
  type: HistoryPaymentType,
  redirectUrl: string,
) => void;

const getRouteLabel = (
  originName: string | null,
  destinationName: string | null,
  unavailableLabel: string,
): string => {
  if (originName && destinationName)
    return `${originName} → ${destinationName}`;
  return originName ?? destinationName ?? unavailableLabel;
};

interface HistoryFilterChipProps<TFilter extends string> {
  label: string;
  selected: boolean;
  value: TFilter;
  compact?: boolean;
  onSelect: (value: TFilter) => void;
}

const HistoryFilterChip = memo(function HistoryFilterChipComponent<
  TFilter extends string,
>({
  label,
  selected,
  value,
  compact = false,
  onSelect,
}: HistoryFilterChipProps<TFilter>): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[
        styles.filterTab,
        compact ? styles.filterTabCompact : null,
        selected ? styles.activeFilterTab : null,
      ]}
    >
      <Text
        style={[styles.filterLabel, selected ? styles.activeFilterLabel : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}) as <TFilter extends string>(
  props: HistoryFilterChipProps<TFilter>,
) => React.JSX.Element;

interface HistoryFilterBarProps<TFilter extends string> {
  selected: TFilter;
  options: readonly { value: TFilter; labelKey: string }[];
  onSelect: (value: TFilter) => void;
}

const HistoryFilterBar = memo(function HistoryFilterBarComponent<
  TFilter extends string,
>({
  selected,
  options,
  onSelect,
}: HistoryFilterBarProps<TFilter>): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContent}
    >
      {options.map(option => (
        <HistoryFilterChip
          key={option.value}
          compact
          label={t(option.labelKey)}
          value={option.value}
          selected={selected === option.value}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}) as <TFilter extends string>(
  props: HistoryFilterBarProps<TFilter>,
) => React.JSX.Element;

const TICKET_FILTER_OPTIONS: readonly {
  value: TicketHistoryFilter;
  labelKey: string;
}[] = [
  { value: 'ALL', labelKey: TICKET_HISTORY_FILTER_LABEL_KEYS.ALL },
  ...PASSENGER_TICKET_HISTORY_FILTERS.map(value => ({
    value,
    labelKey: TICKET_HISTORY_FILTER_LABEL_KEYS[value],
  })),
];

const PARCEL_STATUS_FILTER_OPTIONS: readonly {
  value: ParcelHistoryFilter;
  labelKey: string;
}[] = [
  { value: 'ALL', labelKey: PARCEL_HISTORY_FILTER_LABEL_KEYS.ALL },
  ...PASSENGER_PARCEL_HISTORY_FILTERS.map(value => ({
    value,
    labelKey: PARCEL_HISTORY_FILTER_LABEL_KEYS[value],
  })),
];

const PARCEL_ROLE_OPTIONS: readonly {
  value: ParcelHistoryRole;
  labelKey: string;
}[] = [
  { value: 'SENT', labelKey: 'bookingHistory.parcelRoles.sent' },
  { value: 'RECEIVED', labelKey: 'bookingHistory.parcelRoles.received' },
];

type ParcelStatusFilterOption = (typeof PARCEL_STATUS_FILTER_OPTIONS)[number];

const parcelStatusOptionKeyExtractor = (
  option: ParcelStatusFilterOption,
): string => option.value;

interface ParcelRoleTabProps {
  label: string;
  selected: boolean;
  value: ParcelHistoryRole;
  onSelect: (value: ParcelHistoryRole) => void;
}

const ParcelRoleTab = memo(function ParcelRoleTabComponent({
  label,
  selected,
  value,
  onSelect,
}: ParcelRoleTabProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[
        styles.parcelRoleTab,
        selected ? styles.parcelRoleTabActive : null,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.parcelRoleTabLabel,
          selected ? styles.parcelRoleTabLabelActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

interface ParcelStatusOptionRowProps {
  label: string;
  selected: boolean;
  value: ParcelHistoryFilter;
  onSelect: (value: ParcelHistoryFilter) => void;
}

const ParcelStatusOptionRow = memo(function ParcelStatusOptionRowComponent({
  label,
  selected,
  value,
  onSelect,
}: ParcelStatusOptionRowProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={handlePress}
      style={[
        styles.parcelStatusOption,
        selected ? styles.parcelStatusOptionSelected : null,
      ]}
    >
      <Text
        style={[
          styles.parcelStatusOptionLabel,
          selected ? styles.parcelStatusOptionLabelSelected : null,
        ]}
      >
        {label}
      </Text>
      <View
        accessible={false}
        style={[
          styles.parcelStatusRadio,
          selected ? styles.parcelStatusRadioSelected : null,
        ]}
      >
        {selected ? <View style={styles.parcelStatusRadioDot} /> : null}
      </View>
    </Pressable>
  );
});

interface ParcelStatusFilterSheetProps {
  visible: boolean;
  selected: ParcelHistoryFilter;
  onClose: () => void;
  onSelect: (value: ParcelHistoryFilter) => void;
}

const ParcelStatusFilterSheet = memo(function ParcelStatusFilterSheetComponent({
  visible,
  selected,
  onClose,
  onSelect,
}: ParcelStatusFilterSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const handleSelect = useCallback(
    (value: ParcelHistoryFilter) => {
      onSelect(value);
      onClose();
    },
    [onClose, onSelect],
  );

  const renderStatusOption = useCallback(
    ({ item }: ListRenderItemInfo<ParcelStatusFilterOption>) => (
      <ParcelStatusOptionRow
        label={t(item.labelKey)}
        selected={selected === item.value}
        value={item.value}
        onSelect={handleSelect}
      />
    ),
    [handleSelect, selected, t],
  );

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.parcelStatusModalRoot}>
        <Pressable
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={styles.parcelStatusBackdrop}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.parcelStatusSheet,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.parcelStatusSheetHandle}
          />
          <View style={styles.parcelStatusSheetHeader}>
            <View style={styles.parcelStatusSheetTitleBlock}>
              <Text style={styles.parcelStatusSheetTitle}>
                {t('bookingHistory.parcelStatusFilter.title')}
              </Text>
              <Text style={styles.parcelStatusSheetSubtitle}>
                {t('bookingHistory.parcelStatusFilter.subtitle')}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t(
                'bookingHistory.parcelStatusFilter.closeAccessibility',
              )}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.parcelStatusCloseButton}
            >
              <X size={20} weight="bold" color={theme.colors.textPrimary} />
            </Pressable>
          </View>
          <FlashList
            contentContainerStyle={styles.parcelStatusListContent}
            data={PARCEL_STATUS_FILTER_OPTIONS}
            extraData={selected}
            keyExtractor={parcelStatusOptionKeyExtractor}
            renderItem={renderStatusOption}
            showsVerticalScrollIndicator={false}
            style={styles.parcelStatusList}
          />
        </View>
      </View>
    </Modal>
  );
});

interface ParcelHistoryToolbarProps {
  filterVisible: boolean;
  role: ParcelHistoryRole;
  status: ParcelHistoryFilter;
  onOpenStatusFilter: () => void;
  onSelectRole: (value: ParcelHistoryRole) => void;
}

const ParcelHistoryToolbar = memo(function ParcelHistoryToolbarComponent({
  filterVisible,
  role,
  status,
  onOpenStatusFilter,
  onSelectRole,
}: ParcelHistoryToolbarProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const selectedStatusOption =
    PARCEL_STATUS_FILTER_OPTIONS.find(option => option.value === status) ??
    PARCEL_STATUS_FILTER_OPTIONS[0];
  const selectedStatusLabel = t(selectedStatusOption.labelKey);
  const hasStatusFilter = status !== 'ALL';

  return (
    <View testID="parcel-history-toolbar" style={styles.parcelHistoryToolbar}>
      <View accessibilityRole="tablist" style={styles.parcelRoleSegment}>
        {PARCEL_ROLE_OPTIONS.map(option => (
          <ParcelRoleTab
            key={option.value}
            label={t(option.labelKey)}
            selected={role === option.value}
            value={option.value}
            onSelect={onSelectRole}
          />
        ))}
      </View>
      {role === 'SENT' ? (
        <Pressable
          accessibilityLabel={t(
            'bookingHistory.parcelStatusFilter.openAccessibility',
            { status: selectedStatusLabel },
          )}
          accessibilityRole="button"
          accessibilityState={{
            expanded: filterVisible,
            selected: hasStatusFilter,
          }}
          onPress={onOpenStatusFilter}
          style={[
            styles.parcelStatusTrigger,
            hasStatusFilter ? styles.parcelStatusTriggerActive : null,
          ]}
        >
          <FunnelSimple
            color={
              hasStatusFilter
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
            size={20}
            weight={hasStatusFilter ? 'fill' : 'regular'}
          />
        </Pressable>
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.parcelStatusTriggerPlaceholder}
        />
      )}
    </View>
  );
});

interface TicketHistoryRowProps {
  item: PassengerTicketHistoryItem;
  onOpen: (item: PassengerTicketHistoryItem) => void;
  onTrack: (
    tripId: string,
    bookingId: string,
    trackingTarget: PassengerTicketHistoryItem['trackingTarget'],
  ) => void;
  onContinuePayment: ContinuePaymentHandler;
  isOpeningPayment: boolean;
}

const TicketHistoryRow = memo(function TicketHistoryRowComponent({
  item,
  onOpen,
  onTrack,
  onContinuePayment,
  isOpeningPayment,
}: TicketHistoryRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const statusPresentation = getTicketStatusPresentation(item.status);
  const canTrack = statusPresentation.trackingEnabled;
  const paymentRedirectUrl = statusPresentation.pendingPayment
    ? item.paymentRedirectUrl
    : null;
  const seatNumbers = useMemo(
    () => item.ticket.tickets
      .map(ticket => formatOperationalSeatNumber(
        ticket.seatNumber,
        t('history.seatPendingAssignment'),
      ))
      .join(', ') || t('common.notAvailable'),
    [item.ticket.tickets, t],
  );
  const vehicleSummary = useMemo(() => {
    const vehicle = item.ticket.vehicle;
    if (!vehicle) return null;
    return [vehicle.vehicleType?.displayName, vehicle.licensePlate]
      .filter(Boolean)
      .join(' · ');
  }, [item.ticket.vehicle]);
  const routeTitleLabel = useMemo(() => getRouteLabel(
    item.originName,
    item.destinationName,
    t('history.routeUnavailable'),
  ), [item.destinationName, item.originName, t]);
  const pickupPoint = useMemo(() => resolveTicketJourneyPoint(
    item.ticket.pickupPoint?.displayName,
    item.originName,
    t('history.bookedPickupUnavailable'),
  ), [item.originName, item.ticket.pickupPoint?.displayName, t]);
  const dropoffPoint = useMemo(() => resolveTicketJourneyPoint(
    item.ticket.dropoffPoint?.displayName,
    item.destinationName,
    t('history.bookedDropoffUnavailable'),
  ), [item.destinationName, item.ticket.dropoffPoint?.displayName, t]);
  const routeMetadataLabel = item.ticket.routeName
    && item.ticket.routeName !== routeTitleLabel
    ? item.ticket.routeName
    : null;
  const handleOpen = useCallback(() => onOpen(item), [item, onOpen]);
  const handleTrack = useCallback(
    () => onTrack(item.tripId, item.id, item.trackingTarget),
    [item.id, item.trackingTarget, item.tripId, onTrack],
  );
  const handleContinuePayment = useCallback(() => {
    if (paymentRedirectUrl)
      onContinuePayment(item.id, item.type, paymentRedirectUrl);
  }, [item.id, item.type, onContinuePayment, paymentRedirectUrl]);
  const paymentAccessibilityState = useMemo(
    () => ({ busy: isOpeningPayment, disabled: isOpeningPayment }),
    [isOpeningPayment],
  );
  const bodyStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.ticketBody,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );
  const trackStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.trackButton,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );

  return (
    <View style={styles.ticketCard}>
      <Pressable
        style={bodyStyle}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={t('bookingHistory.bookingAccessibility', {
          code: item.code,
        })}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.refRow}>
            <Ticket size={18} color={theme.colors.primary} />
            <View
              testID="ticket-history-route-title"
              style={styles.routeTitleStack}
            >
              <Text
                testID="ticket-history-route-origin"
                style={styles.refText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.originName ?? routeTitleLabel}
              </Text>
              {item.originName && item.destinationName ? (
                <Text
                  testID="ticket-history-route-arrow"
                  style={styles.routeTitleArrow}
                  accessible={false}
                >
                  →
                </Text>
              ) : null}
              {item.originName && item.destinationName ? (
                <Text
                  testID="ticket-history-route-destination"
                  style={styles.refText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.destinationName}
                </Text>
              ) : null}
            </View>
          </View>
          <StatusChip
            label={t(statusPresentation.labelKey)}
            tone={statusPresentation.tone}
            style={styles.statusBadge}
          />
        </View>

        <Text selectable style={styles.referenceCode} numberOfLines={1}>
          {item.code}
        </Text>

        {routeMetadataLabel ? (
          <Text style={styles.routeNameLabel} numberOfLines={1}>
            {t('history.routeMetadata', { route: routeMetadataLabel })}
          </Text>
        ) : null}

        <View testID="ticket-history-route" style={styles.routeContainer}>
          <View style={styles.timelineDots}>
            <View testID="ticket-history-pickup-dot" style={styles.pickupDot} />
            <View style={styles.timelineLine} />
            <View testID="ticket-history-dropoff-dot" style={styles.dropoffDot} />
          </View>
          <View style={styles.routeTextContainer}>
            <Text
              testID="ticket-history-pickup"
              style={styles.stationText}
              numberOfLines={1}
            >
              {pickupPoint.name}
            </Text>
            <Text
              testID="ticket-history-dropoff"
              style={styles.stationText}
              numberOfLines={1}
            >
              {dropoffPoint.name}
            </Text>
          </View>
        </View>

        <ShuttleHistorySummary requests={item.ticket.shuttleRequests} />

        <View testID="ticket-history-details" style={styles.detailsRow}>
          {item.departureDateTime ? (
            <>
              <View style={styles.detailItem}>
                <CalendarBlank size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailValueText}>
                  {formatDate(item.departureDateTime)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text style={styles.detailValueText}>
                  {formatTime(item.departureDateTime)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.detailValueText}>
              {t('history.departureUnavailable')}
            </Text>
          )}
          <Text style={styles.seatSummary} numberOfLines={1}>
            {t('history.seats')}: {seatNumbers}
          </Text>
          {vehicleSummary ? (
            <View style={styles.vehicleDetailItem}>
              <Van
                size={16}
                color={theme.colors.textSecondary}
                weight="duotone"
              />
              <Text style={styles.detailValueText} numberOfLines={1}>
                {t('bookingHistory.vehicle')}: {vehicleSummary}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.ticketFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.priceLabel}>{t('booking.totalPrice')}</Text>
          <Text style={styles.priceValue}>
            {formatVnd(item.totalAmount, {
              display: 'code',
              clampNegative: true,
            })}
          </Text>
        </View>
        <View style={styles.footerActions}>
          <Text style={styles.ticketCountLabel}>
            {t('history.ticketCount', {
              count: item.ticket.tickets.length,
            })}
          </Text>
          {paymentRedirectUrl ? (
            <Pressable
              style={trackStyle}
              onPress={handleContinuePayment}
              disabled={isOpeningPayment}
              accessibilityRole="button"
              accessibilityState={paymentAccessibilityState}
              accessibilityLabel={t(
                'bookingHistory.continuePaymentAccessibility',
                {
                  code: item.code,
                },
              )}
            >
              {isOpeningPayment ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <VnPayLogo size="compact" />
              )}
              <Text style={styles.trackButtonText} numberOfLines={2}>
                {t('bookingHistory.continuePayment')}
              </Text>
            </Pressable>
          ) : null}
          {canTrack ? (
            <Pressable
              style={trackStyle}
              onPress={handleTrack}
              accessibilityRole="button"
              accessibilityLabel={t('bookingHistory.trackAccessibility', {
                code: item.code,
              })}
            >
              <NavigationArrow
                size={14}
                color={theme.colors.textInverse}
                weight="fill"
              />
              <Text style={styles.trackButtonText}>
                {t('bookingHistory.track')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

interface ParcelHistoryRowProps {
  item: PassengerParcelHistoryItem;
  onOpen: (
    parcelId: string,
    trackingTarget?: PassengerParcelHistoryItem['trackingTarget'],
  ) => void;
  onContinuePayment: ContinuePaymentHandler;
  isOpeningPayment: boolean;
}

const ParcelHistoryRow = memo(function ParcelHistoryRowComponent({
  item,
  onOpen,
  onContinuePayment,
  isOpeningPayment,
}: ParcelHistoryRowProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const statusPresentation = getParcelStatusPresentation(item.status);
  const sizePresentation = getParcelSizePresentation(item.parcel.sizeCategory);
  const paymentStage = getParcelPaymentStage(item.status);
  const showPaymentAction =
    item.parcel.role === 'SENT' && Boolean(paymentStage);
  const handleOpen = useCallback(
    () => onOpen(item.id, item.trackingTarget),
    [item.id, item.trackingTarget, onOpen],
  );
  const handleContinuePayment = useCallback(() => {
    if (item.paymentRedirectUrl) {
      onContinuePayment(item.id, item.type, item.paymentRedirectUrl);
      return;
    }
    onOpen(item.id, item.trackingTarget);
  }, [
    item.id,
    item.paymentRedirectUrl,
    item.trackingTarget,
    item.type,
    onContinuePayment,
    onOpen,
  ]);
  const paymentAccessibilityState = useMemo(
    () => ({ busy: isOpeningPayment, disabled: isOpeningPayment }),
    [isOpeningPayment],
  );
  const cardStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.parcelBody,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );
  const paymentStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.paymentButton,
      pressed ? styles.pressedCard : null,
    ],
    [styles],
  );

  return (
    <View style={styles.parcelCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bookingHistory.parcelAccessibility', {
          code: item.code,
        })}
        style={cardStyle}
        onPress={handleOpen}
      >
        <View style={styles.parcelInfo}>
          <View style={styles.parcelHeader}>
            <Text style={styles.parcelCode} numberOfLines={1}>
              {getRouteLabel(
                item.originName,
                item.destinationName,
                t('history.routeUnavailable'),
              )}
            </Text>
            <StatusChip
              label={t(statusPresentation.labelKey)}
              tone={statusPresentation.tone}
              style={styles.parcelBadge}
            />
          </View>
          <Text selectable style={styles.parcelReference} numberOfLines={1}>
            {item.code}
          </Text>
          <View style={styles.parcelMetaRow}>
            <User size={14} color={theme.colors.textTertiary} />
            <Text style={styles.parcelMeta} numberOfLines={1}>
              {item.parcel.role === 'SENT'
                ? t('history.toRecipient', { name: item.parcel.recipientName })
                : t('bookingHistory.receivedParcel')}
              {' · '}
              {t(sizePresentation.labelKey)}
            </Text>
          </View>
          {item.parcel.reliability?.activeIncident ? (
            <Text style={styles.parcelReliability} numberOfLines={1}>
              {t('bookingHistory.reliability.activeIncident')}
            </Text>
          ) : item.parcel.reliability?.claim ? (
            <Text style={styles.parcelReliability} numberOfLines={1}>
              {t('bookingHistory.reliability.claim', {
                status: t(getParcelClaimStatusLabelKey(
                  item.parcel.reliability.claim.status,
                )),
              })}
            </Text>
          ) : null}
          <View style={styles.parcelAmountRow}>
            <Text style={styles.parcelDate} numberOfLines={1}>
              {item.estimatedArrivalTime
                ? t('history.estimatedArrival', {
                    date: formatDate(item.estimatedArrivalTime),
                  })
                : t('history.createdOn', {
                    date: formatDate(item.createdAt),
                  })}
            </Text>
            {item.parcel.role === 'SENT' ? (
              <Text style={styles.parcelAmount}>
                {formatVnd(item.totalAmount, {
                  display: 'code',
                  clampNegative: true,
                })}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      {showPaymentAction ? (
        <View style={styles.parcelPaymentFooter}>
          <Pressable
            style={paymentStyle}
            onPress={handleContinuePayment}
            disabled={isOpeningPayment}
            accessibilityRole="button"
            accessibilityState={paymentAccessibilityState}
            accessibilityLabel={t(
              'bookingHistory.continuePaymentAccessibility',
              {
                code: item.code,
              },
            )}
          >
            {isOpeningPayment ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textInverse}
              />
            ) : (
              <CreditCard
                size={15}
                color={theme.colors.textInverse}
                weight="bold"
              />
            )}
            <Text style={styles.trackButtonText} numberOfLines={2}>
              {t('bookingHistory.continuePayment')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

interface HistoryEmptyStateProps {
  kind: HistoryTab;
  isAuthenticated: boolean;
  isPending: boolean;
  isFiltered: boolean;
  parcelRole?: ParcelHistoryRole;
  error: unknown;
  onRetry: () => void;
  onSignIn: () => void;
}

const HistoryEmptyState = memo(function HistoryEmptyStateComponent({
  kind,
  isAuthenticated,
  isPending,
  isFiltered,
  parcelRole,
  error,
  onRetry,
  onSignIn,
}: HistoryEmptyStateProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const Icon = kind === 'ticket' ? Ticket : Package;

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <Icon size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyTitle}>
          {t('bookingHistory.signInRequiredTitle')}
        </Text>
        <Text style={styles.emptyText}>
          {kind === 'ticket'
            ? t('bookingHistory.signInTicketsDescription')
            : t('bookingHistory.signInParcelsDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bookingHistory.signInAction')}
          onPress={onSignIn}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>
            {t('bookingHistory.signInAction')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.emptyText}>{t('bookingHistory.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer} accessibilityRole="summary">
        <WarningCircle size={48} color={theme.colors.error} weight="duotone" />
        <Text style={styles.emptyTitle}>
          {t('bookingHistory.unavailableTitle')}
        </Text>
        <Text style={styles.emptyText}>
          {t('bookingHistory.unavailableDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const isReceivedParcel = kind === 'parcel' && parcelRole === 'RECEIVED';
  const emptyTitle =
    kind === 'ticket'
      ? t(
          isFiltered
            ? 'bookingHistory.emptyTicketsFilteredTitle'
            : 'bookingHistory.emptyTicketsTitle',
        )
      : t(
          isReceivedParcel
            ? 'bookingHistory.emptyReceivedParcelsTitle'
            : 'bookingHistory.emptyParcelsTitle',
        );
  const emptyDescription =
    kind === 'ticket'
      ? t(
          isFiltered
            ? 'bookingHistory.emptyTicketsFilteredDescription'
            : 'bookingHistory.emptyTicketsDescription',
        )
      : t(
          isReceivedParcel
            ? 'bookingHistory.emptyReceivedParcelsDescription'
            : 'bookingHistory.emptyParcelsDescription',
        );

  return (
    <View style={styles.emptyContainer} accessibilityRole="summary">
      <Icon size={48} color={theme.colors.textTertiary} weight="thin" />
      <Text style={styles.emptyTitle}>{emptyTitle}</Text>
      <Text style={styles.emptyText}>{emptyDescription}</Text>
    </View>
  );
});

const PaginationFooter = memo(function PaginationFooterComponent({
  loading,
}: {
  loading: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.paginationFooter}>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
    </View>
  );
});

const HistoryStaleBanner = memo(function HistoryStaleBannerComponent({
  onRetry,
}: {
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.staleBanner} accessibilityRole="alert">
      <WarningCircle size={18} color={theme.colors.warningForeground} weight="fill" />
      <Text style={styles.staleBannerText}>
        {t('bookingHistory.staleDescription')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        onPress={onRetry}
        hitSlop={8}
      >
        <Text style={styles.staleRetryText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
});

export function BookingHistoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<BookingHistoryNavigation>();
  const route = useRoute<BookingHistoryRoute>();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const isAppActive = useIsAppActive();
  const paymentReturnGate = useMemo(() => new PaymentReturnGate(), []);
  const paymentOpenInFlightRef = useRef(false);
  const pendingPaymentReturnRef = useRef<PendingPaymentReturn | null>(null);
  const userId = useAuthStore(state => state.user?.id);
  const [openingPaymentItemKey, setOpeningPaymentItemKey] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>(
    route.params?.initialTab ?? 'ticket',
  );
  const [ticketFilter, setTicketFilter] = useState<TicketHistoryFilter>('ALL');
  const [parcelFilter, setParcelFilter] = useState<ParcelHistoryFilter>('ALL');
  const [parcelRole, setParcelRole] = useState<ParcelHistoryRole>('SENT');
  const [parcelStatusFilterVisible, setParcelStatusFilterVisible] =
    useState(false);
  const isTicketView = activeTab === 'ticket';
  const selectedTicketStatus =
    ticketFilter === 'ALL' ? undefined : ticketFilter;
  const ticketQuery = useBookingHistory(
    {
      ...(selectedTicketStatus ? { status: selectedTicketStatus } : {}),
      pageSize: PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
    },
    isTicketView,
  );
  const parcelQuery = useParcelRoleHistory(
    parcelRole,
    parcelFilter,
    PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
    activeTab === 'parcel',
  );
  const {
    data: ticketData,
    error: ticketError,
    fetchNextPage: fetchNextTicketPage,
    hasNextPage: hasNextTicketPage,
    isError: isTicketError,
    isFetchingNextPage: isFetchingNextTicketPage,
    isPending: isTicketPending,
    isRefetchError: isTicketRefetchError,
    isRefetching: isTicketRefetching,
    refetch: refetchTickets,
  } = ticketQuery;
  const {
    data: parcelData,
    error: parcelError,
    fetchNextPage: fetchNextParcelPage,
    hasNextPage: hasNextParcelPage,
    isError: isParcelError,
    isFetchingNextPage: isFetchingNextParcelPage,
    isPending: isParcelPending,
    isRefetchError: isParcelRefetchError,
    isRefetching: isParcelRefetching,
    refetch: refetchParcels,
  } = parcelQuery;

  useEffect(() => {
    const pendingPaymentReturn = pendingPaymentReturnRef.current;
    if (!pendingPaymentReturn) return;

    if (!paymentReturnGate.consume(isAppActive ? 'active' : 'background'))
      return;

    pendingPaymentReturnRef.current = null;
    setOpeningPaymentItemKey(null);

    if (pendingPaymentReturn.userId !== userId) return;

    const refreshActiveHistory =
      pendingPaymentReturn.type === 'TICKET' ? refetchTickets : refetchParcels;
    refreshActiveHistory().catch(() => undefined);
  }, [isAppActive, paymentReturnGate, refetchParcels, refetchTickets, userId]);

  useEffect(() => {
    paymentReturnGate.cancel();
    pendingPaymentReturnRef.current = null;
    setOpeningPaymentItemKey(null);
  }, [paymentReturnGate, userId]);

  useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (!initialTab) return;

    setActiveTab(initialTab);
    if (initialTab === 'parcel') setParcelRole('SENT');
    setParcelStatusFilterVisible(false);
  }, [route.params?.initialTab]);

  const ticketItems = useMemo(
    () =>
      flattenPassengerHistoryPages(ticketData?.pages).filter(
        (item): item is PassengerTicketHistoryItem => item.type === 'TICKET',
      ),
    [ticketData?.pages],
  );
  const parcelItems = useMemo(
    () =>
      flattenPassengerHistoryPages(parcelData?.pages).filter(
        (item): item is PassengerParcelHistoryItem => item.type === 'PARCEL',
      ),
    [parcelData?.pages],
  );

  const showTickets = useCallback(() => {
    setActiveTab('ticket');
    setParcelStatusFilterVisible(false);
  }, []);
  const showParcels = useCallback(() => {
    setActiveTab('parcel');
    setParcelStatusFilterVisible(false);
  }, []);
  const handleParcelRoleSelect = useCallback((role: ParcelHistoryRole) => {
    setParcelRole(role);
    setParcelStatusFilterVisible(false);
  }, []);
  const openParcelStatusFilter = useCallback(
    () => setParcelStatusFilterVisible(true),
    [],
  );
  const closeParcelStatusFilter = useCallback(
    () => setParcelStatusFilterVisible(false),
    [],
  );
  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleSignIn = useCallback(() => {
    navigation.navigate('Auth', { screen: 'Login' });
  }, [navigation]);

  const handleTicketOpen = useCallback(
    (item: PassengerTicketHistoryItem) => {
      // Signed redirect URLs stay in the authenticated query cache and are not
      // serialized into navigation state.
      const historyItem = item.paymentRedirectUrl
        ? { ...item, paymentRedirectUrl: null }
        : item;
      if (userId) {
        upsertBookingHistoryTicketSnapshot(
          queryClient,
          userId,
          historyItem,
        );
      }
      navigation.navigate('Booking', {
        screen: 'DigitalTicket',
        params: {
          source: 'history',
          bookingId: item.id,
          historyItem,
        },
      });
    },
    [navigation, queryClient, userId],
  );

  const handleTrack = useCallback(
    (
      tripId: string,
      bookingId: string,
      trackingTarget: PassengerTicketHistoryItem['trackingTarget'],
    ) => {
      navigation.navigate('Tracking', {
        source: 'trip',
        tripId,
        bookingId,
        ...(trackingTarget ? { trackingTarget } : {}),
      });
    },
    [navigation],
  );

  const handleParcelOpen = useCallback(
    (
      parcelId: string,
      trackingTarget?: PassengerParcelHistoryItem['trackingTarget'],
    ) => {
      if (userId) {
        queryClient.removeQueries({
          queryKey: parcelKeys.detail(userId, parcelId),
          exact: true,
        });
      }
      navigation.navigate('Parcel', {
        screen: 'ParcelDetail',
        params: {
          parcelId,
          fromHistory: true,
          ...(trackingTarget ? { trackingTarget } : {}),
        },
      });
    },
    [navigation, queryClient, userId],
  );

  const handleContinuePayment = useCallback<ContinuePaymentHandler>(
    (itemId, type, _redirectUrl) => {
      if (
        !userId ||
        paymentOpenInFlightRef.current ||
        pendingPaymentReturnRef.current
      ) {
        return;
      }

      const itemKey = getPaymentItemKey(type, itemId);
      pendingPaymentReturnRef.current = { itemKey, type, userId };
      paymentReturnGate.arm(isAppActive ? 'active' : 'background');
      setOpeningPaymentItemKey(itemKey);
      paymentOpenInFlightRef.current = true;

      (async () => {
        try {
          const pending = await getPendingVnPaySession();
          if (
            !pending?.paymentRedirectUrl ||
            pending?.ownerUserId !== userId ||
            !pending.vnpaySdk ||
            (pending.businessId && pending.businessId !== itemId)
          ) {
            throw new Error('PENDING_VNPAY_SESSION_UNAVAILABLE');
          }

          await reopenPendingVnPayPayment(pending, userId);
        } catch {
          const pendingPaymentReturn = pendingPaymentReturnRef.current;
          if (pendingPaymentReturn?.itemKey === itemKey) {
            pendingPaymentReturnRef.current = null;
            paymentReturnGate.cancel();
            setOpeningPaymentItemKey(null);
          }

          if (type === 'PARCEL') {
            Alert.alert(
              t('parcel.payment.redirectErrorTitle'),
              t('parcel.payment.redirectErrorDescription'),
            );
          } else {
            Alert.alert(
              t('booking.paymentRedirect.errorTitle'),
              t('booking.paymentRedirect.errorDescription'),
            );
          }
        } finally {
          paymentOpenInFlightRef.current = false;
        }
      })().catch(() => undefined);
    },
    [isAppActive, paymentReturnGate, t, userId],
  );

  const renderTicket = useCallback(
    ({ item }: ListRenderItemInfo<PassengerTicketHistoryItem>) => (
      <TicketHistoryRow
        item={item}
        onOpen={handleTicketOpen}
        onTrack={handleTrack}
        onContinuePayment={handleContinuePayment}
        isOpeningPayment={
          openingPaymentItemKey === getPaymentItemKey(item.type, item.id)
        }
      />
    ),
    [
      handleContinuePayment,
      handleTicketOpen,
      handleTrack,
      openingPaymentItemKey,
    ],
  );
  const renderParcel = useCallback(
    ({ item }: ListRenderItemInfo<PassengerParcelHistoryItem>) => (
      <ParcelHistoryRow
        item={item}
        onOpen={handleParcelOpen}
        onContinuePayment={handleContinuePayment}
        isOpeningPayment={
          openingPaymentItemKey === getPaymentItemKey(item.type, item.id)
        }
      />
    ),
    [handleContinuePayment, handleParcelOpen, openingPaymentItemKey],
  );

  const refreshTickets = useCallback(() => {
    refetchTickets().catch(() => undefined);
  }, [refetchTickets]);
  const refreshParcels = useCallback(() => {
    refetchParcels().catch(() => undefined);
  }, [refetchParcels]);
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'ticket' && ticketQuery.isFetched) {
        refreshTickets();
        return;
      }
      if (activeTab === 'parcel' && parcelQuery.isFetched) {
        refreshParcels();
      }
    }, [
      activeTab,
      parcelQuery.isFetched,
      refreshParcels,
      refreshTickets,
      ticketQuery.isFetched,
    ]),
  );
  const loadMoreTickets = useCallback(() => {
    if (hasNextTicketPage && !isFetchingNextTicketPage) {
      fetchNextTicketPage().catch(() => undefined);
    }
  }, [fetchNextTicketPage, hasNextTicketPage, isFetchingNextTicketPage]);
  const loadMoreParcels = useCallback(() => {
    if (hasNextParcelPage && !isFetchingNextParcelPage) {
      fetchNextParcelPage().catch(() => undefined);
    }
  }, [fetchNextParcelPage, hasNextParcelPage, isFetchingNextParcelPage]);

  const ticketEmpty = useMemo(
    () => (
      <HistoryEmptyState
        kind="ticket"
        isAuthenticated={Boolean(userId)}
        isPending={isTicketPending}
        isFiltered={ticketFilter !== 'ALL'}
        error={isTicketError ? ticketError : null}
        onRetry={refreshTickets}
        onSignIn={handleSignIn}
      />
    ),
    [
      handleSignIn,
      isTicketError,
      isTicketPending,
      refreshTickets,
      ticketError,
      ticketFilter,
      userId,
    ],
  );
  const parcelEmpty = useMemo(
    () => (
      <HistoryEmptyState
        kind="parcel"
        isAuthenticated={Boolean(userId)}
        isPending={isParcelPending}
        isFiltered={parcelRole === 'SENT' && parcelFilter !== 'ALL'}
        parcelRole={parcelRole}
        error={isParcelError ? parcelError : null}
        onRetry={refreshParcels}
        onSignIn={handleSignIn}
      />
    ),
    [
      handleSignIn,
      isParcelError,
      isParcelPending,
      parcelError,
      parcelFilter,
      parcelRole,
      refreshParcels,
      userId,
    ],
  );
  const ticketFooter = useMemo(
    () => <PaginationFooter loading={isFetchingNextTicketPage} />,
    [isFetchingNextTicketPage],
  );
  const parcelFooter = useMemo(
    () => <PaginationFooter loading={isFetchingNextParcelPage} />,
    [isFetchingNextParcelPage],
  );
  const ticketHeader = useMemo(
    () =>
      isTicketRefetchError && ticketItems.length > 0 ? (
        <HistoryStaleBanner onRetry={refreshTickets} />
      ) : null,
    [isTicketRefetchError, refreshTickets, ticketItems.length],
  );
  const parcelHeader = useMemo(
    () =>
      isParcelRefetchError && parcelItems.length > 0 ? (
        <HistoryStaleBanner onRetry={refreshParcels} />
      ) : null,
    [isParcelRefetchError, parcelItems.length, refreshParcels],
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.headerGroup}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('profile.history')}</Text>
          <View style={styles.topBarRightPlaceholder} />
        </View>

        <View style={styles.mainTabs} accessibilityRole="tablist">
          <Pressable
            style={[styles.mainTab, isTicketView ? styles.activeMainTab : null]}
            onPress={showTickets}
            accessibilityRole="tab"
            accessibilityLabel={t('bookingHistory.ticketsTab')}
            accessibilityState={{ selected: isTicketView }}
          >
            <Ticket
              size={18}
              color={
                isTicketView
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary
              }
            />
            <Text
              numberOfLines={1}
              style={[
                styles.mainTabText,
                isTicketView ? styles.activeMainTabText : null,
              ]}
            >
              {t('bookingHistory.ticketsTab')}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.mainTab,
              activeTab === 'parcel' ? styles.activeMainTab : null,
            ]}
            onPress={showParcels}
            accessibilityRole="tab"
            accessibilityLabel={t('bookingHistory.parcelsTab')}
            accessibilityState={{ selected: activeTab === 'parcel' }}
          >
            <Package
              size={18}
              color={
                activeTab === 'parcel'
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary
              }
            />
            <Text
              numberOfLines={1}
              style={[
                styles.mainTabText,
                activeTab === 'parcel' ? styles.activeMainTabText : null,
              ]}
            >
              {t('bookingHistory.parcelsTab')}
            </Text>
          </Pressable>
        </View>

        {isTicketView ? (
          <HistoryFilterBar
            selected={ticketFilter}
            options={TICKET_FILTER_OPTIONS}
            onSelect={setTicketFilter}
          />
        ) : (
          <ParcelHistoryToolbar
            filterVisible={parcelStatusFilterVisible}
            role={parcelRole}
            status={parcelFilter}
            onOpenStatusFilter={openParcelStatusFilter}
            onSelectRole={handleParcelRoleSelect}
          />
        )}
      </View>

      {activeTab === 'ticket' ? (
        <FlashList
          data={ticketItems}
          extraData={openingPaymentItemKey}
          renderItem={renderTicket}
          keyExtractor={ticketKeyExtractor}
          ListEmptyComponent={ticketEmpty}
          ListFooterComponent={ticketFooter}
          ListHeaderComponent={ticketHeader}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreTickets}
          onEndReachedThreshold={0.35}
          onRefresh={refreshTickets}
          refreshing={isTicketRefetching && !isFetchingNextTicketPage}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
        />
      ) : (
        <FlashList
          key={`parcel:${parcelRole}:${parcelFilter}`}
          data={parcelItems}
          extraData={openingPaymentItemKey}
          renderItem={renderParcel}
          keyExtractor={parcelKeyExtractor}
          ListEmptyComponent={parcelEmpty}
          ListFooterComponent={parcelFooter}
          ListHeaderComponent={parcelHeader}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreParcels}
          onEndReachedThreshold={0.35}
          onRefresh={refreshParcels}
          refreshing={isParcelRefetching && !isFetchingNextParcelPage}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
        />
      )}

      <ParcelStatusFilterSheet
        visible={
          activeTab === 'parcel' &&
          parcelRole === 'SENT' &&
          parcelStatusFilterVisible
        }
        selected={parcelFilter}
        onClose={closeParcelStatusFilter}
        onSelect={setParcelFilter}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGroup: {
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  topBar: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.transparent,
  },
  backButton: {
    ...theme.components.headerButton,
    width: 44,
    height: 44,
    minHeight: 44,
    borderRadius: BR.full,
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: { width: 44, height: 44 },
  mainTabs: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: theme.colors.transparent,
  },
  mainTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  activeMainTab: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mainTabText: {
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  activeMainTabText: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
  },
  filterContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xs,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
  },
  filterTabCompact: {
    flex: 0,
    paddingHorizontal: spacing.md,
  },
  activeFilterTab: { backgroundColor: theme.colors.primaryFaded },
  filterLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  activeFilterLabel: { color: theme.colors.primary },

  parcelHistoryToolbar: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  parcelRoleSegment: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    padding: spacing.xxs,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  parcelRoleTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
  },
  parcelRoleTabActive: {
    backgroundColor: theme.colors.primaryFaded,
  },
  parcelRoleTabLabel: {
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.35,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  parcelRoleTabLabelActive: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.semiBold,
  },
  parcelStatusTrigger: {
    ...theme.components.headerButton,
    width: 44,
    minWidth: 44,
    height: 44,
    minHeight: 44,
    flexShrink: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
  },
  parcelStatusTriggerActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  parcelStatusTriggerPlaceholder: {
    width: 44,
    minWidth: 44,
    height: 44,
    flexShrink: 0,
  },

  parcelStatusModalRoot: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  parcelStatusBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.effects.scrim,
  },
  parcelStatusSheet: {
    height: '78%' as const,
    maxHeight: 620,
    overflow: 'hidden' as const,
    paddingTop: spacing.sm,
    borderTopLeftRadius: BR.xl,
    borderTopRightRadius: BR.xl,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
    ...theme.effects.floatingShadow,
  },
  parcelStatusSheetHandle: {
    width: 36,
    height: 4,
    alignSelf: 'center' as const,
    marginBottom: spacing.md,
    borderRadius: BR.full,
    backgroundColor: theme.colors.divider,
  },
  parcelStatusSheetHeader: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  parcelStatusSheetTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  parcelStatusSheetTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  parcelStatusSheetSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    color: theme.colors.textSecondary,
  },
  parcelStatusCloseButton: {
    width: 44,
    height: 44,
    minHeight: 44,
    flexShrink: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  parcelStatusList: {
    flex: 1,
  },
  parcelStatusListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  parcelStatusOption: {
    minWidth: 0,
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
  },
  parcelStatusOptionSelected: {
    backgroundColor: theme.colors.primaryFaded,
  },
  parcelStatusOptionLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    color: theme.colors.textPrimary,
  },
  parcelStatusOptionLabelSelected: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.semiBold,
  },
  parcelStatusRadio: {
    width: 22,
    height: 22,
    flexShrink: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
  },
  parcelStatusRadioSelected: {
    borderColor: theme.colors.primary,
  },
  parcelStatusRadioDot: {
    width: 10,
    height: 10,
    borderRadius: BR.full,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 96,
  },
  emptyContainer: {
    minHeight: 320,
    paddingVertical: 64,
    paddingHorizontal: spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  retryButton: {
    minHeight: 44,
    marginTop: spacing.lg,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    borderRadius: BR.full,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  paginationFooter: {
    minHeight: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  staleBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  staleBannerText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.warningForeground,
  },
  staleRetryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.warningForeground,
  },
  ticketCard: {
    ...theme.components.card,
    marginBottom: spacing.xl,
    overflow: 'hidden' as const,
    borderRadius: BR.xl,
    borderCurve: 'continuous' as const,
  },
  ticketBody: { padding: spacing.lg },
  pressedCard: { opacity: 0.82 },
  ticketHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  refRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  refText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  routeTitleStack: {
    flex: 1,
    minWidth: 0,
    gap: 0,
  },
  routeTitleArrow: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    lineHeight: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  statusBadge: {
    maxWidth: '48%' as const,
  },
  activeStatusBadge: { backgroundColor: theme.colors.infoLight },
  completedBadge: { backgroundColor: theme.colors.successLight },
  statusText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  activeStatusText: { color: theme.colors.info },
  completedStatusText: { color: theme.colors.success },
  routeNameLabel: {
    marginBottom: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  referenceCode: {
    marginBottom: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  routeContainer: {
    flexDirection: 'row' as const,
    marginBottom: spacing.md,
  },
  timelineDots: {
    width: 24,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.pickup],
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
    backgroundColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.connector],
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.dropoffHalo],
    backgroundColor: theme.colors[TICKET_JOURNEY_COLOR_TOKENS.dropoff],
  },
  routeTextContainer: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    justifyContent: 'space-between' as const,
    marginLeft: spacing.sm,
  },
  stationText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  detailsRow: {
    minHeight: 44,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  vehicleDetailItem: {
    flexBasis: '100%' as const,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  detailValueText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  seatSummary: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  ticketFooter: {
    minHeight: 70,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  footerLeft: { flex: 1 },
  footerActions: {
    minWidth: 120,
    flexShrink: 1,
    alignItems: 'flex-end' as const,
    gap: spacing.sm,
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  priceValue: {
    marginTop: 2,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  ticketCountLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  trackButton: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  parcelCard: {
    ...theme.components.card,
    marginBottom: spacing.md,
    borderRadius: BR.xl,
    borderCurve: 'continuous' as const,
    overflow: 'hidden' as const,
  },
  parcelBody: {
    minHeight: 128,
    padding: spacing.md,
  },
  parcelInfo: { minWidth: 0 },
  parcelHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  parcelCode: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  parcelBadge: {
    maxWidth: '52%' as const,
  },
  parcelBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  parcelReference: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  parcelMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  parcelMeta: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  parcelReliability: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.warningForeground,
  },
  parcelAmountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  parcelDate: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  parcelAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  parcelPaymentFooter: {
    alignItems: 'flex-end' as const,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  paymentButton: {
    minHeight: 44,
    maxWidth: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
});
