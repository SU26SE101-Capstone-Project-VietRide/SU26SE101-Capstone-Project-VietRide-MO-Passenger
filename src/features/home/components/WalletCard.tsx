import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { DownloadSimple, UploadSimple, ClockCounterClockwise } from 'phosphor-react-native';

interface WalletCardProps {
  balance?: string;
  onTopUp?: () => void;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onHistory?: () => void;
}

export function WalletCard({
  balance = '1,500,000',
  onTopUp,
  onDeposit,
  onWithdraw,
  onHistory,
}: WalletCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.balanceContainer}>
          <Text style={styles.walletTitle}>VietRide Wallet</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.balanceAmount}>{balance}</Text>
            <Text style={styles.currencySymbol}>đ</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onTopUp}
          activeOpacity={0.8}
          style={styles.topUpButton}
        >
          <Text style={styles.topUpText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      {/* Divider and Actions Grid */}
      <View style={styles.actionsContainer}>
        {/* Deposit Button */}
        <TouchableOpacity
          onPress={onDeposit}
          activeOpacity={0.7}
          style={styles.actionButton}
        >
          <View style={styles.iconBackground}>
            <DownloadSimple size={24} color="#3c4948" weight="bold" />
          </View>
          <Text style={styles.actionText}>Deposit</Text>
        </TouchableOpacity>

        {/* Withdraw Button */}
        <TouchableOpacity
          onPress={onWithdraw}
          activeOpacity={0.7}
          style={styles.actionButton}
        >
          <View style={styles.iconBackground}>
            <UploadSimple size={24} color="#3c4948" weight="bold" />
          </View>
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>

        {/* History Button */}
        <TouchableOpacity
          onPress={onHistory}
          activeOpacity={0.7}
          style={styles.actionButton}
        >
          <View style={styles.iconBackground}>
            <ClockCounterClockwise size={24} color="#3c4948" weight="bold" />
          </View>
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '100%',
    ...shadows.md,
    marginVertical: spacing.md,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  balanceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  walletTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: '#3c4948',
    marginBottom: spacing.xxs,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: '#181c20',
  },
  currencySymbol: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: '#3c4948',
    marginLeft: spacing.xxs,
  },
  topUpButton: {
    backgroundColor: '#2ac1bc',
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUpText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: '#004a48',
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(224, 227, 232, 0.5)',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconBackground: {
    backgroundColor: '#ebeef3',
    borderRadius: borderRadius.lg,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: '#181c20',
    marginTop: 7,
    textAlign: 'center',
  },
});
