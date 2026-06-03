import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Input } from '@shared/components';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Camera,
  Coins,
  CreditCard,
  Wallet,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList, RootStackParamList } from '@app/navigation/types';
import type { Station } from '../types';
import {
  StationCard,
  ParcelSkeleton,
  ErrorView,
  StepProgressBar,
  StepHeaderWithMascot,
  PackageSizeSelector,
  WeightSlider,
  CategoryChips,
  PhotoUploadSection,
  PhotoChoiceSheet,
  CameraViewfinder,
  PromoCodeInput,
  PricingBreakdown,
} from '../components';

const catMascotImage = require('../../../assets/images/image 1.png');

const MOCK_STATIONS: Station[] = [
  {
    id: 'ST-001',
    name: 'FUTA Mien Dong Bus Station',
    address: '292 Dinh Bo Linh, Ward 26, Binh Thanh District, HCMC',
    distance: '1.2 km away',
    isClosest: true,
    rating: 4.8,
    reviewsCount: 82,
    city: 'Ho Chi Minh City',
    workingHours: '05:00 - 22:00',
    acceptingParcels: true,
  },
  {
    id: 'ST-002',
    name: 'FUTA Le Hong Phong Office',
    address: '233 Le Hong Phong, Ward 4, District 5, HCMC',
    distance: '3.5 km away',
  isClosest: false,
    rating: 4.6,
    reviewsCount: 68,
    city: 'Ho Chi Minh City',
    workingHours: '06:00 - 21:00',
    acceptingParcels: true,
  },
  {
    id: 'ST-003',
    name: 'Thanh Buoi Le Hong Phong Branch',
    address: '266-268 Le Hong Phong, Ward 4, District 5, HCMC',
    distance: '3.8 km away',
  isClosest: false,
    rating: 4.7,
    reviewsCount: 115,
    city: 'Ho Chi Minh City',
    workingHours: '05:00 - 22:00',
    acceptingParcels: true,
  },
];

const MOCK_GALLERY_PHOTOS = [
  'https://picsum.photos/id/10/400/300',
  'https://picsum.photos/id/11/400/300',
  'https://picsum.photos/id/20/400/300',
  'https://picsum.photos/id/24/400/300',
  'https://picsum.photos/id/26/400/300',
  'https://picsum.photos/id/48/400/300',
];

type CreateParcelNavProp = NativeStackNavigationProp<ParcelStackParamList, 'CreateParcel'>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

type PackageSize = 'small' | 'medium' | 'large';

