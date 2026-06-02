import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Package,
  MapPin,
  CaretDown,
  ArrowRight,
  MagnifyingGlass,
  Gift,
  PlusCircle,
  Truck,
  CheckCircle,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';

// Mock list of cities and districts for selection
const CITIES = ['Ho Chi Minh City', 'Sapa', 'Da Lat', 'Ha Noi'];
const DISTRICTS: Record<string, string[]> = {
  'Ho Chi Minh City': ['Binh Thanh District', 'District 1', 'District 3', 'District 5', 'District 10'],
  Sapa: ['Sapa Town', 'Muong Hoa Valley', 'Ta Van Village', 'Lao Chai Village'],
  'Da Lat': ['Ward 1', 'Ward 3', 'Ward 10', 'Tuyen Lam Lake Area'],
  'Ha Noi': ['Hoan Kiem District', 'Ba Dinh District', 'Tay Ho District', 'Cau Giay District'],
};

// Mock Recent Shipments
const RECENT_SHIPMENTS = [
  {
    id: 'VR-8829',
    toLocation: 'Da Lat',
    status: 'in_transit',
    date: 'Expected: tomorrow',
    price: 85000,
    size: 'medium',
  },
  {
    id: 'VR-7741',
    toLocation: 'Ho Chi Minh City',
    status: 'delivered',
    date: 'Oct 24, 2023',
    price: 35000,
    size: 'small',
  },
];

type ParcelHomeNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelList'>;

export function ParcelHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<ParcelHomeNavProp>();

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
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>VT</Text>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>Viết Thông</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
          <Bell size={22} color={colors.textPrimary} weight="medium" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextColumn}>
            <Text style={styles.welcomeTitle}>Hello! 👋</Text>
            <Text style={styles.welcomeSubtitle}>Where are we sending joy today?</Text>
          </View>
          <View style={styles.mascotContainer}>
            <View style={styles.mascotGradientCircle}>
              <Package size={48} color={colors.textInverse} weight="fill" />
            </View>
          </View>
        </View>

        {/* Action Bento Grid */}
        <View style={styles.bentoContainer}>
          <Text style={styles.bentoTitle}>Start a Shipment</Text>

          {/* From Selector */}
          <Text style={styles.selectorLabel}>From</Text>
          <TouchableOpacity
            style={styles.selectorField}
            onPress={() => {
              setSelectorType('from');
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MapPin size={20} color={colors.primary} weight="bold" />
            <Text style={styles.selectorText}>{fromCity}</Text>
            <CaretDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* To Selectors */}
          <Text style={[styles.selectorLabel, { marginTop: spacing.md }]}>To</Text>
          <View style={styles.toRow}>
            <TouchableOpacity
              style={[styles.selectorField, { flex: 1 }]}
              onPress={() => {
                setSelectorType('toCity');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.selectorText} numberOfLines={1}>
                {toCity}
              </Text>
              <CaretDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorField, { flex: 1.2 }]}
              onPress={() => {
                setSelectorType('toDistrict');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.selectorText} numberOfLines={1}>
                {toDistrict}
              </Text>
              <CaretDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleStartShipment}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <ArrowRight size={18} color={colors.textInverse} weight="bold" />
          </TouchableOpacity>

          {/* Quick Track Link */}
          <TouchableOpacity
            style={styles.trackLink}
            onPress={() => handleTrackShipment('VR-8829')}
            activeOpacity={0.7}
          >
            <MagnifyingGlass size={16} color={colors.primary} weight="bold" />
            <Text style={styles.trackLinkText}>Track existing shipment</Text>
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

          {RECENT_SHIPMENTS.map((shipment) => (
            <TouchableOpacity
              key={shipment.id}
              style={styles.shipmentCard}
              onPress={() => handleTrackShipment(shipment.id)}
              activeOpacity={0.8}
            >
              <View style={styles.shipmentIconContainer}>
                <Package size={24} color={colors.primary} weight="duotone" />
              </View>
              <View style={styles.shipmentInfo}>
                <View style={styles.shipmentRow}>
                  <Text style={styles.shipmentDestination}>To: {shipment.toLocation}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      shipment.status === 'in_transit'
                        ? styles.badgeTransit
                        : styles.badgeDelivered,
                    ]}
                  >
                    {shipment.status === 'in_transit' ? (
                      <Truck size={12} color={colors.accentDark} weight="fill" />
                    ) : (
                      <CheckCircle size={12} color={colors.success} weight="fill" />
                    )}
                    <Text
                      style={[
                        styles.statusText,
                        shipment.status === 'in_transit'
                          ? styles.textTransit
                          : styles.textDelivered,
                      ]}
                    >
                      {shipment.status === 'in_transit' ? 'In Transit' : 'Delivered'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.shipmentMeta}>
                  Order #{shipment.id} • {shipment.date}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Illustration Promo Banner */}
        <View style={styles.promoCard}>
          <View style={styles.promoTextContent}>
            <Text style={styles.promoTitle}>Invite friends, get coins!</Text>
            <Text style={styles.promoDesc}>
              Share your delivery code and get 50,000 VND off your next parcel.
            </Text>
            <TouchableOpacity style={styles.promoButton} activeOpacity={0.8}>
              <Gift size={16} color={colors.textInverse} weight="fill" />
              <Text style={styles.promoButtonText}>Share Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoGiftContainer}>
            <PlusCircle size={64} color="rgba(255, 255, 255, 0.25)" weight="light" style={styles.promoBgCircle} />
            <Gift size={52} color={colors.accentLight} weight="fill" />
          </View>
        </View>
        
        {/* Extra spacing at the bottom of the ScrollView to clear absolute bottom tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Selector Popup */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  profileTextContainer: {
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  userName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  welcomeTextColumn: {
    flex: 1,
  },
  welcomeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: fontSizes.sm * 1.3,
  },
  mascotContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotGradientCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  bentoContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.xxl,
  },
  bentoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  selectorLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
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
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    marginTop: spacing.xl,
    gap: spacing.sm,
    ...shadows.sm,
  },
  nextButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  trackLinkText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
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
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  viewAllText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  shipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  shipmentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  badgeTransit: {
    backgroundColor: colors.warningLight,
  },
  badgeDelivered: {
    backgroundColor: colors.successLight,
  },
  statusText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
  },
  textTransit: {
    color: colors.accentDark,
  },
  textDelivered: {
    color: colors.success,
  },
  shipmentMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  },
  promoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
  },
  promoTextContent: {
    flex: 1.4,
  },
  promoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  promoDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: fontSizes.xs * 1.4,
    marginBottom: spacing.md,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
  },
  promoGiftContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  promoBgCircle: {
    position: 'absolute',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 30, 66, 0.54)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '60%',
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
    alignItems: 'center',
  },
  modalItemText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
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
