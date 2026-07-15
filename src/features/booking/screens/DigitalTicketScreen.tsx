import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type CompositeNavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle,
  Coins,
  File,
  Flask,
  MapPin,
  Ticket,
  Wallet,
  WarningCircle,
} from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';

import type { BookingStackParamList, RootStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import { useBookingHistoryTicket } from '../hooks/useBookingHistory';
import { useBookingStore } from '../store/useBookingStore';
import {
  buildCheckoutTicketViewModel,
  buildHistoryTicketViewModel,
  type TicketLegViewModel,
  type TicketViewModel,
} from '../utils/ticketViewModel';

type DigitalTicketRoute = RouteProp<BookingStackParamList, 'DigitalTicket'>;
type DigitalTicketNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<BookingStackParamList, 'DigitalTicket'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface TicketViewProps {
  model: TicketViewModel;
  source: 'checkout' | 'history';
  onBack: () => void;
  onViewBookings: () => void;
  onHome: () => void;
  onTrack: (leg: TicketLegViewModel) => void;
}

function TicketView({
  model,
  source,
  onBack,
  onViewBookings,
  onHome,
  onTrack,
}: TicketViewProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const paymentIcon = model.paymentMethod === 'WALLET'
    ? <Wallet size={12} color={theme.colors.primary} weight="bold" />
    : <Coins size={12} color={theme.colors.primary} weight="bold" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={source === 'history' ? 'Go back' : 'Back to dashboard'}
          style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
          onPress={onBack}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>{model.title}</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {model.isDemo ? (
          <View style={styles.demoBanner}>
            <Flask size={16} color={theme.colors.warning} />
            <Text style={styles.demoBannerText}>Demo ticket detail</Text>
          </View>
        ) : null}

        <View style={styles.successHeader}>
          <CheckCircle
            size={56}
            color={model.isPendingPayment ? theme.colors.primary : theme.colors.success}
            weight="fill"
          />
          <Text style={styles.successTitle}>{model.statusTitle}</Text>
          <Text style={styles.successSubtitle}>{model.statusMessage}</Text>
        </View>

        {model.legs.map((leg) => {
          const canTrack = Boolean(leg.tripId) && leg.trackingEnabled;
          return (
            <View key={`${leg.label}:${leg.bookingId ?? leg.reference}`} style={styles.legBlock}>
              <View style={styles.ticketCard}>
                <View style={styles.referenceSection}>
                  <View style={styles.referenceIconContainer}>
                    <Ticket size={64} color={theme.colors.primary} weight="duotone" />
                  </View>
                  <Text style={styles.referenceCaption}>
                    {model.legs.length > 1 ? `${leg.label} ticket reference` : 'Ticket reference'}
                  </Text>
                  <Text style={styles.ticketIdText}>{leg.reference}</Text>
                </View>

                <View style={styles.dashedDivider}>
                  <View style={styles.sideCutoutLeft} />
                  <View style={styles.sideCutoutRight} />
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.routeRow}>
                    <View style={styles.routeItem}>
                      <Text style={styles.routeLabel}>BOARDING ({leg.boardingTime})</Text>
                      <Text style={styles.routeName}>{leg.boardingName}</Text>
                      <Text style={styles.routeCity}>{leg.boardingAddress}</Text>
                    </View>
                    <View style={styles.routeItem}>
                      <Text style={[styles.routeLabel, styles.alignRight]}>
                        ALIGHTING ({leg.alightingTime})
                      </Text>
                      <Text style={[styles.routeName, styles.alignRight]}>{leg.alightingName}</Text>
                      <Text style={[styles.routeCity, styles.alignRight]}>{leg.alightingAddress}</Text>
                    </View>
                  </View>

                  <View style={styles.specsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>BUS TYPE</Text>
                      <Text style={styles.specValue}>{leg.busType}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>SEATS</Text>
                      <Text style={styles.specValue}>{leg.seatNumbers}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>TICKETS</Text>
                      <Text style={styles.specValue}>{leg.ticketCount}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.specLabel}>PAYMENT METHOD</Text>
                      <View style={styles.paymentMethodLabel}>
                        {paymentIcon}
                        <Text style={styles.specValue}>
                          {model.paymentMethod === 'WALLET' ? 'VietRide Wallet' : 'VNPAY'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      {model.legs.length > 1
                        ? `${leg.label} amount`
                        : model.isPendingPayment ? 'Amount Due' : 'Total Amount'}
                    </Text>
                    <Text style={styles.totalValue}>
                      {formatVnd(leg.totalAmount, { display: 'code', clampNegative: true })}
                    </Text>
                  </View>
                </View>
              </View>

              {canTrack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Track ${leg.label.toLowerCase()} trip`}
                  style={({ pressed }) => [styles.secondaryAction, pressed ? styles.pressed : null]}
                  onPress={() => onTrack(leg)}
                >
                  <MapPin size={18} color={theme.colors.primary} weight="bold" />
                  <Text style={styles.secondaryActionText}>Track {leg.label.toLowerCase()} trip</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {model.legs.length > 1 ? (
          <View style={styles.roundTripTotalCard}>
            <Text style={styles.totalLabel}>
              {model.isPendingPayment ? 'Grand total due' : 'Round-trip total'}
            </Text>
            <Text style={styles.totalValue}>
              {formatVnd(model.totalAmount, { display: 'code', clampNegative: true })}
            </Text>
          </View>
        ) : null}

        {source === 'checkout' ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryAction, pressed ? styles.pressed : null]}
            onPress={onViewBookings}
          >
            <File size={18} color={theme.colors.textInverse} weight="bold" />
            <Text style={styles.primaryActionText}>View My Bookings</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.homeButton, pressed ? styles.pressed : null]}
          onPress={source === 'history' ? onBack : onHome}
        >
          <Text style={styles.homeButtonText}>
            {source === 'history' ? 'Go Back' : 'Back to Dashboard'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

interface UnavailableTicketProps {
  title: string;
  message: string;
  isLoading?: boolean;
  onBack: () => void;
}

function UnavailableTicket({
  title,
  message,
  isLoading = false,
  onBack,
}: UnavailableTicketProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.navButton, pressed ? styles.pressed : null]}
          onPress={onBack}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>Ticket Detail</Text>
        <View style={styles.navSpacer} />
      </View>
      <View style={styles.unavailableContainer}>
        {isLoading
          ? <ActivityIndicator color={theme.colors.primary} />
          : <WarningCircle size={52} color={theme.colors.textTertiary} weight="duotone" />}
        <Text style={styles.unavailableTitle}>{title}</Text>
        <Text style={styles.unavailableMessage}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.homeButton, styles.unavailableButton, pressed ? styles.pressed : null]}
          onPress={onBack}
        >
          <Text style={styles.homeButtonText}>Go Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CheckoutTicketContent(): React.JSX.Element {
  const navigation = useNavigation<DigitalTicketNavigation>();
  const {
    selectedTrip,
    paymentMethod,
    selectedPickUp,
    selectedDropOff,
    outboundState,
    returnState,
    bookingResult,
  } = useBookingStore(useShallow((state) => ({
    selectedTrip: state.selectedTrip,
    paymentMethod: state.paymentMethod,
    selectedPickUp: state.selectedPickUp,
    selectedDropOff: state.selectedDropOff,
    outboundState: state.outboundState,
    returnState: state.returnState,
    bookingResult: state.bookingResult,
  })));

  const model = useMemo(
    () => buildCheckoutTicketViewModel({
      bookingResult,
      paymentMethod,
      selectedTrip,
      selectedPickUp,
      selectedDropOff,
      outboundState,
      returnState,
    }),
    [
      bookingResult,
      outboundState,
      paymentMethod,
      returnState,
      selectedDropOff,
      selectedPickUp,
      selectedTrip,
    ],
  );

  const handleHome = useCallback(
    () => navigation.navigate('Main', { screen: 'Home' }),
    [navigation],
  );
  const handleViewBookings = useCallback(
    () => navigation.navigate('Main', {
      screen: 'BookingHistory',
      params: { initialTab: 'ticket' },
    }),
    [navigation],
  );
  const handleTrack = useCallback((leg: TicketLegViewModel) => {
    if (!leg.tripId || !leg.trackingEnabled) return;
    navigation.navigate('Tracking', {
      tripId: leg.tripId,
      bookingId: leg.bookingId,
      stopId: leg.stopId,
      tripStatus: leg.tripStatus,
    });
  }, [navigation]);

  if (!model) {
    return (
      <UnavailableTicket
        title="Ticket details unavailable"
        message="This confirmation is no longer available in the current session. Open booking history for the latest status."
        onBack={handleHome}
      />
    );
  }

  return (
    <TicketView
      model={model}
      source="checkout"
      onBack={handleHome}
      onViewBookings={handleViewBookings}
      onHome={handleHome}
      onTrack={handleTrack}
    />
  );
}

function HistoryTicketContent({ bookingId }: { bookingId: string }): React.JSX.Element {
  const navigation = useNavigation<DigitalTicketNavigation>();
  const ticketQuery = useBookingHistoryTicket(bookingId);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const result = ticketQuery.data;
  const model = useMemo<TicketViewModel | null>(() => {
    if (!result || result.source === 'unavailable') return null;
    return buildHistoryTicketViewModel(result.source, result.detail);
  }, [result]);

  const handleTrack = useCallback((leg: TicketLegViewModel) => {
    if (!leg.tripId || !leg.trackingEnabled) return;
    navigation.navigate('Tracking', {
      tripId: leg.tripId,
      bookingId: leg.bookingId,
      stopId: leg.stopId,
      tripStatus: leg.tripStatus,
    });
  }, [navigation]);

  if (ticketQuery.isPending) {
    return (
      <UnavailableTicket
        title="Loading ticket"
        message="Reading the selected ticket detail..."
        isLoading
        onBack={handleBack}
      />
    );
  }

  if (ticketQuery.isError || !model) {
    const reason = result?.source === 'unavailable' ? result.reason : undefined;
    const message = reason === 'backend_not_supported'
      ? 'Passenger ticket history is not available from the backend yet.'
      : reason === 'authentication_required'
        ? 'Sign in with the passenger account that owns this booking.'
        : 'The selected ticket detail is unavailable.';
    return <UnavailableTicket title="Ticket unavailable" message={message} onBack={handleBack} />;
  }

  return (
    <TicketView
      model={model}
      source="history"
      onBack={handleBack}
      onViewBookings={handleBack}
      onHome={handleBack}
      onTrack={handleTrack}
    />
  );
}

export function DigitalTicketScreen(): React.JSX.Element {
  const route = useRoute<DigitalTicketRoute>();
  return route.params.source === 'history'
    ? <HistoryTicketContent bookingId={route.params.bookingId} />
    : <CheckoutTicketContent />;
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navbar: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  navSpacer: { width: 40 },
  pressed: { opacity: 0.8 },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  demoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  demoBannerText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.warning,
  },
  successHeader: {
    alignItems: 'center' as const,
    marginVertical: spacing.md,
  },
  successTitle: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  successSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  legBlock: {
    gap: spacing.sm,
  },
  ticketCard: {
    overflow: 'visible' as const,
    marginBottom: spacing.md,
    borderRadius: BR.xl,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    ...theme.components.elevatedCard,
  },
  referenceSection: {
    alignItems: 'center' as const,
    padding: spacing.xl,
  },
  referenceIconContainer: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  referenceCaption: {
    marginBottom: 4,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  ticketIdText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  dashedDivider: {
    height: 2,
    position: 'relative' as const,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderStyle: 'dashed' as const,
  },
  sideCutoutLeft: {
    position: 'absolute' as const,
    left: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
  },
  sideCutoutRight: {
    position: 'absolute' as const,
    right: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
  },
  detailsSection: { padding: spacing.xl },
  routeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  routeItem: { flex: 1 },
  routeLabel: {
    marginBottom: 4,
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeCity: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  alignRight: { textAlign: 'right' as const },
  specsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginBottom: spacing.lg,
  },
  gridItem: {
    width: '50%' as const,
    marginBottom: spacing.md,
  },
  specLabel: {
    marginBottom: 4,
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
  specValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  paymentMethodLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  roundTripTotalCard: {
    ...theme.components.card,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.primary,
  },
  primaryAction: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  primaryActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  secondaryAction: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  secondaryActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  homeButton: {
    minHeight: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
  },
  homeButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  unavailableContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  unavailableTitle: {
    marginTop: spacing.lg,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  unavailableMessage: {
    maxWidth: 360,
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  unavailableButton: {
    minWidth: 150,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});
