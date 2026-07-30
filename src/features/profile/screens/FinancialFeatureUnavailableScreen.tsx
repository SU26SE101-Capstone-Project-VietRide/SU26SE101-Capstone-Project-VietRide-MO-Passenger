import React, { useCallback } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { FinancialFeatureNotice } from '../components/FinancialFeatureNotice';
import type { ProfileStackParamList } from '@app/navigation/types';
import {
  getFinancialUnavailableNotice,
  type FinancialUnavailableRoute,
} from '../config/financialCapabilities';

type FinancialUnavailableNavigation = NativeStackNavigationProp<ProfileStackParamList>;
type FinancialUnavailableRouteProp = RouteProp<
  ProfileStackParamList,
  FinancialUnavailableRoute
>;

export function FinancialFeatureUnavailableScreen(): React.JSX.Element {
  const navigation = useNavigation<FinancialUnavailableNavigation>();
  const route = useRoute<FinancialUnavailableRouteProp>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const notice = getFinancialUnavailableNotice(route.name);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t(notice.titleKey)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <FinancialFeatureNotice
          title={t(notice.titleKey)}
          description={t(notice.descriptionKey)}
          safetyNote={t(notice.safetyNoteKey)}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    ...theme.components.screen,
  },
  header: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  pressed: {
    opacity: 0.72,
  },
});
