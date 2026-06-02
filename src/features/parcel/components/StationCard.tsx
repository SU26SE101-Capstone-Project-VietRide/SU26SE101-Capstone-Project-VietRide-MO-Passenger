import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Clock, Package } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { Station } from '../types';

interface StationCardProps {
  station: Station;
  onSelect: (station: Station) => void;
  isSelected?: boolean;
}

export function StationCard({ station, onSelect, isSelected = false }: StationCardProps): React.JSX.Element {
  // Dynamically split name into Brand and rest description for premium layout matching the screenshot
  const getSplitName = (fullName: string) => {
    const brands = ['FUTA', 'THANH BUOI', 'Thanh Buoi'];
    for (const brand of brands) {
      if (fullName.toLowerCase().startsWith(brand.toLowerCase())) {
        const rest = fullName.substring(brand.length).trim();
        return { brand: brand.toUpperCase(), rest };
      }
    }
    const firstSpace = fullName.indexOf(' ');
    if (firstSpace !== -1) {
      return {
        brand: fullName.substring(0, firstSpace).toUpperCase(),
        rest: fullName.substring(firstSpace + 1)
      };
    }
    return { brand: fullName.toUpperCase(), rest: '' };
  };

  const { brand, rest } = getSplitName(station.name);

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {station.isClosest && (
        <View style={styles.closestTag}>
          <Text style={styles.closestText}>CLOSEST</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.brandText}>{brand}</Text>
          {rest ? <Text style={styles.branchText}>{rest}</Text> : null}
        </View>
      </View>

      <View style={styles.distanceRow}>
        <MapPin size={15} color={colors.textTertiary} weight="regular" />
        <Text style={styles.distanceText}>{station.distance}</Text>
      </View>

      <Text style={styles.address} numberOfLines={2}>
        {station.address}
      </Text>

      {/* Optional working hours and status badges */}
      {(station.workingHours || station.acceptingParcels) && (
        <View style={styles.badgesRow}>
          {station.workingHours && (
            <View style={styles.statusBadge}>
              <Clock size={14} color={colors.primary} weight="regular" />
              <Text style={styles.statusBadgeText}>{station.workingHours}</Text>
            </View>
          )}
          {station.acceptingParcels && (
            <View style={styles.statusBadge}>
              <Package size={14} color={colors.primary} weight="regular" />
              <Text style={styles.statusBadgeText}>Accepting</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, isSelected && styles.buttonSelected]}
        onPress={() => onSelect(station)}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
          {isSelected ? 'Station Selected' : 'Select this Station'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4FBFB', // Solid opaque light mint to prevent Android shadow bleeding
    borderWidth: 2,
  },
  closestTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderBottomRightRadius: borderRadius.sm,
    zIndex: 10,
  },
  closestText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  header: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  titleContainer: {
    width: '100%',
  },
  brandText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  branchText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  distanceText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  },
  address: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statusBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  buttonTextSelected: {
    color: colors.textInverse,
  },
});
