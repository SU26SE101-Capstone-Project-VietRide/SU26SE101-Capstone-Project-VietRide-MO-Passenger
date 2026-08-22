/**
 * ItemPicker — Generic searchable list picker.
 *
 * Dùng chung cho:
 *  - Booking: chọn thành phố đi/đến (From/To)
 *  - Parcel: chọn trạm gửi/nhận (Station)
 *
 * Props: items, renderItem, onSelect, title, searchPlaceholder, initialQuery
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
  onBack: () => void;
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
  onBack,
  searchPlaceholder,
  initialQuery = '',
  searchBy,
}: ItemPickerProps<T>): React.JSX.Element {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchBy) return items;
    return items.filter((item) => searchBy(item, q));
  }, [items, query, searchBy]);

  const renderListItem = useCallback(
    ({ item }: ListRenderItemInfo<T>) => (
      <PickerRow item={item} renderContent={renderItem} onSelect={onSelect} />
    ),
    [onSelect, renderItem],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <MagnifyingGlass size={16} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={renderListItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>{t('common.noResults')}</Text>
        }
      />
    </SafeAreaView>
  );
}

interface PickerRowProps<T> {
  item: T;
  renderContent: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
}

function PickerRow<T>({
  item,
  renderContent,
  onSelect,
}: PickerRowProps<T>): React.JSX.Element {
  const handlePress = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={pickerRowStyle}
    >
      {renderContent(item)}
    </Pressable>
  );
}

const pickerRowStyle = {
  minHeight: 44,
  minWidth: 0,
  justifyContent: 'center' as const,
};

const createStyles = (theme: AppTheme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  headerButton: {
    ...theme.components.headerButton,
    width: 44,
    height: 44,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  headerSpacer: { width: 44 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    height: 44, borderRadius: borderRadius.lg,
    ...theme.components.field,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
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
