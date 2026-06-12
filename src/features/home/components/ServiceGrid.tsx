import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Ticket, Package } from 'phosphor-react-native';

interface ServiceGridProps {
  onBuyTickets?: () => void;
  onDelivery?: () => void;
}

export function ServiceGrid({
  onBuyTickets,
  onDelivery,
}: ServiceGridProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Large Ticket Card */}
      <TouchableOpacity
        onPress={onBuyTickets}
        activeOpacity={0.85}
        style={styles.largeCard}
      >
        <View style={styles.textContainer}>
          <Text style={styles.largeTitle}>Buy Tickets</Text>
          <Text style={styles.largeSubtitle}>Intercity travel</Text>
        </View>

        <View style={styles.largeIconBackground}>
          <Ticket size={40} color="#fff" weight="fill" />
        </View>
      </TouchableOpacity>

      {/* Large Delivery Card (matching the style and width of Buy Tickets) */}
      <TouchableOpacity
        onPress={onDelivery}
        activeOpacity={0.85}
        style={[styles.largeCard, styles.deliveryCard]}
      >
        <View style={styles.textContainer}>
          <Text style={styles.largeTitle}>Send Parcel</Text>
          <Text style={styles.largeSubtitle}>Fast package delivery</Text>
        </View>

        <View style={[styles.largeIconBackground, styles.deliveryIconBackground]}>
          <Package size={40} color={colors.error} weight="fill" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: spacing.md,
  },
  largeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    ...shadows.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  deliveryCard: {
    marginBottom: spacing.sm,
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  largeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  largeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  largeIconBackground: {
    backgroundColor: colors.primaryLight, // Vibrant Mint Green
    borderRadius: borderRadius.xl,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconBackground: {
    backgroundColor: colors.errorLight, // Coral red container background
  },
});
