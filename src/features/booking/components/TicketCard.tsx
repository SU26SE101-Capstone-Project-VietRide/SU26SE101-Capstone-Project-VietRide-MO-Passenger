import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bus, ArrowUpRight } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

export interface TicketData {
  operatorName: string;
  operatorSubtitle: string;
  status: string;
  departureCode: string;
  departureName: string;
  arrivalCode: string;
  arrivalName: string;
  departureDate: string;
  seatNumber: string;
  passengerName: string;
  bookingRef: string;
}

interface TicketCardProps {
  ticket: TicketData;
  barcodeWidths?: number[];
  onSharePress?: () => void;
}

const DEFAULT_BARCODE = [4, 2, 6, 1, 3, 5, 2, 1, 4, 7, 2, 1, 3, 5, 2, 4, 1, 3, 6];

export const TicketCard = ({
  ticket,
  barcodeWidths = DEFAULT_BARCODE,
  onSharePress,
}: TicketCardProps): React.JSX.Element => {
  const shareButton = (
    <TouchableOpacity style={styles.shareButton} onPress={onSharePress}>
      <ArrowUpRight size={20} weight="bold" color={colors.textPrimary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.ticketContainer}>
      {/* ── Top Section ────────────────────────── */}
      <View style={styles.ticketTop}>
        {/* Operator + Status */}
        <View style={styles.operatorRow}>
          <View style={styles.operatorLogo}>
            <Bus size={22} weight="fill" color={colors.primary} />
          </View>
          <View style={styles.operatorInfo}>
            <Text style={styles.operatorName}>{ticket.operatorName}</Text>
            <Text style={styles.operatorSub}>{ticket.operatorSubtitle}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{ticket.status}</Text>
          </View>
        </View>

        {/* Route — bus icon */}
        <View style={styles.routeSection}>
          <View style={styles.routeEndpoint}>
            <Text style={styles.routeCode}>{ticket.departureCode}</Text>
            <Text style={styles.routeCity}>{ticket.departureName}</Text>
          </View>

          <View style={styles.routeCenter}>
            <View style={styles.routeLine} />
            <View style={styles.routeIconBubble}>
              <Bus size={14} weight="fill" color={colors.primary} />
            </View>
          </View>

          <View style={[styles.routeEndpoint, styles.routeEndpointRight]}>
            <Text style={styles.routeCode}>{ticket.arrivalCode}</Text>
            <Text style={[styles.routeCity, { textAlign: 'right' }]}>
              {ticket.arrivalName}
            </Text>
          </View>
        </View>

        {/* Bento Info Grid */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>DEPARTURE</Text>
            <Text style={styles.bentoValue}>{ticket.departureDate}</Text>
          </View>
          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>SEAT NUMBER</Text>
            <Text style={styles.bentoValueLarge}>{ticket.seatNumber}</Text>
          </View>
        </View>
      </View>

      {/* ── Physical Divider Notch ──────────────── */}
      <View style={styles.dividerRow}>
        <View style={styles.notchLeft} />
        <View style={styles.dividerLine} />
        <View style={styles.notchRight} />
      </View>

      {/* ── Bottom Section ──────────────────────── */}
      <View style={styles.ticketBottom}>
        {/* Passenger + Booking Ref */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>PASSENGER</Text>
            <Text style={styles.infoValue}>{ticket.passengerName}</Text>
          </View>
          <View style={[styles.infoBlock, styles.infoBlockRight]}>
            <Text style={styles.infoLabel}>BOOKING REF</Text>
            <Text style={styles.infoValue}>{ticket.bookingRef}</Text>
          </View>
        </View>

        {/* Barcode */}
        <View style={styles.barcodeContainer}>
          <View style={styles.barcodeInner}>
            {barcodeWidths.map((w, i) => (
              <View
                key={i}
                style={[
                  styles.barcodeBar,
                  { width: w, marginRight: i < barcodeWidths.length - 1 ? 14 - w : 0 },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ticketContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    overflow: 'hidden',
  },
  ticketTop: {
    padding: spacing.xxl,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  operatorLogo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  operatorSub: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: 'rgba(54, 179, 126, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: colors.success,
    letterSpacing: 1,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  routeEndpoint: {
    flex: 1,
  },
  routeEndpointRight: {
    alignItems: 'flex-end',
  },
  routeCode: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
  },
  routeCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  routeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  routeLine: {
    width: 96,
    height: 2,
    backgroundColor: colors.divider,
  },
  routeIconBubble: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  bentoLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bentoValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: fontSizes.md * 1.6,
  },
  bentoValueLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  notchLeft: {
    width: 16,
    height: 32,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#F7F9FF',
    marginLeft: -1,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  notchRight: {
    width: 16,
    height: 32,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#F7F9FF',
    marginRight: -1,
  },
  ticketBottom: {
    padding: spacing.xxl,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
  },
  infoBlock: {
    flex: 1,
  },
  infoBlockRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  infoValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  barcodeContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  barcodeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
  },
  barcodeBar: {
    height: 62,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