export function CreateParcelScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateParcelNavProp>();
  const rootNav = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();

  // Wizard state
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Form selections states
  const [receivingStation, setReceivingStation] = useState<Station | undefined>(undefined);
  const [dropoffStation, setDropoffStation] = useState<Station | undefined>(undefined);
  const [packageSize, setPackageSize] = useState<PackageSize>('medium');
  const [packageWeight, setPackageWeight] = useState(2.5);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [packageCategory, setPackageCategory] = useState('Documents');
  const [codEnabled, setCodEnabled] = useState(false);
  const [codAmount, setCodAmount] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'wallet' | 'card'>('wallet');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Simulated Camera / Gallery states
  const [choiceSheetVisible, setChoiceSheetVisible] = useState(false);
  const [cameraViewVisible, setCameraViewVisible] = useState(false);
  const [galleryViewVisible, setGalleryViewVisible] = useState(false);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<number[]>([]);
  const [flashActive, setFlashActive] = useState(false);

  // Pricing calculations
  const baseFare = 15000;
  const sizeMultiplier = packageSize === 'small' ? 1 : packageSize === 'medium' ? 1.5 : 2.5;
  const weightSurcharge = Math.ceil(packageWeight * 34000 * sizeMultiplier);
  const promoDiscount = promoApplied ? 15000 : 0;
  const totalPrice = baseFare + weightSurcharge - promoDiscount;

  const handleNextStep = () => {
    if (step === 1 && !receivingStation) {
      Alert.alert('VietRide', 'Please select a receiving station.');
      return;
    }
    if (step === 2 && !dropoffStation) {
      Alert.alert('VietRide', 'Please select a drop-off station.');
      return;
    }
    if (step === 4) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('ParcelDetail', { parcelId: 'VR-8829' });
      }, 1500);
      return;
    }
    setStep(step + 1);
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // Skeleton loader when changing steps (Stage 1 and 2)
  useEffect(() => {
    if (step === 1 || step === 2) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleAddPhoto = () => setChoiceSheetVisible(true);
  const handleRemovePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));
  const handleChooseGalleryPhoto = (index: number) => {
    setSelectedGalleryPhotos((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };
  const handleImportGalleryPhotos = () => {
    const newPhotos = selectedGalleryPhotos.map((idx) => MOCK_GALLERY_PHOTOS[idx]);
    setPhotos([...photos, ...newPhotos]);
    setSelectedGalleryPhotos([]);
    setGalleryViewVisible(false);
  };
  const handleSnapPhoto = () => {
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
      setPhotos([...photos, 'https://picsum.photos/id/60/400/300']);
      setCameraViewVisible(false);
    }, 300);
  };

  const handlePromoApply = () => {
    if (!promoApplied && promoCode.trim()) setPromoApplied(true);
  };

  return (
    <View style={styles.root}>
      {/* Absolute Background Gradient at the top */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="460" width="100%">
          <Defs>
            <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.55} />
              <Stop offset="55%" stopColor="#2AC1BC" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#headerGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StepProgressBar
        step={step}
        onCancel={() => rootNav.navigate('Main', { screen: 'Home' })}
      />
        <StepHeaderWithMascot step={step} />

        {/* Main Content Area */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + Math.max(insets.bottom, spacing.md) }]}
          showsVerticalScrollIndicator={false}
        >
          {isError ? (
            <ErrorView onRetry={() => setIsError(false)} />
          ) : isLoading ? (
            <View style={{ padding: spacing.xl }}>
              <ParcelSkeleton type={step === 4 ? 'summary' : 'station'} count={3} />
            </View>
          ) : (
            <View>
              {/* Step 1: Receiving Station */}
              {step === 1 && (
                <View style={[styles.stepContent]}>
                  {MOCK_STATIONS.map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      isSelected={receivingStation?.id === station.id}
                      onSelect={setReceivingStation}
                    />
                  ))}
                </View>
              )}

              {/* Step 2: Drop-off Station */}
              {step === 2 && (
                <View style={[styles.stepContent]}>
                  {MOCK_STATIONS.map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      isSelected={dropoffStation?.id === station.id}
                      onSelect={setDropoffStation}
                    />
                  ))}
                </View>
              )}

              {/* Step 3: Package Details Form */}
              {step === 3 && (
                <View style={[styles.stepContent]}>
                  <PackageSizeSelector
                    packageSize={packageSize}
                    onSelect={setPackageSize}
                  />
                  <WeightSlider
                    value={packageWeight}
                    unit={weightUnit}
                    onValueChange={setPackageWeight}
                    onUnitChange={setWeightUnit}
                  />
                  <CategoryChips value={packageCategory} onChange={setPackageCategory} />

                  {/* COD Option Toggle */}
                  <View style={styles.codCard}>
                    <View style={styles.codMeta}>
                      <Text style={styles.codTitle}>COD (Cash On Delivery)</Text>
                      <Text style={styles.codDesc}>Collect Payment on Delivery</Text>
                    </View>
                    <Switch
                      value={codEnabled}
                      onValueChange={setCodEnabled}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>
                  {codEnabled && (
                    <Input
                      label="COD Collection Amount"
                      placeholder="Enter COD amount (₫)"
                      keyboardType="numeric"
                      value={codAmount}
                      onChangeText={setCodAmount}
                    />
                  )}

                  <Input
                    label="Estimated Value (Optional)"
                    placeholder="Enter package value (₫)"
                    keyboardType="numeric"
                    value={estimatedValue}
                    onChangeText={setEstimatedValue}
                    hint="For insurance purposes in case of damage."
                  />

                  <PhotoUploadSection
                    photos={photos}
                    onAdd={handleAddPhoto}
                    onRemove={handleRemovePhoto}
                  />
                </View>
              )}

              {/* Step 4: Summary & Payment */}
              {step === 4 && (
                <View style={[styles.stepContent]}>
                  <PricingBreakdown
                    receivingStation={receivingStation}
                    dropoffStation={dropoffStation}
                    packageSize={packageSize}
                    packageCategory={packageCategory}
                    packageWeight={packageWeight}
                    weightUnit={weightUnit}
                    codEnabled={codEnabled}
                    codAmount={codAmount}
                    baseFare={baseFare}
                    weightSurcharge={weightSurcharge}
                    promoDiscount={promoDiscount}
                    totalPrice={totalPrice}
                    promoCode={promoCode}
                    promoApplied={promoApplied}
                    onPromoCodeChange={setPromoCode}
                    onPromoApply={handlePromoApply}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    step={step}
                    onPayPress={handleNextStep}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Absolute Next Action Bar */}
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {step === 4 && (
            <View style={styles.priceSummaryBox}>
              <Text style={styles.totalPriceLabel}>Total Amount</Text>
              <Text style={styles.totalPriceValue}>₫{totalPrice.toLocaleString()}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.nextActionButton, step === 4 && styles.nextActionButtonSummary]}
            onPress={handleNextStep}
            activeOpacity={0.85}
          >
            <Text style={styles.nextActionButtonText}>
              {step === 4 ? 'Confirm & Pay' : 'Next Step'}
            </Text>
            <ArrowLeft
              size={18}
              color={colors.textInverse}
              weight="bold"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </TouchableOpacity>
        </View>

        {/* Photo Upload Method Choice Modal */}
        <PhotoChoiceSheet
          visible={choiceSheetVisible}
          onClose={() => setChoiceSheetVisible(false)}
          onCamera={() => setCameraViewVisible(true)}
          onGallery={() => setGalleryViewVisible(true)}
        />

        {/* Simulated Camera Viewfinder Modal */}
        <CameraViewfinder
          visible={cameraViewVisible}
          onClose={() => setCameraViewVisible(false)}
          flashActive={flashActive}
          onToggleFlash={() => setFlashActive((prev) => !prev)}
          onSnap={handleSnapPhoto}
          lastPhotoUri={photos[photos.length - 1]}
        />

        {/* Simulated Gallery Photo Selection Modal */}
        {galleryViewVisible && (
          <View style={styles.galleryModalRoot}>
            <View style={styles.galleryContainer}>
              <View style={styles.galleryHeader}>
                <TouchableOpacity
                  style={styles.galleryCloseBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedGalleryPhotos([]);
                    setGalleryViewVisible(false);
                  }}
                >
                  <ArrowLeft size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.galleryTitleContainer}>
                  <Text style={styles.galleryTitle}>All Photos</Text>
                  <Text style={styles.gallerySubtitle}>Select package photos to import</Text>
                </View>
                {selectedGalleryPhotos.length > 0 ? (
                  <Text style={styles.gallerySelectionCount}>
                    {selectedGalleryPhotos.length} selected
                  </Text>
                ) : (
                  <View style={styles.headerSpacer} />
                )}
              </View>
              <ScrollView
                contentContainerStyle={styles.galleryScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.galleryGrid}>
                  {MOCK_GALLERY_PHOTOS.map((uri, index) => {
                    const isSelected = selectedGalleryPhotos.includes(index);
                    const selectionIndex = selectedGalleryPhotos.indexOf(index);
                    return (
                      <TouchableOpacity
                        key={`gallery-item-${index}`}
                        style={[styles.galleryGridItem, isSelected && styles.galleryGridItemActive]}
                        activeOpacity={0.85}
                        onPress={() => handleChooseGalleryPhoto(index)}
                      >
                        <Image source={{ uri }} style={styles.galleryImage} />
                        {isSelected && (
                          <View style={styles.galleryCheckboxActive}>
                            <Text style={styles.galleryCheckboxText}>{selectionIndex + 1}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.galleryBottomBar}>
                <TouchableOpacity
                  style={[
                    styles.galleryImportBtn,
                    selectedGalleryPhotos.length === 0 && styles.galleryImportBtnDisabled,
                  ]}
                  disabled={selectedGalleryPhotos.length === 0}
                  activeOpacity={0.85}
                  onPress={handleImportGalleryPhotos}
                >
                  <Text style={styles.galleryImportBtnText}>
                    {selectedGalleryPhotos.length > 0
                      ? `Import Selected (${selectedGalleryPhotos.length})`
                      : 'Select Photos to Import'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  gradientContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 460, zIndex: 0 },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: 0 },
  stepContent: { paddingBottom: 80 },
  codCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
  },
  codMeta: { flex: 1, paddingRight: spacing.md },
  codTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  codDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    ...shadows.lg,
  },
  priceSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalPriceLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  totalPriceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
  },
  nextActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    gap: spacing.sm,
    ...shadows.sm,
  },
  nextActionButtonSummary: {
    marginTop: 0,
  },
  nextActionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  // Gallery modal (inline because it's small + tightly coupled to photo state)
  galleryModalRoot: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    zIndex: 100,
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  galleryCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryTitleContainer: { flex: 1 },
  galleryTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  gallerySubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  gallerySelectionCount: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  headerSpacer: { width: 80 },
  galleryScroll: { padding: spacing.md },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  galleryGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  galleryGridItemActive: {
    borderColor: colors.primary,
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryCheckboxActive: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCheckboxText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.textInverse,
  },
  galleryBottomBar: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  galleryImportBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImportBtnDisabled: {
    backgroundColor: colors.divider,
  },
  galleryImportBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textInverse,
  },
});
