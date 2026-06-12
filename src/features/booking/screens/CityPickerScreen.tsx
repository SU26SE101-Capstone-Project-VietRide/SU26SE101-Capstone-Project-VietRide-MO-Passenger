/** CityPicker — chọn thành phố (dùng cho From và To).
 * Chọn xong set vào Zustand store rồi goBack về BusSearchScreen.
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, MapPin, MagnifyingGlass } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
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
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="cityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#cityGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Header with back bubble */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'from' ? 'Departure City' : 'Destination City'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search box */}
        <View style={styles.searchBox}>
          <MagnifyingGlass size={16} color={colors.textTertiary} weight="bold" />
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

        {/* City list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => onSelect(item.name)}
              activeOpacity={0.7}
            >
              <View style={styles.itemIcon}>
                <MapPin size={16} color={colors.primary} weight="fill" />
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.region ? <Text style={styles.itemRegion}>{item.region}</Text> : null}
              </View>
              <View style={styles.itemArrow}>
                <ArrowLeft size={16} color={colors.textTertiary} weight="bold" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No cities found</Text>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E6F4F3',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.divider,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    padding: 0,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  itemRegion: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  itemArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
