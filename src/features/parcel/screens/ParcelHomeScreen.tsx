import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  MapPin,
  CaretDown,
  ArrowRight,
  ArrowLeft,
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
import type { RootStackParamList } from '@app/navigation/types';

// Static asset imports to comply with security/lazy-loading bundling best practices
const catMascotImage = require('../../../assets/images/image 1.png');

// Mock list of cities and districts for selection
const CITIES = ['Ho Chi Minh City', 'Sapa', 'Da Lat', 'Ha Noi'];
const DISTRICTS: Record<string, string[]> = {
  'Ho Chi Minh City': ['Binh Thanh District', 'District 1', 'District 3', 'District 5', 'District 10'],
  Sapa: ['Sapa Town', 'Muong Hoa Valley', 'Ta Van Village', 'Lao Chai Village'],
  'Da Lat': ['Ward 1', 'Ward 3', 'Ward 10', 'Tuyen Lam Lake Area'],
  'Ha Noi': ['Hoan Kiem District', 'Ba Dinh District', 'Tay Ho District', 'Cau Giay District'],
};



type ParcelHomeNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelList'>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function ParcelHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<ParcelHomeNavProp>();
const rootNav = useNavigation<RootNavProp>();

  // State for selections
  const [fromCity, setFromCity] = useState('Ho Chi Minh City');
  const [toCity, setToCity] = useState('Sapa');
  const [toDistrict, setToDistrict] = useState('Select District');

  // Modal selectors states
  const [selectorType, setSelectorType] = useState<'from' | 'toCity' | 'toDistrict' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (item: string) => {
    if (selectorType === 'from') {
      setFromCity(item);
    } else if (selectorType === 'toCity') {
      setToCity(item);
      // Reset district when city changes
      setToDistrict(DISTRICTS[item]?.[0] || 'Select District');
    } else if (selectorType === 'toDistrict') {
      setToDistrict(item);
    }
    setModalVisible(false);
    setSelectorType(null);
  };

  const getSelectorData = () => {
    if (selectorType === 'from' || selectorType === 'toCity') {
      return CITIES;
    }
    if (selectorType === 'toDistrict') {
      return DISTRICTS[toCity] || [];
    }
    return [];
  };

  const handleStartShipment = () => {
    navigation.navigate('CreateParcel');
  };

  const handleTrackShipment = (parcelId: string) => {
    navigation.navigate('ParcelTracking', { parcelId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared Reusable Profile Header */}
      <ProfileHeader onNotificationPress={() => rootNav.navigate('Main', { screen: 'Notification' })} />

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

          {/* From Selector */}
          <Text style={styles.fieldLabel}>From</Text>
          <TouchableOpacity
            style={styles.selectorField}
            onPress={() => {
              setSelectorType('from');
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MapPin size={20} color={colors.primary} weight="bold" />
            <Text style={styles.selectorText}>
              {fromCity === 'Ho Chi Minh City' ? 'Select Origin City/District' : fromCity}
            </Text>
            <CaretDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* To Selector */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>To</Text>
          <View style={styles.toRow}>
            <TouchableOpacity
              style={[styles.selectorField, { flex: 1 }]}
              onPress={() => {
                setSelectorType('toCity');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <PaperPlaneTilt size={18} color={colors.primary} weight="bold" />
              <Text style={styles.selectorText} numberOfLines={1}>
                {toCity === 'Sapa' ? 'Select City' : toCity}
              </Text>
              <CaretDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorField, { flex: 1.2 }]}
              onPress={() => {
                setSelectorType('toDistrict');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <PaperPlaneTilt size={18} color={colors.primary} weight="bold" />
              <Text style={styles.selectorText} numberOfLines={1}>
                {toDistrict === 'Select District' ? 'Select District' : toDistrict}
              </Text>
              <CaretDown size={14} color={colors.textSecondary} />
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

      {/* Modal Selector Popup */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
          >
            <Text style={styles.modalTitle}>
              {selectorType === 'from'
                ? 'Select Origin City'
                : selectorType === 'toCity'
                  ? 'Select Destination City'
                  : 'Select District'}
            </Text>
            <FlatList
              data={getSelectorData()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected =
                  (selectorType === 'from' && item === fromCity) ||
                  (selectorType === 'toCity' && item === toCity) ||
                  (selectorType === 'toDistrict' && item === toDistrict);

                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextSelected
                    ]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Check size={18} color={colors.primary} weight="bold" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4F3', // Soft, premium light baby blue/minty canvas matching screenshot
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
    borderRadius: 28, // super-rounded 28px standard squircle
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
    textTransform: 'none',
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16, // 16px soft radius
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
    backgroundColor: '#CEAB00', // Premium golden mustard yellow color matching tertiary guidelines
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
    color: '#3A2E00', // Dark contrast text
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
    backgroundColor: '#3A2E00', // Dark brown/charcoal solid pill
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 32, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    maxHeight: '60%',
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
  },
  modalItemSelected: {
    backgroundColor: 'rgba(42, 193, 188, 0.08)',
  },
  modalItemText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  modalItemTextSelected: {
    fontFamily: fontFamilies.bold,
    color: colors.primary,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: colors.divider,
  },
  closeModalButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
