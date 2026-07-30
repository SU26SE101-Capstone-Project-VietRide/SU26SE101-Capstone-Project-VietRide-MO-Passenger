import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ticket, Package } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface ServiceGridProps {
  onBuyTickets?: () => void;
  onDelivery?: () => void;
}

export const ServiceGrid = memo(function ServiceGridComponent({
  onBuyTickets,
  onDelivery,
}: ServiceGridProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.services.buyTickets')}
        onPress={onBuyTickets}
        style={({ pressed }) => [styles.largeCard, pressed ? styles.pressed : null]}
      >
        <View style={styles.textContainer}>
          <Text style={styles.largeTitle}>{t('home.services.buyTickets')}</Text>
          <Text style={styles.largeSubtitle}>{t('home.services.intercityTravel')}</Text>
        </View>

        <View style={styles.largeIconBackground}>
          <Ticket size={40} color={theme.colors.textInverse} weight="fill" />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.services.sendParcel')}
        onPress={onDelivery}
        style={({ pressed }) => [
          styles.largeCard,
          styles.deliveryCard,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.textContainer}>
          <Text style={styles.largeTitle}>{t('home.services.sendParcel')}</Text>
          <Text style={styles.largeSubtitle}>{t('home.services.fastDelivery')}</Text>
        </View>

        <View style={[styles.largeIconBackground, styles.deliveryIconBackground]}>
          <Package size={40} color={theme.colors.error} weight="fill" />
        </View>
      </Pressable>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    width: '100%' as const,
    marginVertical: spacing.md,
  },
  largeCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%' as const,
    marginBottom: spacing.lg,
  },
  deliveryCard: {
    marginBottom: spacing.sm,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    paddingRight: spacing.md,
  },
  largeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  largeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
  },
  largeIconBackground: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    width: 80,
    height: 80,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deliveryIconBackground: {
    backgroundColor: theme.colors.errorLight,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
