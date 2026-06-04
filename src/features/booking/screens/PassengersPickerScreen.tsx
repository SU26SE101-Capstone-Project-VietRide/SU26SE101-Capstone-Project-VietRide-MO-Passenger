/** PassengersPicker — chọn số hành khách (1–9).
 *  Dùng chung cho Booking & Parcel. Set vào store rồi goBack.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ArrowLeft, User } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
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
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Passengers</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Big number + stepper */}
      <View style={styles.heroRow}>
        <View style={styles.heroCircle}>
          <User size={28} color={colors.primary} />
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
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary },
  heroRow: {
    alignItems: 'center', paddingVertical: spacing.xxl,
  },
  heroCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 2, borderColor: colors.primary,
  },
  heroNum: { fontFamily: fontFamilies.bold, fontSize: 48, color: colors.primary, lineHeight: 52 },
  heroLabel: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, color: colors.textSecondary },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: spacing.xxl, marginTop: spacing.lg,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.divider,
    backgroundColor: colors.surface, overflow: 'hidden', height: 52,
  },
  stepBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: { fontFamily: fontFamilies.bold, fontSize: 28, color: colors.textPrimary, lineHeight: 32 },
  stepBtnTextDisabled: { color: colors.textTertiary },
  stepDivider: { width: 1, height: 32, backgroundColor: colors.divider },
  quickLabel: {
    fontFamily: fontFamilies.medium, fontSize: fontSizes.sm,
    color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.xxl,
  },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  gridCell: {
    flex: 1, aspectRatio: 1, borderRadius: borderRadius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    alignItems: 'center', justifyContent: 'center',
    margin: 4, ...shadows.sm,
  },
  gridCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  gridCellText: {
    fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary,
  },
  gridCellTextActive: { color: colors.textInverse },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, height: 52, ...shadows.md,
  },
  confirmText: { fontFamily: fontFamilies.bold, fontSize: fontSizes.md, color: colors.textInverse },
});
