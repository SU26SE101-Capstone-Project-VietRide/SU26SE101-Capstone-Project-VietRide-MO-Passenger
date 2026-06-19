import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, CreditCard, Phone, CheckCircle } from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { Input, Button, LoadingOverlay } from '@shared/components';

export function WithdrawScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const balance = 1500000;

  // Hardcoded for now to match Wallet state structure
  const paymentMethods = [
    { id: '1', type: 'card', brand: 'visa', cardNumberMasked: '•••• •••• •••• 4242', providerName: 'Visa' },
    { id: '2', type: 'momo', phoneNumber: '0987 *** 321', providerName: 'Momo Wallet' },
  ];
  const [selectedDest, setSelectedDest] = useState<string | null>(paymentMethods[0]?.id || null);

  const handleConfirmWithdraw = async () => {
    const amt = parseInt(amount.replace(/\D/g, ''), 10);
    if (!amt || amt < 50000) {
      Alert.alert('Error', 'Minimum withdrawal amount is 50,000 đ');
      return;
    }
    if (amt > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }
    if (!selectedDest) {
      Alert.alert('Error', 'Please select a destination');
      return;
    }

    setLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    
    Alert.alert('Success', 'Withdrawal requested successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Amount (đ)"
          value={amount}
          onChangeText={text => setAmount(text.replace(/\D/g, ''))}
          placeholder="Enter amount (Min 50,000 đ)"
          keyboardType="numeric"
        />
        <View style={styles.presetRow}>
          {[100000, 500000].map(amt => (
            <Pressable key={amt} style={styles.presetBadge} onPress={() => setAmount(amt.toString())}>
              <Text style={styles.presetText}>{amt.toLocaleString()} đ</Text>
            </Pressable>
          ))}
          <Pressable style={styles.presetBadge} onPress={() => setAmount(balance.toString())}>
            <Text style={styles.presetText}>Max: {balance.toLocaleString()} đ</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Withdraw To</Text>
        {paymentMethods.map(method => (
          <Pressable 
            key={method.id} 
            style={[styles.fundingCard, selectedDest === method.id ? styles.fundingCardActive : null]}
            onPress={() => setSelectedDest(method.id)}
          >
            <View style={styles.brandIconContainer}>
              {method.type === 'card' ? <CreditCard size={24} color={theme.colors.primary} /> : <Phone size={24} color={theme.colors.success} />}
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.brandName}>{method.type === 'card' ? method.brand?.toUpperCase() : method.providerName}</Text>
              <Text style={styles.cardNumber}>{method.type === 'card' ? method.cardNumberMasked : method.phoneNumber}</Text>
            </View>
            {selectedDest === method.id ? <CheckCircle size={24} color={theme.colors.primary} weight="fill" /> : null}
          </Pressable>
        ))}

        <Button title="Confirm Withdrawal" onPress={handleConfirmWithdraw} fullWidth style={{ marginTop: spacing.xl }} />
      </ScrollView>
      {loading ? <LoadingOverlay visible /> : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider },
  backBtn: { ...theme.components.headerButton, width: 40, height: 40, borderRadius: 20 },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: theme.colors.textPrimary },
  content: { padding: spacing.xl },
  presetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  presetBadge: { backgroundColor: theme.colors.primaryFaded, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, borderWidth: 1, borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.primaryFaded },
  presetText: { fontFamily: fontFamilies.semiBold, fontSize: fontSizes.sm, color: theme.colors.primary },
  sectionTitle: { fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, color: theme.colors.textPrimary },
  fundingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider },
  fundingCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryFaded },
  brandIconContainer: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardDetails: { flex: 1, justifyContent: 'center' },
  brandName: { fontFamily: fontFamilies.bold, fontSize: fontSizes.md, color: theme.colors.textPrimary },
  cardNumber: { fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
});
