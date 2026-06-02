import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Check,
  FileText,
  Tshirt,
  DeviceMobile,
  BowlFood,
  DotsThreeCircle,
  Camera,
  Coins,
  CreditCard,
  Wallet,
  X,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';
import { StationCard, ParcelSkeleton, ErrorView } from '../components';
import type { Station } from '../types';

// Mock list of stations
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
  },
  {
    id: 'ST-002',
    name: 'FUTA Le Hong Phong Office',
    address: '233 Le Hong Phong, Ward 4, District 5, HCMC',
    distance: '2.5 km away',
    rating: 4.6,
    reviewsCount: 68,
    city: 'Ho Chi Minh City',
  },
  {
    id: 'ST-003',
    name: 'Thanh Buoi Le Hong Phong Branch',
    address: '266-268 Le Hong Phong, Ward 4, District 5, HCMC',
    distance: '3.8 km away',
    rating: 4.7,
    reviewsCount: 115,
    city: 'Ho Chi Minh City',
  },
];

type CreateParcelNavProp = NativeStackNavigationProp<ParcelStackParamList, 'CreateParcel'>;

export function CreateParcelScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateParcelNavProp>();

  // Wizard state
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Form selections states
  const [receivingStation, setReceivingStation] = useState<Station | undefined>(undefined);
  const [dropoffStation, setDropoffStation] = useState<Station | undefined>(undefined);
  const [packageSize, setPackageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [packageWeight, setPackageWeight] = useState(2.5); // kg
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [packageCategory, setPackageCategory] = useState('Documents');
  const [codEnabled, setCodEnabled] = useState(false);
  const [codAmount, setCodAmount] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'wallet' | 'card'>('wallet');

  // Re-trigger simulated skeleton loader when changing steps (Stage 1 and 2)
  useEffect(() => {
    if (step === 1 || step === 2) {
      setIsLoading(true);
      setIsError(false);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleNextStep = () => {
    if (step === 1 && !receivingStation) {
      alert('Please select a receiving station.');
      return;
    }
    if (step === 2 && !dropoffStation) {
      alert('Please select a drop-off station.');
      return;
    }
    if (step === 4) {
      // Simulate booking submission
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

  // Mock Photo selector simulator
  const handleAddPhoto = () => {
    setPhotos([...photos, 'https://picsum.photos/id/10/200/200']);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Pricing calculations
  const baseFare = 15000;
  const sizeMultiplier = packageSize === 'small' ? 1 : packageSize === 'medium' ? 1.5 : 2.5;
  const weightSurcharge = Math.ceil(packageWeight * 34000 * sizeMultiplier);
  const promoDiscount = 15000;
  const totalPrice = baseFare + weightSurcharge - promoDiscount;

  // Header Title helpers
  const getHeaderTitle = () => {
    switch (step) {
      case 1:
        return 'Receiving Station';
      case 2:
        return 'Drop-off Station';
      case 3:
        return 'Package Details';
      case 4:
        return 'Order Summary';
      default:
        return 'Create Parcel';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={handleBackStep} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.navHeaderTitleContainer}>
          <Text style={styles.navTitle}>{getHeaderTitle()}</Text>
          {(step === 1 || step === 2) && (
            <Text style={styles.navSubtitle}>HCMC ➔ Sapa • 3 Stations</Text>
          )}
        </View>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <X size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Steps Tracker */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarActive,
              { width: `${((step - 1) / 3) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.stepsRow}>
          {[1, 2, 3, 4].map((s) => {
            const isActive = s === step;
            const isCompleted = s < step;
            return (
              <View key={`step-${s}`} style={styles.stepBubbleContainer}>
                <View
                  style={[
                    styles.stepBubble,
                    isActive && styles.stepBubbleActive,
                    isCompleted && styles.stepBubbleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={14} color={colors.textInverse} weight="bold" />
                  ) : (
                    <Text
                      style={[
                        styles.stepText,
                        isActive && styles.stepTextActive,
                        isCompleted && styles.stepTextCompleted,
                      ]}
                    >
                      {s}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {s === 1 ? 'Station' : s === 2 ? 'Drop-off' : s === 3 ? 'Package' : 'Payment'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.heading}>Choose Receiving Station</Text>
                  <Text style={styles.subtext}>Where should we pick up the parcel?</Text>
                </View>
                {MOCK_STATIONS.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isSelected={receivingStation?.id === station.id}
                    onSelect={(st) => setReceivingStation(st)}
                  />
                ))}
              </View>
            )}

            {/* Step 2: Drop-off Station */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.heading}>Choose Drop-off Station</Text>
                  <Text style={styles.subtext}>Where will you drop off your parcel?</Text>
                </View>
                {MOCK_STATIONS.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isSelected={dropoffStation?.id === station.id}
                    onSelect={(st) => setDropoffStation(st)}
                  />
                ))}
              </View>
            )}

            {/* Step 3: Package Details Form */}
            {step === 3 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.heading}>Tell us about your package</Text>
                  <Text style={styles.subtext}>Help us find the right vehicle for you.</Text>
                </View>

                {/* Package Size Selectors */}
                <Text style={styles.formLabel}>Package Size</Text>
                <View style={styles.sizeCardRow}>
                  <TouchableOpacity
                    style={[styles.sizeCard, packageSize === 'small' && styles.sizeCardActive]}
                    onPress={() => setPackageSize('small')}
                    activeOpacity={0.8}
                  >
                    <FileText size={28} color={packageSize === 'small' ? colors.primary : colors.textSecondary} />
                    <Text style={styles.sizeTitle}>Small</Text>
                    <Text style={styles.sizeSub}>Docs / Envelopes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sizeCard, packageSize === 'medium' && styles.sizeCardActive]}
                    onPress={() => setPackageSize('medium')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.checkedCircle}>
                      {packageSize === 'medium' && <Check size={10} color={colors.textInverse} weight="bold" />}
                    </View>
                    <Tshirt size={28} color={packageSize === 'medium' ? colors.primary : colors.textSecondary} />
                    <Text style={styles.sizeTitle}>Medium</Text>
                    <Text style={styles.sizeSub}>Box / Clothes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sizeCard, packageSize === 'large' && styles.sizeCardActive]}
                    onPress={() => setPackageSize('large')}
                    activeOpacity={0.8}
                  >
                    <DotsThreeCircle size={28} color={packageSize === 'large' ? colors.primary : colors.textSecondary} />
                    <Text style={styles.sizeTitle}>Large</Text>
                    <Text style={styles.sizeSub}>Luggage / Heavy</Text>
                  </TouchableOpacity>
                </View>

                {/* Weight Input slider simulation */}
                <View style={styles.weightLabelRow}>
                  <Text style={styles.formLabel}>Weight</Text>
                  <View style={styles.unitToggleRow}>
                    <TouchableOpacity
                      style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonActive]}
                      onPress={() => {
                        if (weightUnit === 'lbs') {
                          setWeightUnit('kg');
                          setPackageWeight(Number((packageWeight / 2.20462).toFixed(1)));
                        }
                      }}
                    >
                      <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextActive]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.unitButton, weightUnit === 'lbs' && styles.unitButtonActive]}
                      onPress={() => {
                        if (weightUnit === 'kg') {
                          setWeightUnit('lbs');
                          setPackageWeight(Number((packageWeight * 2.20462).toFixed(1)));
                        }
                      }}
                    >
                      <Text style={[styles.unitText, weightUnit === 'lbs' && styles.unitTextActive]}>lbs</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.weightInputCard}>
                  <TextInput
                    style={styles.weightInput}
                    keyboardType="numeric"
                    value={packageWeight.toString()}
                    onChangeText={(text) => setPackageWeight(Number(text) || 0)}
                  />
                  <Text style={styles.weightInputUnit}>{weightUnit}</Text>
                </View>

                {/* Weight slider simulation bar */}
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${Math.min((packageWeight / (weightUnit === 'kg' ? 30 : 66)) * 100, 100)}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.sliderThumb,
                        { left: `${Math.min((packageWeight / (weightUnit === 'kg' ? 30 : 66)) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.sliderMinMax}>
                    <Text style={styles.sliderLimitText}>0.5 {weightUnit}</Text>
                    <Text style={styles.sliderLimitText}>
                      {weightUnit === 'kg' ? '30 kg max' : '66 lbs max'}
                    </Text>
                  </View>
                </View>

                {/* Categories */}
                <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>Category</Text>
                <View style={styles.chipRow}>
                  {['Documents', 'Clothing', 'Electronics', 'Food', 'Others'].map((cat) => {
                    const isSelected = packageCategory === cat;
                    let CategoryIcon = FileText;
                    if (cat === 'Clothing') CategoryIcon = Tshirt;
                    if (cat === 'Electronics') CategoryIcon = DeviceMobile;
                    if (cat === 'Food') CategoryIcon = BowlFood;
                    if (cat === 'Others') CategoryIcon = DotsThreeCircle;

                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setPackageCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <CategoryIcon size={16} color={isSelected ? colors.textInverse : colors.textSecondary} />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* COD Option Toggle */}
                <View style={styles.codCard}>
                  <View style={styles.codMeta}>
                    <Text style={styles.codTitle}>COD (Cash On Delivery)</Text>
                    <Text style={styles.codDesc}>Collect Payment on Delivery</Text>
                  </View>
                  <Switch
                    value={codEnabled}
                    onValueChange={(val) => setCodEnabled(val)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>

                {codEnabled && (
                  <View style={styles.estimatedValueCard}>
                    <Text style={styles.formLabel}>COD Collection Amount</Text>
                    <View style={styles.currencyInputContainer}>
                      <Text style={styles.currencyPrefix}>₫</Text>
                      <TextInput
                        style={styles.currencyInput}
                        placeholder="Enter COD amount"
                        keyboardType="numeric"
                        value={codAmount}
                        onChangeText={setCodAmount}
                      />
                    </View>
                  </View>
                )}

                {/* Estimated Value */}
                <View style={styles.estimatedValueCard}>
                  <Text style={styles.formLabel}>Estimated Value (Optional)</Text>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencyPrefix}>₫</Text>
                    <TextInput
                      style={styles.currencyInput}
                      placeholder="Enter package value"
                      keyboardType="numeric"
                      value={estimatedValue}
                      onChangeText={setEstimatedValue}
                    />
                  </View>
                  <Text style={styles.formCaption}>For insurance purposes in case of damage.</Text>
                </View>

                {/* Photo Simulation */}
                <Text style={[styles.formLabel, { marginTop: spacing.lg }]}>Photos (Optional)</Text>
                <View style={styles.photoContainer}>
                  {photos.length === 0 ? (
                    <TouchableOpacity style={styles.photoUploadBox} onPress={handleAddPhoto} activeOpacity={0.7}>
                      <Camera size={32} color={colors.textTertiary} weight="light" />
                      <Text style={styles.uploadMainText}>Add parcel photos</Text>
                      <Text style={styles.uploadSubText}>Support JPG, PNG up to 5MB</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.photoGrid}>
                      {photos.map((uri, idx) => (
                        <View key={`photo-${idx}`} style={styles.thumbnailWrapper}>
                          <Image source={{ uri }} style={styles.thumbnail} />
                          <TouchableOpacity
                            style={styles.removePhotoBadge}
                            onPress={() => handleRemovePhoto(idx)}
                            activeOpacity={0.7}
                          >
                            <X size={10} color={colors.textInverse} weight="bold" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.photoUploadBox, styles.photoUploadBoxThumbnail]}
                        onPress={handleAddPhoto}
                        activeOpacity={0.7}
                      >
                        <Camera size={24} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Step 4: Summary & Payment */}
            {step === 4 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.heading}>Order Summary</Text>
                  <Text style={styles.subtext}>Confirm details and make payment.</Text>
                </View>

                {/* Route bento details card */}
                <View style={styles.bentoSummaryCard}>
                  <View style={styles.bentoAccent} />
                  <Text style={styles.bentoCardHeading}>Route Information</Text>
                  <View style={styles.summaryRoute}>
                    <View style={styles.routeTrack}>
                      <View style={styles.dotStart} />
                      <View style={styles.dottedDivider} />
                      <View style={styles.dotEnd} />
                    </View>
                    <View style={styles.routeDetailsText}>
                      <View style={styles.routeStationSection}>
                        <Text style={styles.routeLabelText}>FROM</Text>
                        <Text style={styles.routeStationName}>{receivingStation?.name}</Text>
                        <Text style={styles.routeStationCity}>{receivingStation?.city}</Text>
                      </View>
                      <View style={styles.routeStationSection}>
                        <Text style={styles.routeLabelText}>TO</Text>
                        <Text style={styles.routeStationName}>{dropoffStation?.name}</Text>
                        <Text style={styles.routeStationCity}>{dropoffStation?.city}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Package summary bento card */}
                <View style={styles.bentoSummaryCard}>
                  <Text style={styles.bentoCardHeading}>Package Specifications</Text>
                  <View style={styles.specCardRow}>
                    <View style={styles.specIcon}>
                      <Tshirt size={22} color={colors.primary} weight="duotone" />
                    </View>
                    <View style={styles.specDetails}>
                      <Text style={styles.specTitle}>
                        {packageSize.toUpperCase()} Package ({packageCategory})
                      </Text>
                      <Text style={styles.specMeta}>
                        Weight: {packageWeight} {weightUnit} • COD:{' '}
                        {codEnabled ? `₫${codAmount}` : 'No'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Payment Methods selector */}
                <View style={styles.bentoSummaryCard}>
                  <Text style={styles.bentoCardHeading}>Payment Method</Text>

                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('wallet')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.paymentRadio}>
                      {paymentMethod === 'wallet' && <View style={styles.paymentRadioDot} />}
                    </View>
                    <View style={styles.paymentIconBackground}>
                      <Wallet size={20} color={colors.primary} weight="bold" />
                    </View>
                    <View style={styles.paymentOptionText}>
                      <Text style={styles.paymentTitle}>VietRide Wallet</Text>
                      <Text style={styles.paymentSubtitle}>Balance: 250,000₫</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'vnpay' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('vnpay')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.paymentRadio}>
                      {paymentMethod === 'vnpay' && <View style={styles.paymentRadioDot} />}
                    </View>
                    <View style={styles.paymentIconBackground}>
                      <Coins size={20} color={colors.accentDark} weight="bold" />
                    </View>
                    <View style={styles.paymentOptionText}>
                      <Text style={styles.paymentTitle}>VNPAY / Momo QR</Text>
                      <Text style={styles.paymentSubtitle}>Scan app QR to pay</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('card')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.paymentRadio}>
                      {paymentMethod === 'card' && <View style={styles.paymentRadioDot} />}
                    </View>
                    <View style={styles.paymentIconBackground}>
                      <CreditCard size={20} color={colors.success} weight="bold" />
                    </View>
                    <View style={styles.paymentOptionText}>
                      <Text style={styles.paymentTitle}>Credit / Debit Card</Text>
                      <Text style={styles.paymentSubtitle}>Visa, Mastercard, JCB</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Promo Applied Summary */}
                <View style={styles.bentoSummaryCard}>
                  <View style={styles.promoAppliedRow}>
                    <View style={styles.promoSuccessBadge}>
                      <Check size={12} color={colors.success} weight="bold" />
                      <Text style={styles.promoSuccessText}>WELCOME50K Applied</Text>
                    </View>
                    <Text style={styles.promoDiscountText}>-₫{promoDiscount.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Pricing Breakdown details card */}
                <View style={styles.bentoSummaryCard}>
                  <Text style={styles.bentoCardHeading}>Payment Details</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Base Delivery Fare</Text>
                    <Text style={styles.priceValue}>₫{baseFare.toLocaleString()}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Weight Surcharge ({packageWeight} {weightUnit})</Text>
                    <Text style={styles.priceValue}>₫{weightSurcharge.toLocaleString()}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Promo Discount</Text>
                    <Text style={[styles.priceValue, { color: colors.success }]}>
                      -₫{promoDiscount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={[styles.priceRow, { marginTop: spacing.md }]}>
                    <Text style={styles.totalLabel}>Total Price</Text>
                    <Text style={styles.totalValue}>₫{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Absolute Next Action Bar */}
      <View style={styles.actionBar}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
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
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
  },
  navHeaderTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  navSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    ...shadows.sm,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    position: 'absolute',
    left: spacing.xxl + 16,
    right: spacing.xxl + 16,
    top: spacing.md + 14,
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBubbleContainer: {
    alignItems: 'center',
    width: 50,
  },
  stepBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    zIndex: 1,
  },
  stepBubbleActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  stepBubbleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  },
  stepTextActive: {
    color: colors.primary,
  },
  stepTextCompleted: {
    color: colors.textInverse,
  },
  stepLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  stepLabelActive: {
    color: colors.primary,
    fontFamily: fontFamilies.bold,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: 120, // offset action bar height
  },
  stepContent: {
    paddingHorizontal: spacing.xl,
  },
  stepHeader: {
    marginBottom: spacing.lg,
  },
  heading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtext: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  formLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sizeCardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sizeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    position: 'relative',
    height: 120,
  },
  sizeCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(10, 126, 164, 0.02)',
  },
  sizeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  sizeSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  checkedCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  unitButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  unitButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  unitText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  unitTextActive: {
    color: colors.primary,
  },
  weightInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  weightInput: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  weightInputUnit: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
  },
  sliderContainer: {
    marginBottom: spacing.lg,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    position: 'relative',
    marginVertical: spacing.md,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.primary,
    position: 'absolute',
    top: -7,
    transform: [{ translateX: -10 }],
    ...shadows.md,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLimitText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontFamily: fontFamilies.bold,
  },
  codCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  codMeta: {
    flex: 1,
  },
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
  estimatedValueCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginTop: spacing.xs,
  },
  currencyPrefix: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  currencyInput: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  formCaption: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    paddingLeft: 4,
  },
  photoContainer: {
    marginBottom: spacing.lg,
  },
  photoUploadBox: {
    height: 120,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  photoUploadBoxThumbnail: {
    width: 80,
    height: 80,
    borderWidth: 1,
  },
  uploadMainText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  uploadSubText: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  bentoSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
    ...shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  bentoAccent: {
    width: 4,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.primary,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRoute: {
    flexDirection: 'row',
  },
  routeTrack: {
    alignItems: 'center',
    marginRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dottedDivider: {
    width: 1,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  routeDetailsText: {
    flex: 1,
    gap: spacing.md,
  },
  routeStationSection: {},
  routeLabelText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
  },
  routeStationName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  routeStationCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  specCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  specIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specDetails: {
    flex: 1,
  },
  specTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  specMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10, 126, 164, 0.01)',
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  paymentIconBackground: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  paymentSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  promoAppliedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  promoSuccessText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.success,
  },
  promoDiscountText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.success,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  priceValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    ...shadows.lg,
  },
  priceSummaryBox: {
    justifyContent: 'center',
  },
  totalPriceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.textSecondary,
  },
  totalPriceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.primary,
    marginTop: 2,
  },
  nextActionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  nextActionButtonSummary: {
    backgroundColor: colors.success,
  },
  nextActionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
