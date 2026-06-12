/** PassengersPicker — chọn số hành khách (1–9).
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, User } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'PassengersPicker'>;

const OPTIONS = Array.from({ length: 9 }, (_, i) => i + 1);

export function PassengersPicker(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { searchParams, setSearchParams } = useBookingStore();
  const [count, setCount] = useState(typeof searchParams.passengers === 'number' ? searchParams.passengers : 1);

  const onConfirm = () => {
    setSearchParams({ passengers: count });
    navigation.goBack();
  };

  const onMinus = () => setCount((c) => Math.max(1, c - 1));
  const onPlus = () => setCount((c) => Math.min(9, c + 1));

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="passGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#passGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header with back bubble */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passengers</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Big number + stepper */}
        <View style={styles.heroRow}>
          <View style={styles.heroCircle}>
            <User size={28} color={colors.primary} weight="fill" />
            <Text style={styles.heroNum}>{count}</Text>
            <Text style={styles.heroLabel}>Passenger{count > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, count <= 1 && styles.stepBtnDisabled]}
            onPress={onMinus}
            activeOpacity={0.7}
            disabled={count <= 1}
          >
            <Text style={[styles.stepBtnText, count <= 1 && styles.stepBtnTextDisabled]}>−</Text>
          </TouchableOpacity>
          <View style={styles.stepDivider} />
          <TouchableOpacity
            style={[styles.stepBtn, count >= 9 && styles.stepBtnDisabled]}
            onPress={onPlus}
            activeOpacity={0.7}
            disabled={count >= 9}
          >
            <Text style={[styles.stepBtnText, count >= 9 && styles.stepBtnTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Grid of numbers */}
        <Text style={styles.quickLabel}>Quick select</Text>
        <FlatList
          data={OPTIONS}
          numColumns={5}
          keyExtractor={(n) => String(n)}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const active = item === count;
            return (
              <TouchableOpacity
                style={[styles.gridCell, active && styles.gridCellActive]}
                onPress={() => setCount(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gridCellText, active && styles.gridCellTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Confirm */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmText}>Confirm — {count} Passenger{count > 1 ? 's' : ''}</Text>
            <ArrowLeft size={18} color={colors.textInverse} weight="bold" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  heroRow: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  heroNum: {
    fontFamily: fontFamilies.bold,
    fontSize: 48,
    color: colors.primary,
    lineHeight: 52,
  },
  heroLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xxl,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    height: 52,
    ...shadows.sm,
  },
  stepBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  stepBtnTextDisabled: {
    color: colors.textTertiary,
  },
  stepDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
  },
  quickLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    ...shadows.sm,
  },
  gridCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.md,
  },
  gridCellText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  gridCellTextActive: {
    color: colors.textInverse,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: '#E6F4F3',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    height: 52,
    ...shadows.md,
  },
  confirmText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
