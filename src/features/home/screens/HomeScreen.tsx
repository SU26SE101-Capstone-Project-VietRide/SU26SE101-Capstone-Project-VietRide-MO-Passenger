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
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { Bell } from 'phosphor-react-native';

// Subcomponents
import { WalletCard } from '../components/WalletCard';
import { ServiceGrid } from '../components/ServiceGrid';
import { NewsPromos } from '../components/NewsPromos';

export function HomeScreen(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const fullName = user?.fullName || 'Viết Thông';

  const handleNotificationPress = useCallback(() => {
    console.log('Notifications pressed');
  }, []);

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
    console.log('Buy Tickets pressed');
  }, []);

  const handleBuses = useCallback(() => {
    console.log('Buses pressed');
  }, []);

  const handleDelivery = useCallback(() => {
    console.log('Delivery pressed');
  }, []);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9ff" />

      {/* Decorative Mint Green Ambient Background Glow */}
      <View style={styles.ambientGlow} />

      {/* Header - TopAppBar */}
      <View style={styles.header}>
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?img=11' }}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingLight}>Xin chào,</Text>
            <Text style={styles.greetingName}>{fullName}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleNotificationPress}
          activeOpacity={0.7}
          style={styles.notificationButton}
        >
          <Bell size={24} color="#3c4948" weight="regular" />
        </TouchableOpacity>
      </View>

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
          onBuses={handleBuses}
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
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
    width: '100%',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    backgroundColor: '#e0e3e8',
    borderRadius: borderRadius.full,
    width: 40,
    height: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  greetingTextContainer: {
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  greetingLight: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: '#3c4948',
    lineHeight: 14.4,
  },
  greetingName: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: '#3c4948',
    lineHeight: 14.4,
    marginTop: 2,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    zIndex: 5,
  },
});
