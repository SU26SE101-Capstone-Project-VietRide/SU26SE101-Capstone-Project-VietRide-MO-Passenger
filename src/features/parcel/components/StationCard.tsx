import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckCircle, MapPin } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
} from '@shared/theme';
import type { AppTheme } from '@shared/theme';

import type { Station } from '../types';

export type StationSelectionRole = 'origin' | 'destination';

interface StationCardProps {
  station: Station;
  onSelect: (station: Station) => void;
  isSelected: boolean;
  selectionRole: StationSelectionRole;
}

const selectionLabels: Record<StationSelectionRole, string> = {
  origin: 'Sending terminal',
  destination: 'Receiving terminal',
};

export const StationCard = React.memo(function StationCard({
  station,
  onSelect,
  isSelected,
  selectionRole,
}: StationCardProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const roleLabel = selectionLabels[selectionRole];

  const handlePress = React.useCallback(() => {
    onSelect(station);
  }, [onSelect, station]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${roleLabel}: ${station.name}${
        station.distance ? `, ${station.distance}` : ''
      }`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isSelected ? styles.cardSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.iconTile, isSelected ? styles.iconTileSelected : null]}>
        <MapPin
          size={22}
          color={isSelected ? theme.colors.textInverse : theme.colors.primary}
          weight={isSelected ? 'fill' : 'duotone'}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {station.name}
        </Text>
        <Text style={styles.address}>
          {station.address}
        </Text>
        {(station.distance || station.isClosest) ? (
          <View style={styles.metaRow}>
            {station.distance ? (
              <Text style={styles.distance}>{station.distance}</Text>
            ) : null}
            {station.isClosest ? (
              <View style={styles.nearbyBadge}>
                <Text style={styles.nearbyText}>NEAR YOU</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.selectionIcon}>
        {isSelected ? (
          <CheckCircle size={24} color={theme.colors.primary} weight="fill" />
        ) : (
          <View style={styles.selectionEmpty} />
        )}
      </View>
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    alignItems: 'flex-start',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    minHeight: 112,
    padding: spacing.lg,
  },
  cardSelected: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.88,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconTileSelected: {
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.3,
  },
  address: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.55,
    marginTop: spacing.xs,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  distance: {
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
  nearbyBadge: {
    backgroundColor: theme.colors.successLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  nearbyText: {
    color: theme.colors.accent,
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  selectionIcon: {
    paddingTop: 2,
  },
  selectionEmpty: {
    borderColor: theme.colors.border,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    height: 22,
    width: 22,
  },
});
