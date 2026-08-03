/**
 * Compact step indicator shared by the multi-step authentication flows.
 */

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, X } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export interface AuthProgressBarProps {
  step: number;
  totalSteps: number;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onCancel?: () => void;
}

export const AuthProgressBar = ({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onCancel,
}: AuthProgressBarProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const progress = totalSteps > 1
    ? Math.min(Math.max((step - 1) / (totalSteps - 1), 0), 1) * 100
    : 100;

  return (
    <View style={styles.root}>
      <View style={styles.controlsRow}>
        {onBack ? (
          <TouchableOpacity
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.iconBtn}
          >
            <ArrowLeft size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}

        <View style={styles.titleWrap}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>

        {onCancel ? (
          <TouchableOpacity
            accessibilityLabel={t('common.cancel')}
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={onCancel}
            style={styles.iconBtn}
          >
            <X size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <View style={styles.progressRow}>
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.bubblesRow}>
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map(
            (stepNumber) => {
              const isActive = stepNumber === step;
              const isDone = stepNumber < step;

              return (
                <View key={stepNumber} style={styles.bubbleWrap}>
                  <View
                    style={[
                      styles.bubble,
                      isActive ? styles.bubbleActive : null,
                      isDone ? styles.bubbleDone : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleLabel,
                        isActive || isDone ? styles.bubbleLabelInverse : null,
                      ]}
                    >
                      {isDone ? '\u2713' : stepNumber}
                    </Text>
                  </View>
                </View>
              );
            },
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  root: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.transparent,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center' as const,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginBottom: 2,
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: theme.colors.primary,
  },
  progressRow: {
    marginTop: spacing.xs,
  },
  trackBg: {
    height: 3,
    marginBottom: spacing.sm,
    overflow: 'hidden' as const,
    borderRadius: 1.5,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  trackFill: {
    height: '100%' as const,
    borderRadius: 1.5,
    backgroundColor: theme.colors.primary,
  },
  bubblesRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  bubbleWrap: {
    alignItems: 'center' as const,
  },
  bubble: {
    width: 24,
    height: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    backgroundColor: theme.effects.contentSurface,
  },
  bubbleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.effects.cardShadow,
  },
  bubbleDone: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  bubbleLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  bubbleLabelInverse: {
    color: theme.colors.textInverse,
  },
});
