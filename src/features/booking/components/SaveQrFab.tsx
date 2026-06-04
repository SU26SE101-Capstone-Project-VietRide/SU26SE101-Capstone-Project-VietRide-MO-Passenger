import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QrCode } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface SaveQrFabProps {
  onPress?: () => void;
}

export const SaveQrFab = ({ onPress }: SaveQrFabProps): React.JSX.Element => (
  <TouchableOpacity activeOpacity={0.8} style={styles.fab} onPress={onPress}>
    <QrCode size={18} weight="bold" color={colors.textInverse} style={styles.fabIcon} />
    <Text style={styles.fabText}>Save QR Code</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: spacing.huge,
    right: spacing.huge,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xl,
  },
  fabIcon: {
    marginRight: spacing.sm,
  },
  fabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
