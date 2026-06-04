import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface RecentSearchCardProps {
  route: string;
  date: string;
  onPress?: () => void;
}

export const RecentSearchCard = ({ route, date, onPress }: RecentSearchCardProps): React.JSX.Element => (
  <View style={styles.recentCard}>
    <View>
      <Text style={styles.recentRoute}>{route}</Text>
      <Text style={styles.recentDate}>{date}</Text>
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
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  recentRoute: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  recentDate: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
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
