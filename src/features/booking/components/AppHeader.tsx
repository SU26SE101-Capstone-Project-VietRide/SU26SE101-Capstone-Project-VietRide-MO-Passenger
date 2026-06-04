/**
 * AppHeader — Reusable screen header
 *
 * Renders a left back button and a centered area that accepts
 * either a simple `title` string or a custom `centerElement`
 * ReactNode for complex headers (route info, passenger count, etc.).
 * An optional `rightElement` slot supports timer pills, filter
 * buttons, or share actions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

interface AppHeaderProps {
  /** Simple centered title (ignored if centerElement is provided) */
  title?: string;
  /** Custom centered content — overrides title */
  centerElement?: React.ReactNode;
  /** Back button callback (no button rendered if omitted) */
  onBackPress?: () => void;
  /** Optional right-side slot (timer pill, filter button, etc.) */
  rightElement?: React.ReactNode;
}

export const AppHeader = ({
  title,
  centerElement,
  onBackPress,
  rightElement,
}: AppHeaderProps): React.JSX.Element => {
  const showBack = onBackPress !== undefined;

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity
          onPress={onBackPress}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={22} weight="bold" color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backPlaceholder} />
      )}

      <View style={styles.centerSlot}>
        {centerElement != null ? (
          centerElement
        ) : title != null ? (
          <Text style={styles.title}>{title}</Text>
        ) : null}
      </View>

      {rightElement != null ? (
        <View style={styles.rightSlot}>{rightElement}</View>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 40,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rightSlot: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  rightPlaceholder: {
    width: 40,
  },
});
