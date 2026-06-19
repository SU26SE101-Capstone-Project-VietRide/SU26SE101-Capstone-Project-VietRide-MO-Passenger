import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface RecentSearchCardProps {
  route: string;
  onPress?: () => void;
}

export const RecentSearchCard = ({ route, onPress }: RecentSearchCardProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.recentCard}>
      <View style={styles.cardSheen} pointerEvents="none" />
      <View style={styles.cardRim} pointerEvents="none" />
      <View>
        <Text style={styles.recentRoute}>{route}</Text>
        <Text style={styles.recentMeta}>Last searched route</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.recentButton, pressed ? styles.pressed : null]}
        onPress={onPress}
      >
        <ArrowRight size={16} weight="bold" color={theme.colors.primary} />
      </Pressable>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  recentCard: {
    width: 256,
    position: 'relative',
    backgroundColor: theme.effects.isLiquid ? 'rgba(255, 255, 255, 0.5)' : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? 'rgba(255, 255, 255, 0.72)' : theme.colors.divider,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: theme.effects.isLiquid ? 'rgba(255, 255, 255, 0.34)' : 'transparent',
  },
  cardRim: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: borderRadius.lg - 1,
    borderWidth: theme.effects.isLiquid ? 1 : 0,
    borderColor: theme.effects.isLiquid ? 'rgba(255, 255, 255, 0.42)' : 'transparent',
  },
  recentRoute: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  recentMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  recentButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
