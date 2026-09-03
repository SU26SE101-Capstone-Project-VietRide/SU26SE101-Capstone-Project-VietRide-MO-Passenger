/** DatePicker — chọn ngày đi, set vào Zustand store rồi goBack.
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  StatusBar,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, CalendarBlank } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { RouteProp } from '@react-navigation/native';
import type { BookingStackParamList } from '@app/navigation/types';
import {
  addLocalDays,
  compareLocalDates,
  parseLocalDate,
  toLocalDisplayDate,
  toLocalIsoDate,
} from '@shared/utils/localDate';
import { toVietnamBusinessDate } from '@shared/utils/apiTime';
import { toTripSearchDate } from '../utils/searchParams';
import { formatMonthYear } from '@shared/utils/format';
import { useBookingDiscovery } from '../hooks/useBookingDiscovery';
import { DEFAULT_BOOKING_ENTRY_INTENT } from '../utils/bookingDiscovery';
import { resolveDatePickerContinuation } from '../utils/datePickerContinuation';
import {
  getDatePickerCalendarLayout,
  resolveDatePickerFooterHeight,
} from '../utils/datePickerLayout';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'DatePicker'>;
type DatePickerRouteProp = RouteProp<BookingStackParamList, 'DatePicker'>;

const DAY_KEYS = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;

const resolveDisplayDate = (
  value: string | undefined,
  now: Date,
  fallback: Date,
): string => {
  if (!value) {
    return toLocalDisplayDate(fallback);
  }

  try {
    const date = parseLocalDate(toTripSearchDate(value, now));
    return date ? toLocalDisplayDate(date) : toLocalDisplayDate(fallback);
  } catch {
    return toLocalDisplayDate(fallback);
  }
};

const dateKeyExtractor = (date: Date): string => toLocalDisplayDate(date);

interface DateStripItemProps {
  accessibilityLabel: string;
  active: boolean;
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  onSelect: (date: string) => void;
  todayLabel: string;
}

const DateStripItem = memo(function DateStripItem({
  accessibilityLabel,
  active,
  date,
  dayLabel,
  dayNumber,
  isToday,
  onSelect,
  todayLabel,
}: DateStripItemProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onSelect(date), [date, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.dayItem,
        active ? styles.dayItemActive : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={handlePress}
    >
      <Text
        style={[styles.dayLabel, active ? styles.dayLabelActive : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {dayLabel}
      </Text>
      <Text
        style={[styles.dayNum, active ? styles.dayNumActive : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {dayNumber}
      </Text>
      {isToday ? (
        <Text
          style={[styles.dayBadge, active ? styles.dayBadgeActive : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {todayLabel}
        </Text>
      ) : null}
    </Pressable>
  );
});

export function DatePicker(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DatePickerRouteProp>();
  const searchParams = useBookingStore((state) => state.searchParams);
  const setSearchParams = useBookingStore((state) => state.setSearchParams);
  const { saveCurrentSearch } = useBookingDiscovery();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, widthClass, isCompact } = useResponsiveLayout();
  const calendarLayout = useMemo(
    () => getDatePickerCalendarLayout(width, widthClass),
    [width, widthClass],
  );
  const [footerHeight, setFooterHeight] = useState(88);
  const scrollContentStyle = useMemo(
    () => ({ paddingBottom: footerHeight + spacing.md }),
    [footerHeight],
  );
  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = event.nativeEvent.layout.height;
    setFooterHeight((currentHeight) => resolveDatePickerFooterHeight(
      currentHeight,
      measuredHeight,
    ));
  }, []);

  const mode = route.params?.mode || 'departure';
  const calendarReference = useMemo(() => new Date(), []);
  const today = useMemo(() => {
    const value = parseLocalDate(toVietnamBusinessDate(calendarReference));
    if (!value) {
      throw new Error('Cannot resolve the Vietnam business date.');
    }
    return value;
  }, [calendarReference]);
  const departureDate = useMemo(() => {
    try {
      return parseLocalDate(
        toTripSearchDate(searchParams.date, calendarReference),
      ) ?? today;
    } catch {
      return today;
    }
  }, [calendarReference, searchParams.date, today]);
  const firstSelectableDate = useMemo(
    () => mode === 'return' && compareLocalDates(departureDate, today) > 0
      ? departureDate
      : today,
    [departureDate, mode, today],
  );
  const days = useMemo(
    () => Array.from({ length: 30 }, (_, index) => addLocalDays(firstSelectableDate, index)),
    [firstSelectableDate],
  );
  const todayStr = toLocalDisplayDate(today);
  const initialDate = mode === 'return' ? searchParams.returnDate : searchParams.date;
  const initialSelection = resolveDisplayDate(
    initialDate,
    calendarReference,
    firstSelectableDate,
  );
  const parsedInitialSelection = parseLocalDate(initialSelection);
  const lastSelectableDate = days[days.length - 1];
  const isInitialSelectionInRange = parsedInitialSelection
    && compareLocalDates(parsedInitialSelection, firstSelectableDate) >= 0
    && compareLocalDates(parsedInitialSelection, lastSelectableDate) <= 0;
  const [selected, setSelected] = useState(
    isInitialSelectionInRange
      ? initialSelection
      : toLocalDisplayDate(firstSelectableDate),
  );
  const selectedDate = parseLocalDate(selected) ?? firstSelectableDate;
  const dayLabels = useMemo(
    () => DAY_KEYS.map(key => t(`booking.datePicker.weekdays.${key}`)),
    [t],
  );

  const handleDateSelect = useCallback((date: string) => {
    setSelected(date);
  }, []);
  const renderDateStripItem = useCallback(({ item }: { item: Date }) => {
    const date = toLocalDisplayDate(item);
    return (
      <DateStripItem
        accessibilityLabel={t('booking.datePicker.dateAccessibility', { date })}
        active={date === selected}
        date={date}
        dayLabel={dayLabels[item.getDay()]}
        dayNumber={item.getDate()}
        isToday={date === todayStr}
        onSelect={handleDateSelect}
        todayLabel={t('booking.datePicker.today')}
      />
    );
  }, [dayLabels, handleDateSelect, selected, t, todayStr]);

  const onConfirm = () => {
    if (mode === 'return') {
      setSearchParams({ returnDate: toLocalIsoDate(selectedDate) });
    } else {
      const selectedDateForConfirm = parseLocalDate(selected);
      const currentReturnDate = (() => {
        try {
          return searchParams.returnDate
            ? parseLocalDate(toTripSearchDate(
              searchParams.returnDate,
              calendarReference,
            ))
            : null;
        } catch {
          return null;
        }
      })();
      const shouldClearReturnDate = selectedDateForConfirm
        && (!currentReturnDate || compareLocalDates(currentReturnDate, selectedDateForConfirm) < 0);

      setSearchParams({
        date: toLocalIsoDate(selectedDate),
        ...(shouldClearReturnDate ? { returnDate: '' } : {}),
      });
    }

    const continuation = resolveDatePickerContinuation({
      isRoundTrip: Boolean(searchParams.isRoundTrip),
      mode,
      next: route.params?.next,
    });
    if (continuation === 'select_return') {
      navigation.replace('DatePicker', {
        mode: 'return',
        next: 'search',
        intent: route.params?.intent ?? DEFAULT_BOOKING_ENTRY_INTENT,
      });
      return;
    }
    if (continuation === 'search') {
      saveCurrentSearch().catch(() => undefined);
      navigation.replace('CreateTicketBooking', {
        intent: route.params?.intent ?? DEFAULT_BOOKING_ENTRY_INTENT,
      });
      return;
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
        <View style={[styles.header, isCompact ? styles.headerCompact : null]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={navigation.goBack}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.backBtnPressed : null]}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </View>
          </Pressable>
          <Text
            style={styles.headerTitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {mode === 'return'
              ? t('booking.datePicker.returnTitle')
              : t('booking.datePicker.departureTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={scrollContentStyle}
        >
        {/* 30-day strip */}
        <View style={[styles.stripCard, isCompact ? styles.stripCardCompact : null]}>
          <FlatList
            data={days}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={dateKeyExtractor}
            contentContainerStyle={styles.strip}
            renderItem={renderDateStripItem}
          />
        </View>

        {/* Month label */}
        <Text style={styles.monthLabel}>
          {formatMonthYear(selectedDate)}
        </Text>

        {/* Calendar grid */}
        <View
          style={[
            styles.calCard,
            {
              marginHorizontal: calendarLayout.marginHorizontal,
              padding: calendarLayout.padding,
            },
          ]}
        >
          {/* Weekday header row */}
          <View style={styles.calRow}>
            {dayLabels.map((d) => (
              <View key={d} style={styles.calCell}>
                <Text
                  style={styles.calWeekday}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>
          {/* Date rows */}
          {(() => {
            const offset = days[0].getDay();
            const allCells: (Date | null)[] = [
              ...Array.from({ length: offset }, () => null),
              ...days,
            ];
            const rows: (Date | null)[][] = [];
            for (let i = 0; i < allCells.length; i += 7) {
              rows.push(allCells.slice(i, i + 7));
            }
            return rows.map((row, ri) => (
              <View key={`row-${ri}`} style={styles.calRow}>
                {row.map((d, ci) => {
                  if (!d) return <View key={`empty-${ri}-${ci}`} style={styles.calCell} />;
                  const dateStr = toLocalDisplayDate(d);
                  const active = dateStr === selected;
                  const isOutsideStartMonth = d.getMonth() !== firstSelectableDate.getMonth();
                  return (
                    <Pressable
                      key={dateStr}
                      accessibilityRole="button"
                      accessibilityLabel={t('booking.datePicker.dateAccessibility', {
                        date: dateStr,
                      })}
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [
                        styles.calCell,
                        active && styles.calCellActive,
                        pressed ? styles.calCellPressed : null,
                      ]}
                      onPress={() => setSelected(dateStr)}
                    >
                      <Text
                        style={[
                          styles.calCellText,
                          active && styles.calCellTextActive,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        {isOutsideStartMonth ? `${d.getDate()}/${d.getMonth() + 1}` : d.getDate()}
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
        </ScrollView>

        {/* Confirm */}
        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          onLayout={handleFooterLayout}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.datePicker.confirmAccessibility', { date: selected })}
            style={({ pressed }) => [styles.confirmBtn, pressed ? styles.pressed : null]}
            onPress={onConfirm}
          >
            <CalendarBlank size={18} color={theme.colors.textInverse} />
            <Text style={styles.confirmText} numberOfLines={2}>
              {t('booking.datePicker.confirm', { date: selected })}
            </Text>
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
  headerCompact: {
    paddingHorizontal: spacing.md,
  },
  backBtn: {
    ...theme.components.headerButton,
    width: 44,
    height: 44,
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
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  stripCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  stripCardCompact: {
    marginHorizontal: spacing.md,
  },
  strip: {
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dayItem: {
    width: 64,
    minHeight: 88,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
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
    maxWidth: '100%',
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
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
    width: '100%',
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
    width: '100%',
    textAlign: 'center',
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  calCellTextActive: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
  },
  footer: {
    ...theme.components.actionBar,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...theme.components.primaryButton,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  confirmText: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
    textAlign: 'center',
  },
});
