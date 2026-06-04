/** CityPicker — chọn thành phố (dùng cho From và To).
 * Chọn xong set vào Zustand store rồi goBack về BusSearchScreen.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ArrowLeft, MapPin } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'CityPicker'>;

interface City {
  name: string;
  region?: string;
}

const CITIES: City[] = [
  { name: 'Hanoi', region: 'North' },
  { name: 'Ho Chi Minh City', region: 'South' },
  { name: 'Da Lat', region: 'Central Highlands' },
  { name: 'Nha Trang', region: 'Central' },
  { name: 'Da Nang', region: 'Central' },
  { name: 'Hai Phong', region: 'North' },
  { name: 'Sapa', region: 'North' },
  { name: 'Hue', region: 'Central' },
  { name: 'Vung Tau', region: 'South' },
  { name: 'Can Tho', region: 'Mekong Delta' },
  { name: 'Phu Quoc', region: 'South' },
  { name: 'Quy Nhon', region: 'Central' },
];

export function CityPickerScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { searchParams, setSearchParams } = useBookingStore();
  const route = navigation.getState().routes;
  const lastParams = (route[route.length - 1]?.params ?? {}) as { mode?: 'from' | 'to' };
  const mode = lastParams.mode ?? 'from';

  const prefill = mode === 'from' ? searchParams.from : searchParams.to;
  const [query, setQuery] = useState(prefill || '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const onSelect = (cityName: string) => {
    if (mode === 'from') {
      setSearchParams({ from: cityName });
    } else {
      setSearchParams({ to: cityName });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'from' ? 'Departure City' : 'Destination City'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchBox}>
        <MapPin size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => onSelect(item.name)}
            activeOpacity={0.7}
          >
            <MapPin size={16} color={colors.primary} />
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.region ? <Text style={styles.itemRegion}>{item.region}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No cities found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    padding: 0,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemTextWrap: { flex: 1 },
  itemName: { fontFamily: fontFamilies.medium, fontSize: fontSizes.md, color: colors.textPrimary },
  itemRegion: { fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 2 },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
