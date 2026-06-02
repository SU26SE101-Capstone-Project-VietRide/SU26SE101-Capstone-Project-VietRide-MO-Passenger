import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  PanResponder,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Input } from '@shared/components';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Check,
  FileText,
  TShirt,
  DeviceMobile,
  BowlFood,
  DotsThreeCircle,
  Camera,
  Coins,
  CreditCard,
  Wallet,
  X,
  Lightning,
  FolderOpen,
  Sliders,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList } from '@app/navigation/types';
import { StationCard, ParcelSkeleton, ErrorView } from '../components';
import type { Station } from '../types';

const catMascotImage = require('../../../assets/images/image 1.png');

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
    workingHours: '05:00 - 22:00',
    acceptingParcels: true,
  },
  {
    id: 'ST-002',
    name: 'FUTA Le Hong Phong Office',
    address: '233 Le Hong Phong, Ward 4, District 5, HCMC',
    distance: '3.5 km away',
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
    rating: 4.7,
    reviewsCount: 115,
    city: 'Ho Chi Minh City',
    workingHours: '05:00 - 22:00',
    acceptingParcels: true,
  },
];

type CreateParcelNavProp = NativeStackNavigationProp<ParcelStackParamList, 'CreateParcel'>;

export function CreateParcelScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateParcelNavProp>();
  const insets = useSafeAreaInsets();

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

  // Draggable slider width state
  const [sliderWidth, setSliderWidth] = useState(0);

  // Simulated Camera / Gallery states
  const [choiceSheetVisible, setChoiceSheetVisible] = useState(false);
  const [cameraViewVisible, setCameraViewVisible] = useState(false);
  const [galleryViewVisible, setGalleryViewVisible] = useState(false);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<number[]>([]);
  const [flashActive, setFlashActive] = useState(false);

  // Simulated gallery package pictures
  const MOCK_GALLERY_PHOTOS = [
    'https://picsum.photos/id/10/400/300',
    'https://picsum.photos/id/11/400/300',
    'https://picsum.photos/id/20/400/300',
    'https://picsum.photos/id/24/400/300',
    'https://picsum.photos/id/26/400/300',
    'https://picsum.photos/id/48/400/300',
  ];

  // Draggable slider touch handler
  const handleSliderTouch = (locationX: number) => {
    if (sliderWidth <= 0) return;
    const ratio = Math.max(0, Math.min(locationX / sliderWidth, 1));
    const minWeight = 0.5;
    const maxWeight = weightUnit === 'kg' ? 30 : 66;
    const calculated = minWeight + ratio * (maxWeight - minWeight);
    setPackageWeight(Number(calculated.toFixed(1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleSliderTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleSliderTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const handleChooseGalleryPhoto = (index: number) => {
    if (selectedGalleryPhotos.includes(index)) {
      setSelectedGalleryPhotos(selectedGalleryPhotos.filter((i) => i !== index));
    } else {
      setSelectedGalleryPhotos([...selectedGalleryPhotos, index]);
    }
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
      Alert.alert('VietRide', 'Please select a receiving station.');
      return;
    }
    if (step === 2 && !dropoffStation) {
      Alert.alert('VietRide', 'Please select a drop-off station.');
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
    setChoiceSheetVisible(true);
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
        {/* Top Navbar */}
        <View style={styles.navbar}>
          {/* Row 1: Header Controls */}
          <View style={styles.navHeaderRow}>
            <TouchableOpacity style={styles.navButtonLeft} onPress={handleBackStep} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#006A67" />
            </TouchableOpacity>
            <View style={styles.navHeaderTitleContainer}>
              {(step === 1 || step === 2) ? (
                <>
                  <Text style={styles.navSubtitleTeal}>3 Stations</Text>
                  <Text style={styles.navTitleLarge}>Ho Chi Minh ➔ Sapa</Text>
                </>
              ) : (
                <Text style={styles.navTitle}>{getHeaderTitle()}</Text>
              )}
            </View>
            {(step === 1 || step === 2) ? (
              <TouchableOpacity style={styles.navButtonRight} onPress={() => console.log('Filter pressed')} activeOpacity={0.7}>
                <Sliders size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.navButtonCancel} onPress={handleBackStep} activeOpacity={0.7}>
                <X size={18} color="#006A67" />
              </TouchableOpacity>
            )}
          </View>

          {/* Row 2: Compact Steps Tracker inside the Navbar */}
          <View style={styles.progressContainerInsideNavbar}>
            <View style={styles.progressBarBgInsideNavbar}>
              <View
                style={[
                  styles.progressBarActiveInsideNavbar,
                  { width: `${((step - 1) / 3) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.stepsRowInsideNavbar}>
              {[1, 2, 3, 4].map((s) => {
                const isActive = s === step;
                const isCompleted = s < step;
                return (
                  <View key={`step-${s}`} style={styles.stepBubbleContainerInsideNavbar}>
                    <View
                      style={[
                        styles.stepBubbleInsideNavbar,
                        isActive && styles.stepBubbleActiveInsideNavbar,
                        isCompleted && styles.stepBubbleCompletedInsideNavbar,
                      ]}
                    >
                      {isCompleted ? (
                        <Check size={12} color="#006A67" weight="bold" />
                      ) : (
                        <Text
                          style={[
                            styles.stepTextInsideNavbar,
                            isActive && styles.stepTextActiveInsideNavbar,
                            isCompleted && styles.stepTextCompletedInsideNavbar,
                          ]}
                        >
                          {s}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Row 3: Step Heading, Subtext & Mascot (for ALL steps) */}
          <View style={styles.stepHeaderWithMascotInsideNavbar}>
            <View style={styles.stepHeaderTextContainer}>
              <Text style={styles.headingInsideNavbar}>
                {step === 1 && 'Choose Receiving Station'}
                {step === 2 && 'Choose Sending Station'}
                {step === 3 && 'Tell us about your package'}
                {step === 4 && 'Order Summary'}
              </Text>
              <Text style={styles.subtextInsideNavbar}>
                {step === 1 && 'Where should we pick up?'}
                {step === 2 && 'Where will you drop off your parcel?'}
                {step === 3 && 'Help us find the right vehicle for you.'}
                {step === 4 && 'Confirm details and make payment.'}
              </Text>
            </View>
            <Image
              source={catMascotImage}
              style={styles.mascotHeadingImageInsideNavbar}
              resizeMode="contain"
            />
          </View>
        </View>

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
              <View style={[styles.stepContent, styles.stepContentOverlap]}>
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
              <View style={[styles.stepContent, styles.stepContentOverlap]}>
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
              <View style={[styles.stepContent, styles.stepContentOverlap]}>

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
                    <TShirt size={28} color={packageSize === 'medium' ? colors.primary : colors.textSecondary} />
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
                    onChangeText={(text) => {
                      const cleanText = text.replace(/[^0-9.]/g, '');
                      setPackageWeight(Number(cleanText) || 0.5);
                    }}
                  />
                  <Text style={styles.weightInputUnit}>{weightUnit}</Text>
                </View>

                {/* Weight slider simulation bar */}
                <View style={styles.sliderContainer}>
                  <View
                    style={styles.sliderTrack}
                    onLayout={(event) => {
                      const { width } = event.nativeEvent.layout;
                      setSliderWidth(width);
                    }}
                    {...panResponder.panHandlers}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        styles.sliderFill,
                        {
                          width: `${Math.max(
                            0,
                            Math.min(
                              ((packageWeight - 0.5) /
                                ((weightUnit === 'kg' ? 30 : 66) - 0.5)) *
                              100,
                              100
                            )
                          )}%`,
                        },
                      ]}
                    />
                    <View
                      pointerEvents="none"
                      style={[
                        styles.sliderThumb,
                        {
                          left: `${Math.max(
                            0,
                            Math.min(
                              ((packageWeight - 0.5) /
                                ((weightUnit === 'kg' ? 30 : 66) - 0.5)) *
                              100,
                              100
                            )
                          )}%`,
                        },
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
                    if (cat === 'Clothing') CategoryIcon = TShirt;
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
                  <Input
                    label="COD Collection Amount"
                    placeholder="Enter COD amount (₫)"
                    keyboardType="numeric"
                    value={codAmount}
                    onChangeText={setCodAmount}
                  />
                )}

                {/* Estimated Value */}
                <Input
                  label="Estimated Value (Optional)"
                  placeholder="Enter package value (₫)"
                  keyboardType="numeric"
                  value={estimatedValue}
                  onChangeText={setEstimatedValue}
                  hint="For insurance purposes in case of damage."
                />

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
              <View style={[styles.stepContent, styles.stepContentOverlap]}>

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
                      <TShirt size={22} color={colors.primary} weight="duotone" />
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

      {/* Photo Upload Method Choice Modal (Bottom Sheet Style) */}
      <Modal
        visible={choiceSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setChoiceSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setChoiceSheetVisible(false)}
          />
          <View style={styles.choiceSheet}>
            <View style={styles.choiceDragHandle} />
            <View style={styles.choiceHeader}>
              <Text style={styles.choiceTitle}>Add Parcel Photo</Text>
              <Text style={styles.choiceSubtitle}>Choose how you want to upload your package photos</Text>
            </View>

            <View style={styles.choiceOptionsRow}>
              <TouchableOpacity
                style={styles.choiceOptionCard}
                activeOpacity={0.8}
                onPress={() => {
                  setChoiceSheetVisible(false);
                  setTimeout(() => setCameraViewVisible(true), 100);
                }}
              >
                <View style={[styles.choiceOptionIconBg, { backgroundColor: colors.primaryFaded }]}>
                  <Camera size={28} color={colors.primary} weight="duotone" />
                </View>
                <Text style={styles.choiceOptionTitle}>Use Camera</Text>
                <Text style={styles.choiceOptionDesc}>Take a live photo of the package</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.choiceOptionCard}
                activeOpacity={0.8}
                onPress={() => {
                  setChoiceSheetVisible(false);
                  setTimeout(() => setGalleryViewVisible(true), 100);
                }}
              >
                <View style={[styles.choiceOptionIconBg, { backgroundColor: colors.surfaceAlt }]}>
                  <FolderOpen size={28} color={colors.textSecondary} weight="duotone" />
                </View>
                <Text style={styles.choiceOptionTitle}>From Gallery</Text>
                <Text style={styles.choiceOptionDesc}>Upload from photo library</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.choiceCancelButton}
              activeOpacity={0.85}
              onPress={() => setChoiceSheetVisible(false)}
            >
              <Text style={styles.choiceCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Simulated Active Camera Viewfinder Modal */}
      <Modal
        visible={cameraViewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCameraViewVisible(false)}
      >
        <SafeAreaView style={styles.cameraContainer}>
          {/* Top Bar Controls */}
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              activeOpacity={0.7}
              onPress={() => setCameraViewVisible(false)}
            >
              <X size={20} color={colors.textInverse} />
            </TouchableOpacity>

            <Text style={styles.cameraModeText}>PHOTO MODE</Text>

            <TouchableOpacity
              style={[styles.cameraFlashBtn, flashActive && styles.cameraFlashBtnActive]}
              activeOpacity={0.7}
              onPress={() => setFlashActive(!flashActive)}
            >
              <Lightning
                size={20}
                color={flashActive ? colors.warning : colors.textInverse}
                weight={flashActive ? 'fill' : 'regular'}
              />
            </TouchableOpacity>
          </View>

          {/* Camera Viewfinder Area */}
          <View style={styles.cameraViewfinder}>
            {/* Viewfinder 3x3 Grid Overlay */}
            <View style={styles.gridOverlay}>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={[styles.gridCell, styles.gridCellMiddleCol]} />
                <View style={styles.gridCell} />
              </View>
              <View style={[styles.gridRow, styles.gridRowMiddleRow]}>
                <View style={styles.gridCell} />
                <View style={[styles.gridCell, styles.gridCellMiddleCol]} />
                <View style={styles.gridCell} />
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={[styles.gridCell, styles.gridCellMiddleCol]} />
                <View style={styles.gridCell} />
              </View>
            </View>

            {/* Simulated Live Viewfinder Content */}
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop' }}
              style={styles.cameraMockBg}
            />

            {/* Viewfinder Center Focus Cursor */}
            <View style={styles.cameraFocusCursor}>
              <View style={styles.cameraFocusRing} />
              <Text style={styles.cameraFocusText}>AF-L</Text>
            </View>

            {/* Snap Shutter Flash Overlay */}
            {flashActive && (
              <View style={styles.cameraFlashOverlay} pointerEvents="none" />
            )}
          </View>

          {/* Camera Bottom Action Bar */}
          <View style={styles.cameraBottomBar}>
            <View style={styles.cameraAlbumPreview}>
              {photos.length > 0 ? (
                <Image source={{ uri: photos[photos.length - 1] }} style={styles.cameraAlbumThumb} />
              ) : (
                <View style={styles.cameraAlbumEmpty} />
              )}
            </View>

            <TouchableOpacity
              style={styles.cameraShutterOuter}
              activeOpacity={0.8}
              onPress={handleSnapPhoto}
            >
              <View style={styles.cameraShutterInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraFlipBtn}
              activeOpacity={0.7}
              onPress={() => Alert.alert('VietRide', 'Switched to front camera (simulation)')}
            >
              <Text style={styles.cameraFlipText}>FLIP</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Simulated Gallery Photo Selection Modal */}
      <Modal
        visible={galleryViewVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setGalleryViewVisible(false)}
      >
        <SafeAreaView style={styles.galleryContainer}>
          {/* Header */}
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
              <Text style={styles.gallerySelectionCount}>{selectedGalleryPhotos.length} selected</Text>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>

          {/* Photo Grid */}
          <ScrollView contentContainerStyle={styles.galleryScroll} showsVerticalScrollIndicator={false}>
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

          {/* Bottom Import Action Bar */}
          <View style={styles.galleryBottomBar}>
            <TouchableOpacity
              style={[
                styles.galleryImportBtn,
                selectedGalleryPhotos.length === 0 && styles.galleryImportBtnDisabled
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 460,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  navbar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  navButtonLeft: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 106, 103, 0.18)',
  },
  navButtonRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#006A67', // Deep teal filter button
  },
  navButtonCancel: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 106, 103, 0.18)', // Soft teal ghost cancel button
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
  navSubtitleTeal: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#006A67',
    letterSpacing: 0.5,
  },
  navTitleLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  stepHeaderWithMascotInsideNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl, // Taller Y-spacing as requested
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  stepHeaderTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  headingInsideNavbar: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    color: '#004845', // Deep teal on light mint background
    lineHeight: 28,
  },
  subtextInsideNavbar: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: '#3C6965', // Muted teal-grey
    marginTop: spacing.xs,
  },
  mascotHeadingImageInsideNavbar: {
    width: 60,
    height: 60,
    marginTop: -8,
  },
  scrollContainer: {
    backgroundColor: 'transparent',
  },
  stepContentOverlap: {
    marginTop: -10, // Adjusted vertical overlap margin to prevent card CLOSEST text from being hidden
  },
  navHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  progressContainerInsideNavbar: {
    width: '100%',
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xl, // Expanded vertical spacing
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBgInsideNavbar: {
    height: 4,
    backgroundColor: 'rgba(0, 106, 103, 0.12)',
    borderRadius: 2,
    position: 'absolute',
    left: spacing.xxl + 16,
    right: spacing.xxl + 16,
    top: 12,
    zIndex: 1,
  },
  progressBarActiveInsideNavbar: {
    height: '100%',
    backgroundColor: '#006A67',
    borderRadius: 2,
  },
  stepsRowInsideNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
  },
  stepBubbleContainerInsideNavbar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleInsideNavbar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 103, 0.2)',
  },
  stepBubbleActiveInsideNavbar: {
    backgroundColor: '#006A67',
    borderColor: '#006A67',
    shadowColor: '#004845',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  stepBubbleCompletedInsideNavbar: {
    backgroundColor: '#2AC1BC',
    borderColor: '#2AC1BC',
  },
  stepTextInsideNavbar: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: '#006A67',
  },
  stepTextActiveInsideNavbar: {
    color: '#FFFFFF',
  },
  stepTextCompletedInsideNavbar: {
    color: '#FFFFFF',
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
    backgroundColor: '#F4FBFB', // Solid opaque light mint to prevent Android shadow bleeding
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
    backgroundColor: '#F4FBFB', // Solid opaque light mint to prevent Android shadow bleeding
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 32, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  choiceSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 20,
    ...shadows.lg,
  },
  choiceDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  choiceHeader: {
    marginBottom: spacing.xl,
  },
  choiceTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  choiceSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  choiceOptionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  choiceOptionCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
  },
  choiceOptionIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  choiceOptionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  choiceOptionDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  choiceCancelButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCancelButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: '#000000',
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraModeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
    letterSpacing: 2,
  },
  cameraFlashBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFlashBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cameraViewfinder: {
    flex: 1,
    aspectRatio: 3 / 4,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraMockBg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridRowMiddleRow: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridCell: {
    flex: 1,
  },
  gridCellMiddleCol: {
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cameraFocusCursor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  cameraFocusRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#FFE177',
    borderStyle: 'dashed',
  },
  cameraFocusText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: '#FFE177',
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cameraFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  cameraBottomBar: {
    height: 120,
    backgroundColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  cameraAlbumPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222222',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  cameraAlbumThumb: {
    width: '100%',
    height: '100%',
  },
  cameraAlbumEmpty: {
    flex: 1,
  },
  cameraShutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.textInverse,
  },
  cameraFlipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFlipText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.textInverse,
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  galleryCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  galleryTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  gallerySubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gallerySelectionCount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  galleryScroll: {
    padding: spacing.xl,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  galleryGridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    ...shadows.sm,
  },
  galleryGridItemActive: {
    borderColor: colors.primary,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryCheckboxActive: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  galleryCheckboxText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.textInverse,
  },
  galleryBottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  galleryImportBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  galleryImportBtnDisabled: {
    backgroundColor: colors.border,
  },
  galleryImportBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  headerSpacer: {
    width: 40,
  },
});
