import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { Ticket, Bus, Package } from 'phosphor-react-native';

interface ServiceGridProps {
  onBuyTickets?: () => void;
  onBuses?: () => void;
  onDelivery?: () => void;
}

export function ServiceGrid({
  onBuyTickets,
  onBuses,
  onDelivery,
}: ServiceGridProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Large Ticket Card */}
      <TouchableOpacity
        onPress={onBuyTickets}
        activeOpacity={0.8}
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

      {/* Row for Small Cards */}
      <View style={styles.smallCardsRow}>
        {/* Buses Card */}
        <TouchableOpacity
          onPress={onBuses}
          activeOpacity={0.8}
          style={styles.smallCard}
        >
          <View style={[styles.smallIconBackground, { backgroundColor: '#ffe177' }]}>
            <Bus size={32} color="#cc8c00" weight="fill" />
          </View>
          <Text style={styles.smallTitle}>Buses</Text>
        </TouchableOpacity>

        {/* Delivery Card */}
        <TouchableOpacity
          onPress={onDelivery}
          activeOpacity={0.8}
          style={styles.smallCard}
        >
          <View style={[styles.smallIconBackground, { backgroundColor: '#ffdad7' }]}>
            <Package size={32} color="#b3261e" weight="fill" />
          </View>
          <Text style={styles.smallTitle}>Delivery</Text>
        </TouchableOpacity>
      </View>
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
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  largeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: '#181c20',
    marginBottom: spacing.xxs,
  },
  largeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    color: '#3c4948',
  },
  largeIconBackground: {
    backgroundColor: '#2ac1bc',
    borderRadius: borderRadius.xl,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  smallCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48,
    ...shadows.md,
  },
  smallIconBackground: {
    borderRadius: 20,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  smallTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: '#181c20',
  },
});
