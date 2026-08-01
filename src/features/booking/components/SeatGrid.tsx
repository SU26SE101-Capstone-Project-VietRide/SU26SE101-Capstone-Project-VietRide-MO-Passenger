/**
 * SeatGrid - responsive, deck-aware bus seat map.
 *
 * Layout metadata is normalized only when the backend seat map changes. Local
 * selection stays separate so pressing one seat does not rebuild every row.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SteeringWheel } from 'phosphor-react-native';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { Seat, SeatRow } from '../types';

interface SeatGridProps {
  seatMap: SeatRow[];
  selectedSeats: Seat[];
  onSeatPress: (seatId: string) => void;
}

interface NormalizedRow {
  key: string;
  label: string;
  rowNumber: number;
  seats: Seat[];
  seatsByColumn: ReadonlyMap<number, Seat>;
  columns: number[];
  order: number;
}

interface DeckGroup {
  deck: number;
  rows: NormalizedRow[];
  columns: number[];
  seatIds: ReadonlySet<string>;
  availableCount: number;
}

const MAX_CARD_WIDTH = 480;
const CARD_PADDING = spacing.md;
const ROW_AXIS_WIDTH = 40;
const DEFAULT_AISLE_WIDTH = 18;
const SEAT_GAP = spacing.sm;
const MIN_SEAT_SIZE = 34;
const MAX_SEAT_SIZE = 58;
const AXIS_HEIGHT = 28;

function useSeatGridStyles() {
  return useThemedStyles(createStyles);
}

type SeatGridStyles = ReturnType<typeof useSeatGridStyles>;

const getDeckLetter = (deck: number): string => {
  if (deck > 0 && deck <= 26) {
    return String.fromCharCode(64 + deck);
  }

  return deck.toString();
};

const getAisleAfterColumn = (columns: number[]): number | null => {
  if (columns.length <= 1) {
    return null;
  }

  if (columns.length <= 3) {
    return columns[0];
  }

  return columns[Math.ceil(columns.length / 2) - 1];
};

const getContinuousColumns = (columns: Set<number>): number[] => {
  const values = Array.from(columns)
    .filter(column => column > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return [1];
  }

  const min = values[0];
  const max = values[values.length - 1];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
};

const normalizeRow = (
  row: SeatRow,
  order: number,
): NormalizedRow & { deck: number } => {
  const deck =
    row.deck ?? row.leftSeats[0]?.deck ?? row.rightSeats[0]?.deck ?? 1;
  const parsedRowNumber = Number.parseInt(row.rowLabel, 10);
  const fallbackRowNumber = Number.isNaN(parsedRowNumber)
    ? order + 1
    : parsedRowNumber;
  const rowNumber =
    row.rowNumber ??
    row.leftSeats[0]?.row ??
    row.rightSeats[0]?.row ??
    fallbackRowNumber;

  const leftSeats = row.leftSeats.map((seat, index) => ({
    ...seat,
    row: seat.row ?? rowNumber,
    col: seat.col ?? index + 1,
    deck: seat.deck ?? deck,
  }));
  const rightSeats = row.rightSeats.map((seat, index) => ({
    ...seat,
    row: seat.row ?? rowNumber,
    col: seat.col ?? row.leftSeats.length + index + 1,
    deck: seat.deck ?? deck,
  }));
  const seats = [...leftSeats, ...rightSeats].sort((a, b) => {
    const columnDelta = (a.col ?? 0) - (b.col ?? 0);
    return columnDelta || a.label.localeCompare(b.label);
  });
  const columnSet = new Set<number>(row.columns ?? []);
  const seatsByColumn = new Map<number, Seat>();

  seats.forEach(seat => {
    if (seat.col != null && seat.col > 0) {
      columnSet.add(seat.col);
      seatsByColumn.set(seat.col, seat);
    }
  });

  return {
    key: `${deck}:${row.rowLabel}:${order}`,
    label:
      row.rowNumber != null
        ? row.rowNumber.toString().padStart(2, '0')
        : row.rowLabel,
    rowNumber,
    deck,
    seats,
    seatsByColumn,
    columns: getContinuousColumns(columnSet),
    order,
  };
};

const buildDeckGroups = (seatMap: SeatRow[]): DeckGroup[] => {
  const groups = new Map<
    number,
    {
      rows: NormalizedRow[];
      columns: Set<number>;
      seatIds: Set<string>;
      availableCount: number;
    }
  >();

  seatMap.forEach((row, index) => {
    const normalized = normalizeRow(row, index);
    const group = groups.get(normalized.deck) ?? {
      rows: [],
      columns: new Set<number>(),
      seatIds: new Set<string>(),
      availableCount: 0,
    };

    group.rows.push(normalized);
    normalized.columns.forEach(column => group.columns.add(column));
    normalized.seats.forEach(seat => {
      group.seatIds.add(seat.id);
      if (seat.status !== 'sold') {
        group.availableCount += 1;
      }
    });
    groups.set(normalized.deck, group);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([deck, group]) => ({
      deck,
      rows: group.rows.sort(
        (a, b) => a.rowNumber - b.rowNumber || a.order - b.order,
      ),
      columns: getContinuousColumns(group.columns),
      seatIds: group.seatIds,
      availableCount: group.availableCount,
    }));
};

interface DeckButtonProps {
  deck: number;
  isActive: boolean;
  onSelect: (deck: number) => void;
  styles: SeatGridStyles;
}

const DeckButton = memo(function DeckButtonComponent({
  deck,
  isActive,
  onSelect,
  styles,
}: DeckButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onSelect(deck), [deck, onSelect]);
  const deckName = deck === 1
    ? t('booking.seatMap.lowerDeck')
    : deck === 2
      ? t('booking.seatMap.upperDeck')
      : t('booking.seatMap.deckName', { deck: getDeckLetter(deck) });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={deckName}
      accessibilityState={{ selected: isActive }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.deckButton,
        isActive ? styles.deckButtonActive : null,
        pressed ? styles.deckButtonPressed : null,
      ]}
    >
      <Text
        style={[
          styles.deckButtonText,
          isActive ? styles.deckButtonTextActive : null,
        ]}
      >
        {getDeckLetter(deck)}
      </Text>
    </Pressable>
  );
});

interface SeatButtonProps {
  id: string;
  label: string;
  isSelected: boolean;
  isSold: boolean;
  size: number;
  onPress: (seatId: string) => void;
  styles: SeatGridStyles;
}

const SeatButton = memo(function SeatButtonComponent({
  id,
  label,
  isSelected,
  isSold,
  size,
  onPress,
  styles,
}: SeatButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onPress(id), [id, onPress]);
  const seatStatus = isSold
    ? t('booking.seats.unavailable')
    : isSelected
      ? t('booking.seats.selected')
      : t('booking.seats.available');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('booking.seatMap.seatAccessibility', {
        seat: label,
        status: seatStatus,
      })}
      accessibilityState={{ disabled: isSold, selected: isSelected }}
      disabled={isSold}
      hitSlop={6}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.seat,
        { width: size, height: size },
        !isSelected && !isSold ? styles.seatAvailable : null,
        isSelected ? styles.seatSelected : null,
        isSold ? styles.seatSold : null,
        pressed && !isSold ? styles.seatPressed : null,
      ]}
    >
      <View
        style={[
          styles.seatPillow,
          isSelected ? styles.seatPillowSelected : null,
          isSold ? styles.seatPillowSold : null,
        ]}
      />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        style={[
          styles.seatLabel,
          size < 40 ? styles.seatLabelCompact : null,
          isSelected ? styles.seatLabelSelected : null,
          isSold ? styles.seatLabelSold : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

interface AisleSlotProps {
  height: number;
  width: number;
  styles: SeatGridStyles;
}

const AisleSlot = memo(function AisleSlotComponent({
  height,
  width,
  styles,
}: AisleSlotProps): React.JSX.Element {
  return (
    <View style={[styles.aisleColumn, { width, height }]}>
      <View style={styles.aisleTrack} />
    </View>
  );
});

interface SeatRowViewProps {
  row: NormalizedRow;
  columns: number[];
  aisleAfterColumn: number | null;
  aisleWidth: number;
  seatSize: number;
  selectedSeatIds: ReadonlySet<string>;
  onSeatPress: (seatId: string) => void;
  styles: SeatGridStyles;
}

const SeatRowView = memo(
  function SeatRowViewComponent({
    row,
    columns,
    aisleAfterColumn,
    aisleWidth,
    seatSize,
    selectedSeatIds,
    onSeatPress,
    styles,
  }: SeatRowViewProps): React.JSX.Element {
    const { t } = useTranslation();
    return (
      <View style={styles.seatRow}>
        <View style={[styles.rowBadge, { height: seatSize }]}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            numberOfLines={1}
            style={styles.rowBadgeText}
          >
            {t('booking.seatMap.rowCode', { row: row.label })}
          </Text>
        </View>

        {columns.map(column => {
          const seat = row.seatsByColumn.get(column);

          return (
            <React.Fragment key={`${row.key}-${column}`}>
              {seat ? (
                <SeatButton
                  id={seat.id}
                  isSelected={selectedSeatIds.has(seat.id)}
                  isSold={seat.status === 'sold'}
                  label={seat.label}
                  onPress={onSeatPress}
                  size={seatSize}
                  styles={styles}
                />
              ) : (
                <View
                  style={[
                    styles.emptySlot,
                    { width: seatSize, height: seatSize },
                  ]}
                />
              )}
              {column === aisleAfterColumn ? (
                <AisleSlot
                  height={seatSize}
                  width={aisleWidth}
                  styles={styles}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    );
  },
  (previous, next) => {
    if (
      previous.row !== next.row ||
      previous.columns !== next.columns ||
      previous.aisleAfterColumn !== next.aisleAfterColumn ||
      previous.aisleWidth !== next.aisleWidth ||
      previous.seatSize !== next.seatSize ||
      previous.onSeatPress !== next.onSeatPress ||
      previous.styles !== next.styles
    ) {
      return false;
    }

    return next.row.seats.every(
      seat =>
        previous.selectedSeatIds.has(seat.id) ===
        next.selectedSeatIds.has(seat.id),
    );
  },
);

export function SeatGrid({
  seatMap,
  selectedSeats,
  onSeatPress,
}: SeatGridProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useSeatGridStyles();
  const { width } = useWindowDimensions();
  const groups = useMemo(() => buildDeckGroups(seatMap), [seatMap]);
  const [requestedDeck, setRequestedDeck] = useState<number | null>(null);
  const activeGroup =
    groups.find(group => group.deck === requestedDeck) ?? groups[0];
  const columns = activeGroup?.columns ?? [];
  const aisleAfterColumn = getAisleAfterColumn(columns);
  const aisleWidth = aisleAfterColumn == null ? 0 : DEFAULT_AISLE_WIDTH;
  const selectedSeatIds = useMemo(
    () => new Set(selectedSeats.map(seat => seat.id)),
    [selectedSeats],
  );
  const selectedSeatLabel = useMemo(
    () => selectedSeats.map(seat => seat.label).join(', '),
    [selectedSeats],
  );
  const activeSelectedCount = activeGroup
    ? selectedSeats.reduce(
        (count, seat) => count + Number(activeGroup.seatIds.has(seat.id)),
        0,
      )
    : 0;
  const availableCount = activeGroup
    ? Math.max(0, activeGroup.availableCount - activeSelectedCount)
    : 0;
  const visibleChildren =
    columns.length + 1 + (aisleAfterColumn == null ? 0 : 1);
  const gapCount = Math.max(0, visibleChildren - 1);
  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(0, width - spacing.xxl));
  const innerWidth = Math.max(0, cardWidth - CARD_PADDING * 2);
  const seatSize = useMemo(() => {
    if (columns.length === 0) {
      return MAX_SEAT_SIZE;
    }

    const availableWidth =
      innerWidth - ROW_AXIS_WIDTH - aisleWidth - gapCount * SEAT_GAP;
    return Math.max(
      MIN_SEAT_SIZE,
      Math.min(MAX_SEAT_SIZE, Math.floor(availableWidth / columns.length)),
    );
  }, [aisleWidth, columns.length, gapCount, innerWidth]);
  const matrixWidth =
    ROW_AXIS_WIDTH +
    columns.length * seatSize +
    aisleWidth +
    gapCount * SEAT_GAP;
  const handleDeckSelect = useCallback(
    (deck: number) => setRequestedDeck(deck),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.deckIdentity}>
          <View
            accessible
            accessibilityLabel={t('booking.seatMap.frontOfVehicle')}
            style={styles.frontIcon}
          >
            <SteeringWheel
              size={19}
              weight="duotone"
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.deckCopy}>
            <Text style={styles.deckEyebrow}>
              {activeGroup
                ? t('booking.seatMap.deckEyebrow', {
                  deck: getDeckLetter(activeGroup.deck),
                })
                : t('booking.seatMap.title')}
            </Text>
            <Text numberOfLines={1} style={styles.deckTitle}>
              {activeGroup
                ? (activeGroup.deck === 1
                  ? t('booking.seatMap.lowerDeck')
                  : activeGroup.deck === 2
                    ? t('booking.seatMap.upperDeck')
                    : t('booking.seatMap.deckName', {
                      deck: getDeckLetter(activeGroup.deck),
                    }))
                : t('booking.seatMap.noDeck')}
            </Text>
          </View>
        </View>

        {groups.length > 0 ? (
          <View accessibilityRole="tablist" style={styles.deckSwitcher}>
            {groups.map(group => (
              <DeckButton
                key={group.deck}
                deck={group.deck}
                isActive={activeGroup?.deck === group.deck}
                onSelect={handleDeckSelect}
                styles={styles}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.selectedStat}>
          <Text style={styles.statLabel}>
            {t('booking.seatMap.selectedCount', { count: selectedSeats.length })}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={1}
            style={
              selectedSeatLabel ? styles.statValue : styles.statPlaceholder
            }
          >
            {selectedSeatLabel || t('common.none')}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.availableStat}>
          <Text style={styles.statLabel}>{t('booking.seatMap.available')}</Text>
          <Text style={styles.availableValue}>{availableCount}</Text>
        </View>
      </View>

      {activeGroup ? (
        <View style={[styles.matrix, { width: matrixWidth }]}>
          <View style={styles.axisRow}>
            <View style={styles.rowAxisSlot}>
              <Text style={styles.axisLabel}>{t('booking.seatMap.rowAxis')}</Text>
            </View>
            {columns.map(column => (
              <React.Fragment key={`axis-${column}`}>
                <View style={[styles.columnAxisSlot, { width: seatSize }]}>
                  <Text style={styles.axisLabel}>
                    {t('booking.seatMap.columnCode', { column })}
                  </Text>
                </View>
                {column === aisleAfterColumn ? (
                  <AisleSlot
                    height={AXIS_HEIGHT}
                    width={aisleWidth}
                    styles={styles}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.rows}>
            {activeGroup.rows.map(row => (
              <SeatRowView
                key={row.key}
                aisleAfterColumn={aisleAfterColumn}
                aisleWidth={aisleWidth}
                columns={columns}
                onSeatPress={onSeatPress}
                row={row}
                seatSize={seatSize}
                selectedSeatIds={selectedSeatIds}
                styles={styles}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t('booking.seatMap.unavailable')}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    ...theme.components.card,
    width: '100%',
    maxWidth: MAX_CARD_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
    paddingHorizontal: CARD_PADDING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  deckIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  frontIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
  },
  deckCopy: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xxs,
  },
  deckEyebrow: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  deckTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  deckSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
  },
  deckButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
  },
  deckButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  deckButtonPressed: {
    opacity: 0.8,
  },
  deckButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  deckButtonTextActive: {
    color: theme.colors.textInverse,
  },
  statsRow: {
    minHeight: 62,
    marginHorizontal: -CARD_PADDING,
    paddingHorizontal: CARD_PADDING,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
  },
  selectedStat: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xs,
  },
  availableStat: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: theme.colors.divider,
  },
  statLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  statValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  statPlaceholder: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textDisabled,
  },
  availableValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  matrix: {
    alignSelf: 'center',
    paddingTop: spacing.md,
  },
  axisRow: {
    height: AXIS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SEAT_GAP,
  },
  rowAxisSlot: {
    width: ROW_AXIS_WIDTH,
    height: AXIS_HEIGHT,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  columnAxisSlot: {
    height: AXIS_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  rows: {
    gap: spacing.sm,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SEAT_GAP,
  },
  rowBadge: {
    width: ROW_AXIS_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
    flexShrink: 0,
  },
  rowBadgeText: {
    maxWidth: ROW_AXIS_WIDTH - spacing.xs,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  aisleColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aisleTrack: {
    width: 1,
    height: '76%',
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textTertiary,
    opacity: 0.28,
  },
  seat: {
    position: 'relative',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
  },
  seatAvailable: {
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.border,
  },
  seatSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  seatSold: {
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderColor: theme.colors.divider,
    opacity: 0.58,
  },
  seatPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.97 }],
  },
  seatPillow: {
    position: 'absolute',
    top: 7,
    left: 9,
    right: 9,
    height: 6,
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous',
  },
  seatPillowSelected: {
    backgroundColor: theme.effects.glassHighlight,
  },
  seatPillowSold: {
    backgroundColor: theme.colors.divider,
  },
  seatLabel: {
    maxWidth: '90%',
    marginTop: spacing.sm,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  seatLabelCompact: {
    fontSize: fontSizes.xs,
  },
  seatLabelSelected: {
    color: theme.colors.textInverse,
  },
  seatLabelSold: {
    color: theme.colors.textDisabled,
  },
  emptySlot: {
    flexShrink: 0,
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
  },
} as const);
