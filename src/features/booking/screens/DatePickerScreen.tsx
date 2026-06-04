/** DatePicker — chọn ngày đi, set vào Zustand store rồi goBack.
 *  Có thể dùng chung cho Booking và Parcel.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ArrowLeft, CalendarBlank } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'DatePicker'>;

const TODAY = new Date();
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

const DAYS = Array.from({ length: 30 }, (_, i) => addDays(TODAY, i));

export function DatePicker(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { searchParams, setSearchParams } = useBookingStore();

  const todayStr = fmt(TODAY);
  const [selected, setSelected] = useState(searchParams.date || todayStr);

  const onConfirm = () => {
    setSearchParams({ date: selected });
    navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Date</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* 30-day strip */}
      <FlatList
        data={DAYS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => fmt(d)}
        contentContainerStyle={styles.strip}
        renderItem={({ item }) => {
          const label = DAY_LABELS[item.getDay()];
          const dateStr = fmt(item);
          const isToday = dateStr === todayStr;
          const active = dateStr === selected;
          return (
            <TouchableOpacity
              style={[styles.dayItem, active && styles.dayItemActive]}
              onPress={() => setSelected(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{label}</Text>
              <Text style={[styles.dayNum, active && styles.dayNumActive]}>{item.getDate()}</Text>
              {isToday && <Text style={[styles.dayBadge, active && styles.dayBadgeActive]}>Today</Text>}
            </TouchableOpacity>
          );
        }}
      />

      {/* Month label */}
      <Text style={styles.monthLabel}>
        {TODAY.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </Text>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={styles.calWeekday}>{d}</Text>
        ))}
        {DAYS.map((d) => {
          const dateStr = fmt(d);
          const active = dateStr === selected;
          const dimmed = d.getMonth() !== TODAY.getMonth();
          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.calCell, active && styles.calCellActive]}
              onPress={() => setSelected(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.calCellText, active && styles.calCellTextActive, dimmed && styles.calCellDimmed]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Confirm */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
          <CalendarBlank size={18} color={colors.textInverse} />
          <Text style={styles.confirmText}>Confirm — {selected}</Text>
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
  strip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm,
  },
  dayItem: {
    width: 64, aspectRatio: 0.72, borderRadius: borderRadius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    alignItems: 'center', justifyContent: 'center', gap: 2,
    ...shadows.sm,
  },
  dayItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayLabel: { fontFamily: fontFamilies.medium, fontSize: fontSizes.xs, color: colors.textTertiary },
  dayLabelActive: { color: colors.textInverse },
  dayNum: { fontFamily: fontFamilies.bold, fontSize: fontSizes.xl, color: colors.textPrimary },
  dayNumActive: { color: colors.textInverse },
  dayBadge: {
    fontFamily: fontFamilies.medium, fontSize: 9, color: colors.primary,
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  dayBadgeActive: { color: colors.textInverse, backgroundColor: 'rgba(255,255,255,0.2)' },
  monthLabel: {
    fontFamily: fontFamilies.medium, fontSize: fontSizes.sm,
    color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  calGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  calWeekday: {
    width: `${100/7}%`, textAlign: 'center',
    fontFamily: fontFamilies.medium, fontSize: fontSizes.xs,
    color: colors.textTertiary, paddingVertical: spacing.xs,
  },
  calCell: {
    width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  },
  calCellActive: {
    borderRadius: borderRadius.full, backgroundColor: colors.primary,
  },
  calCellText: {
    fontFamily: fontFamilies.medium, fontSize: fontSizes.md, color: colors.textPrimary,
  },
  calCellTextActive: { color: colors.textInverse, fontFamily: fontFamilies.bold },
  calCellDimmed: { color: colors.textTertiary },
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
