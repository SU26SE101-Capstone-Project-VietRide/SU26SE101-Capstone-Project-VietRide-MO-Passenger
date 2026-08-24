/**
 * AuthStepHeader — Title + subtitle + mascot cat
 *
 * Mirrors Parcel's StepHeaderWithMascot visual weight but adapted for auth screens.
 * The step prop is kept for backward compatibility (OTP/ForgotPassword screens)
 * but is not rendered visually — auth screens don't show progress indicators.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import { ArrowLeft } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

const catMascotImage = require('@assets/images/image 1.png');

export interface AuthStepHeaderProps {
  step?: number;
  title: string;
  subtitle: string;
  onBack?: () => void;
  showMascot?: boolean;
}

export const AuthStepHeader = ({
  step: _step,
  title,
  subtitle,
  onBack,
  showMascot = true,
}: AuthStepHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();

  return (
    <View
      testID="auth-step-header"
      style={[styles.root, isCompact ? styles.rootCompact : null]}
    >
      {onBack ? (
        <Pressable
          testID="auth-step-header-back"
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backBtn,
            isCompact ? styles.backBtnCompact : null,
            pressed ? styles.pressed : null,
          ]}
          onPress={onBack}
        >
          <View style={styles.backBubble}>
            <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
          </View>
        </Pressable>
      ) : null}
      <View
        testID="auth-step-header-copy"
        style={[styles.textWrap, onBack ? styles.textWrapWithBack : null]}
      >
        <Text style={styles.title} textBreakStrategy="balanced">
          {title}
        </Text>
        <Text style={styles.subtitle} textBreakStrategy="balanced">
          {subtitle}
        </Text>
      </View>
      {showMascot ? (
        <Image
          testID="auth-step-header-mascot"
          source={catMascotImage}
          style={[styles.mascot, isCompact ? styles.mascotCompact : null]}
          contentFit="contain"
          transition={0}
        />
      ) : null}
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
    position: 'relative',
    gap: spacing.sm,
  },
  rootCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    position: 'absolute',
    top: spacing.xxxl,
    left: spacing.xxl,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCompact: {
    top: spacing.lg,
    left: spacing.md,
  },
  backBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.effects.contentSurfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.effects.contentBorderStrong,
    ...theme.effects.cardShadow,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  textWrapWithBack: {
    marginLeft: 52,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: theme.isDark ? theme.colors.textPrimary : theme.colors.primaryDark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    lineHeight: fontSizes.md * 1.5,
  },
  mascot: {
    width: 72,
    height: 72,
    flexShrink: 0,
  },
  mascotCompact: {
    width: 48,
    height: 48,
  },
  pressed: {
    opacity: 0.75,
  },
});
