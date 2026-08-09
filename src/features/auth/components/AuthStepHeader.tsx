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
import { useThemedStyles } from '@shared/hooks';
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

  return (
    <View style={styles.root}>
      {onBack ? (
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backBtn,
            pressed ? styles.pressed : null,
          ]}
          onPress={onBack}
        >
          <View style={styles.backBubble}>
            <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
          </View>
        </Pressable>
      ) : null}
      <View style={[styles.textWrap, onBack ? styles.textWrapWithBack : null]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {showMascot ? (
        <Image
          source={catMascotImage}
          style={styles.mascot}
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
  },
  backBtn: {
    position: 'absolute',
    top: spacing.xxxl,
    left: spacing.xxl,
    zIndex: 10,
  },
  backBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.effects.contentSurfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.effects.contentBorderStrong,
    ...theme.effects.cardShadow,
  },
  textWrap: { flex: 1.4 },
  textWrapWithBack: {
    marginLeft: 44,
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
  },
  pressed: {
    opacity: 0.75,
  },
});
