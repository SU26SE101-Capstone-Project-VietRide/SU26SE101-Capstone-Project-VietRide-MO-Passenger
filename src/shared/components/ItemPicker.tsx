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
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchBy) return items;
    return items.filter((item) => searchBy(item, q));
  }, [items, query, searchBy]);

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => (onSelect as any)('__BACK__')} style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <MagnifyingGlass size={16} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.colors.textTertiary}
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
      {filtered.map((item) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderItem(item)}
        </React.Fragment>
      ))}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  headerButton: {
    ...theme.components.headerButton,
    width: 38,
    height: 38,
  },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: theme.colors.textPrimary },
  headerSpacer: { width: 38 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    height: 44, borderRadius: borderRadius.lg,
    ...theme.components.field,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: fontSizes.md, color: theme.colors.textPrimary, padding: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  empty: {
    fontFamily: fontFamilies.regular, fontSize: fontSizes.md,
    color: theme.colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
