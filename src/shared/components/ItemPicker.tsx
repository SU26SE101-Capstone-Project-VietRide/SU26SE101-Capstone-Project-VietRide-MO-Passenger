/**
 * ItemPicker — Generic searchable list picker.
 *
 * Dùng chung cho:
 *  - Booking: chọn thành phố đi/đến (From/To)
 *  - Parcel: chọn trạm gửi/nhận (Station)
 *
 * Props: items, renderItem, onSelect, title, searchPlaceholder, initialQuery
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface ItemPickerProps<T> {
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  searchPlaceholder?: string;
  initialQuery?: string;
  searchBy?: (item: T, q: string) => boolean;
}

export function ItemPicker<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  onSelect,
  searchPlaceholder = 'Search...',
  initialQuery = '',
  searchBy,
}: ItemPickerProps<T>): React.JSX.Element {
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchBy) return items;
    return items.filter((item) => searchBy(item, q));
  }, [items, query, searchBy]);

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => (onSelect as any)('__BACK__')} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchBox}>
        <MagnifyingGlass size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={() => null}
        ListEmptyComponent={
          <Text style={styles.empty}>Nothing found</Text>
        }
      />
      {filtered.map((item, idx) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderItem(item)}
        </React.Fragment>
      ))}
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
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    height: 44, borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.divider,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: fontSizes.md, color: colors.textPrimary, padding: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  empty: {
    fontFamily: fontFamilies.regular, fontSize: fontSizes.md,
    color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl,
  },
});
