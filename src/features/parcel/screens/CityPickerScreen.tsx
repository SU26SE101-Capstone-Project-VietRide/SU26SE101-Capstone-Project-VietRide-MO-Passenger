/** ParcelCityPicker — chọn thành phố cho Parcel flow.
 * UI giống hệt Booking CityPicker, nhưng ghi vào Parcel store.
 * Chung logic/UI, tách file để mỗi feature tự quản lý store của mình.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ArrowLeft, MapPin } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useParcelStore } from '../store/useParcelStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { ParcelStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<ParcelStackParamList, 'CityPicker'>;

interface City {
  name: string;
  region?: string;
}

const CITIES: City[] = [
  { name: 'Ho Chi Minh City', region: 'South' },
  { name: 'Sapa', region: 'North' },
  { name: 'Da Lat', region: 'Central Highlands' },
  { name: 'Ha Noi', region: 'North' },
  { name: 'Da Nang', region: 'Central' },
  { name: 'Nha Trang', region: 'Central' },
  { name: 'Hai Phong', region: 'North' },
  { name: 'Hue', region: 'Central' },
  { name: 'Vung Tau', region: 'South' },
  { name: 'Can Tho', region: 'Mekong Delta' },
  { name: 'Phu Quoc', region: 'South' },
  { name: 'Quy Nhon', region: 'Central' },
];

export function ParcelCityPicker(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { fromCity, toCity, setFromCity, setToCity } = useParcelStore();
  const route = navigation.getState().routes;
  const lastParams = (route[route.length - 1]?.params ?? {}) as { mode?: 'from' | 'to' };
  const mode = lastParams.mode ?? 'from';

  const prefill = mode === 'from' ? fromCity : toCity;
  const [query, setQuery] = useState(prefill || '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const onSelect = (cityName: string) => {
    if (mode === 'from') {
      setFromCity(cityName);
    } else {
      setToCity(cityName);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'from' ? 'Origin City' : 'Destination City'}</Text>
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
