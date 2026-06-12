import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { Input, Button, LoadingOverlay } from '@shared/components';

export function AddPaymentMethodScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'card' | 'momo' | 'vnpay'>('card');
  const [loading, setLoading] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [walletPhone, setWalletPhone] = useState('');

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const matched = cleaned.match(/.{1,4}/g);
    return matched ? matched.join(' ') : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.length >= 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}` : cleaned;
  };

  const handleAddPayment = async () => {
    if (activeTab === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) return Alert.alert('Error', 'Invalid card number');
      if (!cardHolder.trim()) return Alert.alert('Error', 'Invalid holder name');
      if (expiry.length < 5) return Alert.alert('Error', 'Invalid expiry');
      if (cvv.length < 3) return Alert.alert('Error', 'Invalid CVV');
    } else {
      if (walletPhone.trim().length < 10) return Alert.alert('Error', 'Invalid phone number');
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    Alert.alert('Success', 'Payment method added!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'card' && styles.activeTabItem]} onPress={() => setActiveTab('card')}>
          <Text style={[styles.tabLabel, activeTab === 'card' && styles.activeTabLabel]}>Credit Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'momo' && styles.activeTabItem]} onPress={() => setActiveTab('momo')}>
          <Text style={[styles.tabLabel, activeTab === 'momo' && styles.activeTabLabel]}>Momo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'vnpay' && styles.activeTabItem]} onPress={() => setActiveTab('vnpay')}>
          <Text style={[styles.tabLabel, activeTab === 'vnpay' && styles.activeTabLabel]}>VNPay</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'card' ? (
          <>
            <Input label="Card Number" value={cardNumber} onChangeText={t => setCardNumber(formatCardNumber(t))} placeholder="4111 2222 3333 4444" keyboardType="numeric" maxLength={19} />
            <Input label="Card Holder Name" value={cardHolder} onChangeText={setCardHolder} placeholder="VIET THONG" autoCapitalize="characters" />
            <View style={styles.formRow}>
              <View style={styles.formCol}><Input label="Expiry Date" value={expiry} onChangeText={t => setExpiry(formatExpiry(t))} placeholder="MM/YY" keyboardType="numeric" maxLength={5} /></View>
              <View style={styles.formCol}><Input label="CVV" value={cvv} onChangeText={t => setCvv(t.replace(/\D/g, ''))} placeholder="123" keyboardType="numeric" secureTextEntry maxLength={3} /></View>
            </View>
          </>
        ) : (
          <>
            <Input label="Wallet Registered Phone" value={walletPhone} onChangeText={t => setWalletPhone(t.replace(/\D/g, ''))} placeholder="0987654321" keyboardType="numeric" maxLength={11} />
            <Text style={styles.walletHint}>VietRide will verify this number via secure SMS linkage with your wallet provider.</Text>
          </>
        )}
        <Button title="Add Method" onPress={handleAddPayment} fullWidth style={{ marginTop: spacing.md }} />
      </ScrollView>
      {loading && <LoadingOverlay visible />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tabItem: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, color: colors.textSecondary },
  activeTabLabel: { color: colors.primary },
  content: { padding: spacing.xl },
  formRow: { flexDirection: 'row', justifyContent: 'space-between' },
  formCol: { width: '47%' },
  walletHint: { fontFamily: fontFamilies.regular, fontSize: fontSizes.xs, color: colors.textTertiary, lineHeight: 16, marginBottom: spacing.lg },
});
