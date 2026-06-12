import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  ArrowLeft,
  DownloadSimple,
  UploadSimple,
  Ticket,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet as WalletIcon,
  Trash,
  CreditCard,
  Phone,
  CheckCircle,
} from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

// -- Types
interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'payment' | 'refund';
  amount: number;
  date: string;
  title: string;
  status: 'success' | 'pending' | 'failed';
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'momo' | 'vnpay';
  brand?: string;
  cardNumberMasked?: string;
  cardHolder?: string;
  phoneNumber?: string;
  providerName?: string;
  isDefault: boolean;
}

// -- Mock Data
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-001', type: 'payment', amount: -150000, date: 'Oct 24, 2026 • 14:30', title: 'Bus Ticket (Ho Chi Minh → Sapa)', status: 'success' },
  { id: 'TXN-002', type: 'deposit', amount: 500000, date: 'Oct 22, 2026 • 09:15', title: 'Top Up via VNPay', status: 'success' },
  { id: 'TXN-003', type: 'refund', amount: 150000, date: 'Oct 20, 2026 • 18:00', title: 'Refund for Canceled Ticket', status: 'success' },
];

export function WalletScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  // -- State
  const [balance, setBalance] = useState(1500000);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'card', brand: 'visa', cardNumberMasked: '•••• •••• •••• 4242', cardHolder: 'VIET THONG', isDefault: true },
    { id: '2', type: 'momo', phoneNumber: '0987 *** 321', providerName: 'Momo Wallet', isDefault: false },
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
  };

  const handleDeleteMethod = (id: string) => {
    Alert.alert('Delete Payment Method', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
          setPaymentMethods(prev => prev.filter(m => m.id !== id));
      }},
    ]);
  };

  // -- Rendering
  const renderTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': case 'refund': return <ArrowDownLeft size={20} color={colors.success} weight="bold" />;
      case 'payment': return <Ticket size={20} color={colors.primary} weight="bold" />;
      case 'withdraw': return <ArrowUpRight size={20} color={colors.error} weight="bold" />;
    }
  };

  return (
    <View style={styles.root}>
      {/* Gradient */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="walletGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.15} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#walletGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.textPrimary} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet & Payments</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 1. BALANCE CARD */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <WalletIcon size={24} color={colors.primary} weight="duotone" />
              <Text style={styles.balanceTitle}>VietRide Wallet</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountText}>{balance.toLocaleString()}</Text>
              <Text style={styles.currencyText}>đ</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('TopUp')} activeOpacity={0.85}>
                <View style={styles.actionIconBg}>
                  <DownloadSimple size={20} color={colors.primary} weight="bold" />
                </View>
                <Text style={styles.actionText}>Top Up</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Withdraw')} activeOpacity={0.85}>
                <View style={styles.actionIconBg}>
                  <UploadSimple size={20} color={colors.primary} weight="bold" />
                </View>
                <Text style={styles.actionText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. LINKED PAYMENT METHODS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Linked Methods</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddPaymentMethod')}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
             <Text style={styles.emptyText}>No saved payment methods yet.</Text>
          ) : (
            paymentMethods.map(method => (
              <TouchableOpacity key={method.id} style={[styles.paymentCard, method.isDefault && styles.defaultPaymentCard]} onPress={() => handleSetDefault(method.id)} activeOpacity={0.8}>
                <View style={styles.paymentCardRow}>
                  <View style={styles.brandIconContainer}>
                    {method.type === 'card' ? (
                      <CreditCard size={24} color={colors.primary} weight="duotone" />
                    ) : (
                      <Phone size={24} color={colors.success} weight="duotone" />
                    )}
                  </View>
                  <View style={styles.cardDetails}>
                    <Text style={styles.brandName}>{method.type === 'card' ? method.brand?.toUpperCase() : method.providerName}</Text>
                    <Text style={styles.cardNumber}>{method.type === 'card' ? method.cardNumberMasked : method.phoneNumber}</Text>
                  </View>
                  <View style={styles.actionIconsRow}>
                    {method.isDefault && <CheckCircle size={24} color={colors.primary} weight="fill" />}
                    <TouchableOpacity onPress={() => handleDeleteMethod(method.id)} style={{ padding: spacing.xs, marginLeft: spacing.sm }}>
                      <Trash size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* 3. TRANSACTION HISTORY */}
          <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>
          {transactions.map(item => {
            const isPositive = item.amount > 0;
            return (
              <View key={item.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: isPositive ? '#E6F8EB' : colors.primaryFaded }]}>
                    {renderTransactionIcon(item.type)}
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.transactionDate}>{item.date}</Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[styles.transactionAmount, { color: isPositive ? colors.success : colors.textPrimary }]}>
                    {isPositive ? '+' : ''}{item.amount.toLocaleString()} đ
                  </Text>
                  {item.status === 'pending' && <Text style={styles.pendingText}>Pending</Text>}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAF9' },
  gradientContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, zIndex: 0 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.divider, ...shadows.sm },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  
  balanceCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl, ...shadows.sm, marginBottom: spacing.xl, borderWidth: 1, borderColor: 'rgba(42, 193, 188, 0.2)' },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  balanceTitle: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.xl },
  amountText: { fontFamily: fontFamilies.bold, fontSize: 36, color: colors.textPrimary },
  currencyText: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textSecondary, marginLeft: spacing.xs },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.lg },
  actionButton: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 },
  actionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryFaded, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  actionText: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, color: colors.textPrimary },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary },
  addText: { fontFamily: fontFamilies.semiBold, fontSize: fontSizes.md, color: colors.primary },
  
  paymentCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm },
  defaultPaymentCard: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
  paymentCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandIconContainer: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardDetails: { flex: 1, justifyContent: 'center' },
  actionIconsRow: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontFamily: fontFamilies.bold, fontSize: fontSizes.md, color: colors.textPrimary },
  cardNumber: { fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, marginLeft: 60 },
  defaultText: { fontFamily: fontFamilies.medium, fontSize: fontSizes.xs, color: colors.primary, marginLeft: spacing.xs },
  emptyText: { fontFamily: fontFamilies.regular, fontSize: fontSizes.md, color: colors.textTertiary, textAlign: 'center', marginVertical: spacing.md },

  transactionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider, ...shadows.sm },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  transactionDetails: { flex: 1 },
  transactionTitle: { fontFamily: fontFamilies.semiBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: 2 },
  transactionDate: { fontFamily: fontFamilies.regular, fontSize: 11, color: colors.textSecondary },
  transactionRight: { alignItems: 'flex-end' },
  transactionAmount: { fontFamily: fontFamilies.bold, fontSize: fontSizes.md },
  pendingText: { fontFamily: fontFamilies.medium, fontSize: 10, color: colors.warning, marginTop: 2 },
});
