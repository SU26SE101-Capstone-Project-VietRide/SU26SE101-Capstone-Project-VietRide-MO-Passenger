import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface RecentSearchCardProps {
  route: string;
  onPress?: () => void;
}

export const RecentSearchCard = ({ route, onPress }: RecentSearchCardProps): React.JSX.Element => (
  <View style={styles.recentCard}>
    <View>
      <Text style={styles.recentRoute}>{route}</Text>
    </View>
    <TouchableOpacity style={styles.recentButton} onPress={onPress}>
      <ArrowRight size={16} weight="bold" color={colors.primary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  recentCard: {
    width: 256,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#212529',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  recentRoute: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  recentButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
