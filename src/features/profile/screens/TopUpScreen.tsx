import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CreditCard, Phone, CheckCircle } from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { Input, Button, LoadingOverlay } from '@shared/components';

export function TopUpScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Hardcoded for now to match Wallet state structure, in a real app this would be global state
  const paymentMethods = [
    { id: '1', type: 'card', brand: 'visa', cardNumberMasked: '•••• •••• •••• 4242', providerName: 'Visa' },
    { id: '2', type: 'momo', phoneNumber: '0987 *** 321', providerName: 'Momo Wallet' },
  ];
  const [selectedFundingSource, setSelectedFundingSource] = useState<string | null>(paymentMethods[0]?.id || null);

  const handleConfirmTopUp = async () => {
    const amt = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amt || amt < 10000) {
      Alert.alert('Error', 'Minimum top-up amount is 10,000 đ');
      return;
    }
    if (!selectedFundingSource) {
      Alert.alert('Error', 'Please select a funding source');
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    
    Alert.alert('Success', 'Top up successful!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Up Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Amount (đ)"
          value={amount}
          onChangeText={text => setAmount(text.replace(/\D/g, ''))}
          placeholder="Enter amount (Min 10,000 đ)"
          keyboardType="numeric"
        />
        <View style={styles.presetRow}>
          {[100000, 200000, 500000].map(amt => (
            <TouchableOpacity key={amt} style={styles.presetBadge} onPress={() => setAmount(amt.toString())}>
              <Text style={styles.presetText}>{amt.toLocaleString()} đ</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Funding Source</Text>
        {paymentMethods.map(method => (
          <TouchableOpacity 
            key={method.id} 
            style={[styles.fundingCard, selectedFundingSource === method.id && styles.fundingCardActive]}
            onPress={() => setSelectedFundingSource(method.id)}
            activeOpacity={0.7}
          >
            <View style={styles.brandIconContainer}>
              {method.type === 'card' ? <CreditCard size={24} color={colors.primary} /> : <Phone size={24} color={colors.success} />}
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.brandName}>{method.type === 'card' ? method.brand?.toUpperCase() : method.providerName}</Text>
              <Text style={styles.cardNumber}>{method.type === 'card' ? method.cardNumberMasked : method.phoneNumber}</Text>
            </View>
            {selectedFundingSource === method.id && <CheckCircle size={24} color={colors.primary} weight="fill" />}
          </TouchableOpacity>
        ))}

        <Button title="Confirm Top Up" onPress={handleConfirmTopUp} fullWidth style={{ marginTop: spacing.xl }} />
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
  content: { padding: spacing.xl },
  presetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  presetBadge: { backgroundColor: colors.primaryFaded, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.full },
  presetText: { fontFamily: fontFamilies.semiBold, fontSize: fontSizes.sm, color: colors.primary },
  sectionTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: colors.textPrimary },
  fundingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.divider },
  fundingCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
  brandIconContainer: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardDetails: { flex: 1, justifyContent: 'center' },
  brandName: { fontFamily: fontFamilies.bold, fontSize: fontSizes.md, color: colors.textPrimary },
  cardNumber: { fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
});
