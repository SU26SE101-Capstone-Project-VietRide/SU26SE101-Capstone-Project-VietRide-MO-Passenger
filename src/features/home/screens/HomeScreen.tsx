import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ProfileHeader } from '@shared/components';

// Subcomponents
import { WalletCard } from '../components/WalletCard';
import { ServiceGrid } from '../components/ServiceGrid';
import { NewsPromos } from '../components/NewsPromos';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const fullName = user?.fullName || 'Viết Thông';

  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);

  const handleTopUp = useCallback(() => {
    console.log('Top Up pressed');
  }, []);

  const handleDeposit = useCallback(() => {
    console.log('Deposit pressed');
  }, []);

  const handleWithdraw = useCallback(() => {
    console.log('Withdraw pressed');
  }, []);

  const handleHistory = useCallback(() => {
    console.log('History pressed');
  }, []);

  const handleBuyTickets = useCallback(() => {
    navigation.navigate('Booking', { screen: 'SearchRoutes' });
  }, [navigation]);

  const handleBuses = useCallback(() => {
    console.log('Buses pressed');
  }, []);

  const handleDelivery = useCallback(() => {
    navigation.navigate('Parcel', { screen: 'ParcelList' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9ff" />

      {/* Decorative Mint Green Ambient Background Glow */}
      <View style={styles.ambientGlow} />

      {/* Header - TopAppBar */}
      <ProfileHeader
        showBackButton={false}
        userName={fullName}
        onNotificationPress={handleNotificationPress}
      />

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Wallet Section */}
        <WalletCard
          onTopUp={handleTopUp}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
          onHistory={handleHistory}
        />

        {/* Services Bento Grid */}
        <ServiceGrid
          onBuyTickets={handleBuyTickets}
          onDelivery={handleDelivery}
        />

        {/* News & Promotions */}
        <NewsPromos />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F9FF', // Linear gradient background fall back
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(42, 193, 188, 0.12)',
    width: 585,
    height: 585,
    borderRadius: 9999,
    top: -176.8,
    left: -97.5,
    zIndex: 0,
    transform: [{ scale: 1.0 }],
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    zIndex: 5,
  },
});
