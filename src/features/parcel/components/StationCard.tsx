import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MapPin } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { Station } from '../types';

interface StationCardProps {
  station: Station;
  onSelect: (station: Station) => void;
  isSelected?: boolean;
}

export function StationCard({ station, onSelect, isSelected = false }: StationCardProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

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

      {station.distance ? (
        <View style={styles.distanceRow}>
          <MapPin size={15} color={theme.colors.textTertiary} weight="regular" />
          <Text style={styles.distanceText}>{station.distance}</Text>
        </View>
      ) : null}

      <Text style={styles.address} numberOfLines={2}>
        {station.address}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          isSelected && styles.buttonSelected,
          pressed ? styles.pressed : null,
        ]}
        onPress={() => onSelect(station)}
      >
        <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
          {isSelected ? 'Station Selected' : 'Select this Station'}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 2,
  },
  closestTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderBottomRightRadius: borderRadius.sm,
    zIndex: 10,
  },
  closestText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: theme.colors.textInverse,
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
    color: theme.colors.textPrimary,
  },
  branchText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textTertiary,
  },
  address: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  buttonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  buttonTextSelected: {
    color: theme.colors.textInverse,
  },
});
