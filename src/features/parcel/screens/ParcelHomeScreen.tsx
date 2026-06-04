import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  MapPin,
  ArrowRight,
  Gift,
  PlusCircle,
  Truck,
  PaperPlaneTilt,
  Check,
} from 'phosphor-react-native';
import { ProfileHeader } from '@shared/components';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';
import { useParcelStore } from '../store/useParcelStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';

// Static asset imports to comply with security/lazy-loading bundling best practices
const catMascotImage = require('../../../assets/images/image 1.png');

type ParcelHomeNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelList'>;

export function ParcelHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<ParcelHomeNavProp>();
  const user = useAuthStore((state) => state.user);
  const fullName = user?.fullName || 'Viết Thông';
  const { fromCity, toCity, toDistrict, setFromCity, setToCity, setToDistrict } = useParcelStore();

  const handleStartShipment = () => {
    navigation.navigate('CreateParcel');
  };

  const handleTrackShipment = (parcelId: string) => {
    navigation.navigate('ParcelTracking', { parcelId });
  };

  const openCityPicker = (mode: 'from' | 'to') => {
    navigation.navigate('CityPicker', { mode });
  };

  const openDistrictPicker = () => {
    navigation.navigate('DistrictPicker', { city: toCity });
  };

  const displayFrom = fromCity || 'Select Origin City/District';
  const displayTo = toCity || 'Select City';
  const displayDistrict = toDistrict === 'Select District' ? 'Select District' : toDistrict;

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared Reusable Profile Header */}
      <ProfileHeader
  userName={fullName}
  greeting="Xin chào,"
  onNotificationPress={() => {}}
