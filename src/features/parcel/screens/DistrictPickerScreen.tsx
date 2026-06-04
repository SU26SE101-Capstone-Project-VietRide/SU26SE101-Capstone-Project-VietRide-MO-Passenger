/** DistrictPicker — chọn quận/huyện cho Parcel flow.
 * Giống pattern CityPicker: nhận `city` qua route params, lọc districts
 * tương ứng, chọn xong set vào Parcel store rồi goBack.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ArrowLeft, MapPin } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useParcelStore } from '../store/useParcelStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { ParcelStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<ParcelStackParamList, 'DistrictPicker'>;

const DISTRICTS: Record<string, string[]> = {
  'Ho Chi Minh City': ['Binh Thanh District', 'District 1', 'District 3', 'District 5', 'District 10'],
  Sapa: ['Sapa Town', 'Muong Hoa Valley', 'Ta Van Village', 'Lao Chai Village'],
  'Da Lat': ['Ward 1', 'Ward 3', 'Ward 10', 'Tuyen Lam Lake Area'],
  'Ha Noi': ['Hoan Kiem District', 'Ba Dinh District', 'Tay Ho District', 'Cau Giay District'],
  'Da Nang': ['Hai Chau District', 'Thanh Khe District', 'Son Tra District', 'Ngu Hanh Son District'],
  'Nha Trang': ['Loc Tho Ward', 'Vinh Nguyen Ward', 'Vinh Hiep Ward', 'Phuoc Long Ward'],
  'Hai Phong': ['Hong Bang District', 'Ngo Quyen District', 'Le Chan District', 'Kien An District'],
  Hue: ['Hue City', 'Huong Thuy Town', 'Huong Tra Town', 'Phong Dien District'],
  'Vung Tau': ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Long Son Commune'],
  'Can Tho': ['Cai Rang District', 'Ninh Kieu District', 'Binh Thuy District', 'Thot Not District'],
  'Phu Quoc': ['Duong Dong Town', 'An Thoi Town', 'Ham Ninh Commune', 'Cua Duong Commune'],
  'Quy Nhon': ['Quy Nhon City', 'An Nhon Town', 'Tuy Phuoc District', 'Phu Cat District'],
};

export function DistrictPicker(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { toCity, toDistrict, setToDistrict } = useParcelStore();
  const route = navigation.getState().routes;
  const lastParams = (route[route.length - 1]?.params ?? {}) as { city?: string };
  const city = lastParams.city ?? toCity;

  const prefill = toDistrict !== 'Select District' ? toDistrict : (DISTRICTS[city]?.[0] ?? '');
  const [query, setQuery] = useState(prefill || '');

  const allDistricts = useMemo(() => DISTRICTS[city] ?? [], [city]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allDistricts;
    return allDistricts.filter((d) => d.toLowerCase().includes(q));
  }, [query, allDistricts]);

  const onSelect = (district: string) => {
    setToDistrict(district);
    navigation.goBack();
  };

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select District — {city}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchBox}>
        <MapPin size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search district..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const active = item === toDistrict;
          return (
            <TouchableOpacity
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <MapPin size={16} color={active ? colors.textInverse : colors.primary} />
              <View style={styles.itemTextWrap}>
                <Text style={[styles.itemName, active && styles.itemNameActive]}>{item}</Text>
              </View>
              {active && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No districts found for this city</Text>}
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
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemActive: {
    backgroundColor: colors.primary,
    borderBottomColor: colors.primary,
  },
  itemTextWrap: { flex: 1 },
  itemName: { fontFamily: fontFamilies.medium, fontSize: fontSizes.md, color: colors.textPrimary },
  itemNameActive: { color: colors.textInverse, fontFamily: fontFamilies.bold },
  checkMark: { fontFamily: fontFamilies.bold, fontSize: fontSizes.md, color: colors.textInverse },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
