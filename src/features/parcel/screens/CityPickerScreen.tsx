/** ParcelCityPicker — chọn thành phố cho Parcel flow.
 * UI giống hệt Booking CityPicker, nhưng ghi vào Parcel store.
 * Chung logic/UI, tách file để mỗi feature tự quản lý store của mình.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import { ArrowLeft, MapPin } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useParcelStore } from '../store/useParcelStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { ParcelStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{mode === 'from' ? 'Origin City' : 'Destination City'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <MapPin size={16} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city..."
          placeholderTextColor={theme.colors.textTertiary}
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
          <Pressable
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
            onPress={() => onSelect(item.name)}
          >
            <MapPin size={16} color={theme.colors.primary} />
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.region ? <Text style={styles.itemRegion}>{item.region}</Text> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No cities found</Text>}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerButton: {
    ...theme.components.headerButton,
    width: 38,
    height: 38,
  },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: theme.colors.textPrimary },
  headerSpacer: { width: 38 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  itemTextWrap: { flex: 1 },
  itemName: { fontFamily: fontFamilies.medium, fontSize: fontSizes.md, color: theme.colors.textPrimary },
  itemRegion: { fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, color: theme.colors.textTertiary, marginTop: 2 },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