/>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hello Mascot Greeting */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextColumn}>
            <Text style={styles.welcomeTitle}>Hello! 👋</Text>
            <Text style={styles.welcomeSubtitle}>Where are we sending joy today?</Text>
          </View>
          <View style={styles.mascotContainer}>
            <Image
              source={catMascotImage}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Start a Shipment Card */}
        <View style={styles.startShipmentCard}>
          <Text style={styles.startShipmentTitle}>Start a Shipment</Text>

          {/* From Selector — navigate to CityPicker */}
          <Text style={styles.fieldLabel}>From</Text>
          <TouchableOpacity
            style={styles.selectorField}
            onPress={() => openCityPicker('from')}
            activeOpacity={0.8}
          >
            <MapPin size={20} color={colors.primary} weight="bold" />
            <Text style={styles.selectorText}>{displayFrom}</Text>
          </TouchableOpacity>

          {/* To Selector — navigate to CityPicker */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>To</Text>
          <View style={styles.toRow}>
            <TouchableOpacity
              style={[styles.selectorField, { flex: 1 }]}
              onPress={() => openCityPicker('to')}
              activeOpacity={0.8}
            >
              <PaperPlaneTilt size={18} color={colors.primary} weight="bold" />
              <Text style={styles.selectorText} numberOfLines={1}>{displayTo}</Text>
            </TouchableOpacity>

            {/* District Selector — navigate to DistrictPicker */}
            <TouchableOpacity
              style={[styles.selectorField, { flex: 1.2 }]}
              onPress={openDistrictPicker}
              activeOpacity={0.8}
            >
              <PaperPlaneTilt size={18} color={colors.primary} weight="bold" />
              <Text style={styles.selectorText} numberOfLines={1}>{displayDistrict}</Text>
            </TouchableOpacity>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.nextCTAButton}
            onPress={handleStartShipment}
            activeOpacity={0.85}
          >
            <Text style={styles.nextCTAButtonText}>Next</Text>
            <ArrowRight size={18} color={colors.textInverse} weight="bold" />
          </TouchableOpacity>

          {/* Track existing shipment Button */}
          <TouchableOpacity
            style={styles.trackExistingBtn}
            onPress={() => handleTrackShipment('VR-8829')}
            activeOpacity={0.8}
          >
            <Truck size={16} color={colors.textPrimary} weight="bold" style={{ transform: [{ scaleX: -1 }] }} />
            <Text style={styles.trackExistingBtnText}>Track existing shipment</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Shipments Section */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Shipments</Text>
            <TouchableOpacity activeOpacity={0.6}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Shipment Card 1: In Transit */}
          <TouchableOpacity
            style={styles.shipmentCard}
            onPress={() => handleTrackShipment('VR-8829')}
            activeOpacity={0.8}
          >
            <View style={styles.shipmentIconContainer}>
              <Truck size={24} color={colors.primary} weight="bold" />
            </View>
            <View style={styles.shipmentInfo}>
              <View style={styles.shipmentRow}>
                <Text style={styles.shipmentDestination}>To: Da Lat</Text>
                <View style={styles.badgeTransit}>
                  <Text style={styles.textTransit}>In Transit</Text>
                </View>
              </View>
              <Text style={styles.shipmentMeta}>
                Order #VR-8829 • Expected: tomorrow
              </Text>
            </View>
          </TouchableOpacity>

          {/* Shipment Card 2: Delivered */}
          <TouchableOpacity
            style={styles.shipmentCard}
            onPress={() => handleTrackShipment('VR-7741')}
            activeOpacity={0.8}
          >
            <View style={styles.shipmentIconContainer}>
              <Check size={20} color={colors.textTertiary} weight="bold" />
            </View>
            <View style={styles.shipmentInfo}>
              <View style={styles.shipmentRow}>
                <Text style={styles.shipmentDestination}>To: Ho Chi Minh City</Text>
                <View style={styles.badgeDelivered}>
                  <Text style={styles.textDelivered}>Delivered</Text>
                </View>
              </View>
              <Text style={styles.shipmentMeta}>
                Order #VR-7741 • Oct 24, 2023
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Illustration Promo Banner */}
        <View style={styles.promoCard}>
          <View style={styles.promoTextContent}>
            <Text style={styles.promoTitle}>Invite friends,</Text>
            <Text style={styles.promoTitle}>get coins!</Text>
            <Text style={styles.promoDesc}>
              Share your delivery code and get 50,000 VND off your next parcel.
            </Text>
            <TouchableOpacity style={styles.promoButton} activeOpacity={0.8}>
              <Text style={styles.promoButtonText}>Share Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoGiftContainer}>
            <PlusCircle size={64} color="rgba(255, 255, 255, 0.15)" weight="light" style={styles.promoBgCircle} />
            <Gift size={48} color="rgba(255, 255, 255, 0.3)" weight="fill" />
          </View>
        </View>

        {/* Extra spacing at bottom */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingRight: spacing.xs,
  },
  welcomeTextColumn: {
    flex: 1.4,
  },
  welcomeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    color: colors.textPrimary,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  mascotContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mascotImage: {
    width: 96,
    height: 96,
  },
  startShipmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.xxl,
  },
  startShipmentTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  selectorText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  toRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nextCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 48,
    marginTop: spacing.xl,
    gap: spacing.xs,
    ...shadows.sm,
  },
  nextCTAButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  trackExistingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    height: 44,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  trackExistingBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  recentSection: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  viewAllText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  shipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  shipmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shipmentDestination: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  badgeTransit: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDelivered: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textTransit: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.primary,
  },
  textDelivered: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.textTertiary,
  },
  shipmentMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  promoCard: {
    flexDirection: 'row',
    backgroundColor: '#CEAB00',
    borderRadius: 24,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
    position: 'relative',
  },
  promoTextContent: {
    flex: 1.4,
    zIndex: 2,
  },
  promoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: '#3A2E00',
    marginBottom: spacing.xs,
  },
  promoDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: '#4F4000',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  promoButton: {
    backgroundColor: '#3A2E00',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    alignSelf: 'flex-start',
    ...shadows.sm,
  },
  promoButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
  },
  promoGiftContainer: {
    flex: 0.8,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  promoBgCircle: {
    position: 'absolute',
    opacity: 0.15,
  },
});
