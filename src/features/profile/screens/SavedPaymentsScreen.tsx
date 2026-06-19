import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Plus,
  Trash,
  CreditCard,
  Phone,
  CheckCircle,
} from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { Input, Button, LoadingOverlay } from '@shared/components';
import type { PaymentMethod } from '../types';

export function SavedPaymentsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  // Mock list of initial payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      brand: 'visa',
      cardNumberMasked: '•••• •••• •••• 4242',
      cardHolder: 'VIET THONG',
      isDefault: true,
    },
    {
      id: '2',
      type: 'momo',
      phoneNumber: '0987 *** 321',
      providerName: 'Momo Wallet',
      isDefault: false,
    },
  ]);

  // Modal & Form States
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'momo' | 'vnpay'>('card');
  const [loading, setLoading] = useState(false);

  // Card Form Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Wallet Form Inputs
  const [walletPhone, setWalletPhone] = useState('');

  // Input Formatting Helpers
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const matched = cleaned.match(/.{1,4}/g);
    return matched ? matched.join(' ') : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  // Form Validation and Submission
  const handleAddPayment = async () => {
    if (activeTab === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        Alert.alert(t('common.error', 'Error'), t('profile.invalidCard', 'Please enter a valid card number'));
        return;
      }
      if (!cardHolder.trim()) {
        Alert.alert(t('common.error', 'Error'), t('profile.invalidHolder', 'Please enter card holder name'));
        return;
      }
      if (expiry.length < 5) {
        Alert.alert(t('common.error', 'Error'), t('profile.invalidExpiry', 'Please enter a valid expiry date (MM/YY)'));
        return;
      }
      if (cvv.length < 3) {
        Alert.alert(t('common.error', 'Error'), t('profile.invalidCvv', 'Please enter a valid CVV'));
        return;
      }
    } else {
      if (walletPhone.trim().length < 10) {
        Alert.alert(t('common.error', 'Error'), t('profile.invalidPhone', 'Please enter a valid mobile wallet phone number'));
        return;
      }
    }

    setLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    const newMethod: PaymentMethod = activeTab === 'card'
      ? {
          id: Date.now().toString(),
          type: 'card',
          brand: cardNumber.startsWith('5') ? 'mastercard' : 'visa',
          cardNumberMasked: `•••• •••• •••• ${cardNumber.replace(/\s/g, '').slice(-4)}`,
          cardHolder: cardHolder.toUpperCase(),
          isDefault: paymentMethods.length === 0,
        }
      : {
          id: Date.now().toString(),
          type: activeTab,
          phoneNumber: `${walletPhone.slice(0, 4)} *** ${walletPhone.slice(-3)}`,
          providerName: activeTab === 'momo' ? 'Momo Wallet' : 'VNPay QR',
          isDefault: paymentMethods.length === 0,
        };

    setPaymentMethods((prev) => [...prev, newMethod]);
    setLoading(false);
    setIsAddModalVisible(false);

    // Reset fields
    setCardNumber('');
    setCardHolder('');
    setExpiry('');
    setCvv('');
    setWalletPhone('');
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      t('profile.deletePayment', 'Delete Payment Method'),
      t('profile.deletePaymentConfirm', 'Are you sure you want to delete this payment method?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            setPaymentMethods((prev) => prev.filter((item) => item.id !== id));
          },
        },
      ]
    );
  }, [t]);

  const handleSetDefault = useCallback((id: string) => {
    setPaymentMethods((prev) =>
      prev.map((item) => ({ ...item, isDefault: item.id === id }))
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('profile.savedPayments', 'Saved Payments')}</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionSubtitle}>
          {t('profile.paymentsDesc', 'Select or manage your primary express checkouts')}
        </Text>

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CreditCard size={48} color={theme.colors.textTertiary} weight="thin" />
            <Text style={styles.emptyText}>
              {t('profile.noPaymentMethods', 'No saved payment methods yet.')}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paymentMethods.map((method) => (
              <Pressable
                key={method.id}
                style={[
                  styles.paymentCard,
                  method.isDefault ? styles.defaultPaymentCard : null,
                ]}
                onPress={() => handleSetDefault(method.id)}
              >
                {/* Brand / Logo indicators */}
                <View style={styles.cardHeader}>
                  <View style={styles.brandRow}>
                    <View style={styles.brandIconContainer}>
                      {method.type === 'card' ? (
                        <CreditCard size={24} color={theme.colors.primary} weight="duotone" />
                      ) : (
                        <Phone size={24} color={theme.colors.success} weight="duotone" />
                      )}
                    </View>
                    <View style={styles.cardDetails}>
                      <Text style={styles.brandName}>
                        {method.type === 'card'
                          ? method.brand?.toUpperCase()
                          : method.providerName}
                      </Text>
                      <Text style={styles.cardNumber}>
                        {method.type === 'card'
                          ? method.cardNumberMasked
                          : method.phoneNumber}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Delete Button */}
                  <Pressable
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(method.id);
                    }}
                  >
                    <Trash size={18} color={theme.colors.error} />
                  </Pressable>
                </View>

                {method.type === 'card' ? (
                  <Text style={styles.holderName}>{method.cardHolder}</Text>
                ) : null}

                {/* Default indicator */}
                {method.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <CheckCircle size={14} color={theme.colors.primary} weight="fill" />
                    <Text style={styles.defaultText}>
                      {t('profile.primary', 'Primary Method')}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        {/* Add Payment Button */}
        <Pressable
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Plus size={20} color={theme.colors.textInverse} weight="bold" />
          <Text style={styles.addButtonText}>
            {t('profile.addPaymentMethod', 'Add Payment Method')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Add Payment Method Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay} edges={['bottom']}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderBar} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>
                  {t('profile.addMethod', 'Add Payment Method')}
                </Text>
                <Pressable
                  onPress={() => setIsAddModalVisible(false)}
                >
                  <Text style={styles.closeText}>{t('common.cancel', 'Cancel')}</Text>
                </Pressable>
              </View>
            </View>

            {/* Selection Tabs */}
            <View style={styles.tabBar}>
              <Pressable
                style={[styles.tabItem, activeTab === 'card' ? styles.activeTabItem : null]}
                onPress={() => setActiveTab('card')}
              >
                <Text style={[styles.tabLabel, activeTab === 'card' ? styles.activeTabLabel : null]}>
                  Credit Card
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabItem, activeTab === 'momo' ? styles.activeTabItem : null]}
                onPress={() => setActiveTab('momo')}
              >
                <Text style={[styles.tabLabel, activeTab === 'momo' ? styles.activeTabLabel : null]}>
                  Momo Wallet
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabItem, activeTab === 'vnpay' ? styles.activeTabItem : null]}
                onPress={() => setActiveTab('vnpay')}
              >
                <Text style={[styles.tabLabel, activeTab === 'vnpay' ? styles.activeTabLabel : null]}>
                  VNPay
                </Text>
              </Pressable>
            </View>

            {/* Form Fields */}
            <ScrollView
              contentContainerStyle={styles.modalFormContent}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === 'card' ? (
                <View>
                  <Input
                    label={t('profile.cardNumberLabel', 'Card Number')}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    placeholder="4111 2222 3333 4444"
                    keyboardType="numeric"
                    maxLength={19}
                  />

                  <Input
                    label={t('profile.cardHolderLabel', 'Card Holder Name')}
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    placeholder="VIET THONG"
                    autoCapitalize="characters"
                  />

                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Input
                        label={t('profile.expiryLabel', 'Expiry Date')}
                        value={expiry}
                        onChangeText={(text) => setExpiry(formatExpiry(text))}
                        placeholder="MM/YY"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Input
                        label={t('profile.cvvLabel', 'CVV')}
                        value={cvv}
                        onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
                        placeholder="123"
                        keyboardType="numeric"
                        secureTextEntry
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  <Input
                    label={t('profile.walletPhoneLabel', 'Wallet Registered Phone')}
                    value={walletPhone}
                    onChangeText={(text) => setWalletPhone(text.replace(/\D/g, ''))}
                    placeholder="0987654321"
                    keyboardType="numeric"
                    maxLength={11}
                  />
                  <Text style={styles.walletHint}>
                    VietRide will verify this number via secure SMS linkage with your wallet provider.
                  </Text>
                </View>
              )}

              <Button
                title={t('common.confirm', 'Add Method')}
                onPress={handleAddPayment}
                fullWidth
                style={styles.modalSubmitButton}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {loading ? <LoadingOverlay visible /> : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xl,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
    marginTop: spacing.md,
  },
  listContainer: {
    marginBottom: spacing.xl,
  },
  paymentCard: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.border,
    ...theme.effects.cardShadow,
  },
  defaultPaymentCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardDetails: {
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  cardNumber: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  holderName: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  defaultText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginLeft: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...theme.effects.cardShadow,
    marginTop: spacing.sm,
  },
  addButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
    marginLeft: spacing.sm,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.effects.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    height: '80%',
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    borderBottomWidth: 0,
    ...theme.effects.floatingShadow,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  modalHeaderBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  modalTitleRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  closeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  tabLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  activeTabLabel: {
    color: theme.colors.primary,
  },
  modalFormContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formCol: {
    width: '47%',
  },
  walletHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    lineHeight: 16,
    marginBottom: spacing.lg,
  },
  modalSubmitButton: {
    marginTop: spacing.md,
  },
});
