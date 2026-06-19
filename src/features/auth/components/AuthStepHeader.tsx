/**
 * AuthStepHeader — Title + subtitle + mascot cat
 *
 * Mirrors Parcel's StepHeaderWithMascot visual weight but adapted for auth screens.
 * The step prop is kept for backward compatibility (OTP/ForgotPassword screens)
 * but is not rendered visually — auth screens don't show progress indicators.
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { ColorValue } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';

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
}: AuthStepHeaderProps): React.JSX.Element => (
  <View style={styles.root}>
    {onBack && (
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <View style={styles.backBubble}>
          <ArrowLeft size={20} color={colors.primary} weight="bold" />
        </View>
      </TouchableOpacity>
    )}
    <View style={[styles.textWrap, onBack && styles.textWrapWithBack]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    <Image source={catMascotImage} style={styles.mascot} resizeMode="contain" />
  </View>
);

const styles = StyleSheet.create({
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  textWrap: { flex: 1.4 },
  textWrapWithBack: {
    marginLeft: 44,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: colors.primaryDark as ColorValue,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary as ColorValue,
    lineHeight: fontSizes.md * 1.5,
  },
  mascot: {
    width: 72,
    height: 72,
  },
});
