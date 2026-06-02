import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Star, MapPin, NavigationArrow } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { Station } from '../types';

interface StationCardProps {
  station: Station;
  onSelect: (station: Station) => void;
  isSelected?: boolean;
}

export function StationCard({ station, onSelect, isSelected = false }: StationCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {station.isClosest && (
        <View style={styles.closestTag}>
          <Text style={styles.closestText}>CLOSEST</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name} numberOfLines={2}>
            {station.name}
          </Text>
          <View style={styles.ratingRow}>
            <Star size={14} color={colors.accent} weight="fill" />
            <Text style={styles.ratingText}>
              {station.rating} ({station.reviewsCount} reviews)
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.address} numberOfLines={2}>
        {station.address}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <MapPin size={14} color={colors.primary} weight="bold" />
          <Text style={styles.badgeText}>{station.distance}</Text>
        </View>
        <View style={styles.badge}>
          <NavigationArrow size={14} color={colors.primary} weight="bold" />
          <Text style={styles.badgeText}>{station.city}</Text>
        </View>
      </View>

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
    backgroundColor: 'rgba(10, 126, 164, 0.02)',
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
  },
  closestText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  address: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  badgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  buttonTextSelected: {
    color: colors.textInverse,
  },
});
