/** DatePicker — chọn ngày đi, set vào Zustand store rồi goBack.
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, CalendarBlank } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { RouteProp } from '@react-navigation/native';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'DatePicker'>;
type DatePickerRouteProp = RouteProp<BookingStackParamList, 'DatePicker'>;

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
  const route = useRoute<DatePickerRouteProp>();
  const { searchParams, setSearchParams } = useBookingStore();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const mode = route.params?.mode || 'departure';
  const todayStr = fmt(TODAY);
  const initialDate = mode === 'return' ? searchParams.returnDate : searchParams.date;
  const [selected, setSelected] = useState(initialDate || todayStr);

  const onConfirm = () => {
    if (mode === 'return') {
      setSearchParams({ returnDate: selected });
    } else {
      setSearchParams({ date: selected });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="dateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={theme.isDark ? 0.18 : 0.14} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#dateGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {/* Header with back bubble */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.backBtnPressed : null]}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>Select {mode === 'return' ? 'Return Date' : 'Date'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 30-day strip */}
        <View style={styles.stripCard}>
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
                <Pressable
                  style={({ pressed }) => [
                    styles.dayItem,
                    active && styles.dayItemActive,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={() => setSelected(dateStr)}
                >
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{label}</Text>
                  <Text style={[styles.dayNum, active && styles.dayNumActive]}>{item.getDate()}</Text>
                  {isToday ? <Text style={[styles.dayBadge, active && styles.dayBadgeActive]}>Today</Text> : null}
                </Pressable>
              );
            }}
          />
        </View>

        {/* Month label */}
        <Text style={styles.monthLabel}>
          {TODAY.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>

        {/* Calendar grid */}
        <View style={styles.calCard}>
          {/* Weekday header row */}
          <View style={styles.calRow}>
            {DAY_LABELS.map((d) => (
              <View key={d} style={styles.calCell}>
                <Text style={styles.calWeekday}>{d}</Text>
              </View>
            ))}
          </View>
          {/* Date rows */}
          {(() => {
            const offset = DAYS[0].getDay();
            const allCells: (Date | null)[] = [
              ...Array.from({ length: offset }, () => null),
              ...DAYS,
            ];
            const rows: (Date | null)[][] = [];
            for (let i = 0; i < allCells.length; i += 7) {
              rows.push(allCells.slice(i, i + 7));
            }
            return rows.map((row, ri) => (
              <View key={`row-${ri}`} style={styles.calRow}>
                {row.map((d, ci) => {
                  if (!d) return <View key={`empty-${ri}-${ci}`} style={styles.calCell} />;
                  const dateStr = fmt(d);
                  const active = dateStr === selected;
                  const dimmed = d.getMonth() !== TODAY.getMonth();
                  return (
                    <Pressable
                      key={dateStr}
                      style={({ pressed }) => [
                        styles.calCell,
                        active && styles.calCellActive,
                        pressed ? styles.calCellPressed : null,
                      ]}
                      onPress={() => setSelected(dateStr)}
                    >
                      <Text style={[styles.calCellText, active && styles.calCellTextActive, dimmed && styles.calCellDimmed]}>
                        {d.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
                {/* Pad incomplete last row */}
                {row.length < 7 && Array.from({ length: 7 - row.length }, (_, pi) => (
                  <View key={`pad-${ri}-${pi}`} style={styles.calCell} />
                ))}
              </View>
            ));
          })()}
        </View>

        {/* Confirm */}
        <View style={styles.footer}>
          <Pressable style={({ pressed }) => [styles.confirmBtn, pressed ? styles.pressed : null]} onPress={onConfirm}>
            <CalendarBlank size={18} color={theme.colors.textInverse} />
            <Text style={styles.confirmText}>Confirm - {selected}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    ...theme.components.headerButton,
  },
  backBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  stripCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  strip: {
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dayItem: {
    width: 64,
    aspectRatio: 0.72,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayItemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.effects.cardShadow,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  dayLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  dayLabelActive: {
    color: theme.colors.textInverse,
  },
  dayNum: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  dayNumActive: {
    color: theme.colors.textInverse,
  },
  dayBadge: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  dayBadgeActive: {
    color: theme.colors.textInverse,
    backgroundColor: theme.effects.glassSheen,
  },
  monthLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  calCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
  },
  calRow: {
    flexDirection: 'row',
  },
  calWeekday: {
    textAlign: 'center',
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    paddingVertical: spacing.xs,
  },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellActive: {
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  calCellPressed: {
    opacity: 0.72,
  },
  calCellText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  calCellTextActive: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
  },
  calCellDimmed: {
    color: theme.colors.textTertiary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...theme.components.primaryButton,
    borderRadius: borderRadius.lg,
    height: 52,
  },
  confirmText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
});
