import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CaretRight,
  ClockCounterClockwise,
  DeviceMobile,
  Key,
  ShieldCheck,
  WarningCircle,
} from 'phosphor-react-native';

import type { ProfileStackParamList } from '@app/navigation/types';
import { Button } from '@shared/components';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import { getApiErrorMessage, toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { listLoginSessions } from '../api/profileApi';

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;

const PROFILE_BOTTOM_CONTENT_GAP = spacing.huge;

const platformLabel = Platform.select({
  ios: 'iOS',
  android: 'Android',
  default: 'Mobile',
});

export function SecurityScreen(): React.JSX.Element {
  const navigation = useNavigation<ProfileNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const handleTabBarScroll = useTabBarScrollBehavior();
  const user = useAuthStore((state) => state.user);
  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + PROFILE_BOTTOM_CONTENT_GAP;

  const sessionsQuery = useQuery({
    queryKey: ['profile', 'security', 'sessions'],
    queryFn: listLoginSessions,
    enabled: false,
    retry: false,
  });

  const handleCheckSessions = async () => {
    try {
      await sessionsQuery.refetch();
    } catch (error) {
      Alert.alert('Chưa thể tải phiên đăng nhập', getApiErrorMessage(error));
    }
  };

  const sessionError = sessionsQuery.error ? toApiError(sessionsQuery.error) : null;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Bảo mật</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={28} color={theme.colors.primary} weight="fill" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Thông tin bảo mật tài khoản</Text>
            <Text style={styles.heroText}>
              Các mục nhạy cảm sẽ chỉ hiển thị dữ liệu thật từ backend hoặc từ phiên hiện tại trên thiết bị.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.card}>
            <InfoRow label="Email đăng nhập" value={user?.email || 'Chưa có'} />
            <View style={styles.rowDivider} />
            <InfoRow label="Trạng thái" value={user?.status || 'Không rõ'} />
            <View style={styles.rowDivider} />
            <Pressable
              style={styles.actionRow}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIcon}>
                  <Key size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionLabel}>Đổi mật khẩu</Text>
                  <Text style={styles.actionDesc}>Chuẩn bị sẵn API change-password</Text>
                </View>
              </View>
              <CaretRight size={16} color={theme.colors.textTertiary} weight="bold" />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thiết bị hiện tại</Text>
          <View style={styles.card}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceIcon}>
                <DeviceMobile size={22} color={theme.colors.primary} weight="fill" />
              </View>
              <View style={styles.deviceCopy}>
                <Text style={styles.deviceTitle}>{platformLabel} device</Text>
                <Text style={styles.deviceMeta}>Đang dùng phiên đăng nhập hiện tại</Text>
              </View>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thiết bị đã đăng nhập</Text>
          <View style={styles.card}>
            {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
              sessionsQuery.data.map((session, index) => (
                <React.Fragment key={session.id}>
                  <View style={styles.deviceRow}>
                    <View style={styles.deviceIcon}>
                      <DeviceMobile size={22} color={theme.colors.primary} weight="fill" />
                    </View>
                    <View style={styles.deviceCopy}>
                      <Text style={styles.deviceTitle}>{session.deviceName}</Text>
                      <Text style={styles.deviceMeta}>
                        {session.platform || 'Unknown platform'} • {session.lastActiveAt || 'No activity time'}
                      </Text>
                    </View>
                  </View>
                  {index < sessionsQuery.data.length - 1 ? <View style={styles.rowDivider} /> : null}
                </React.Fragment>
              ))
            ) : (
              <View style={styles.emptyState}>
                <WarningCircle size={24} color={theme.colors.warning} weight="fill" />
                <Text style={styles.emptyTitle}>Chưa có public API cho danh sách phiên</Text>
                <Text style={styles.emptyText}>
                  BE hiện mới có internal device-token lookup, chưa có endpoint public để mobile xem
                  thiết bị đang đăng nhập hoặc lịch sử đăng nhập gần đây.
                </Text>
                {sessionError ? (
                  <Text style={styles.errorText}>{sessionError.message}</Text>
                ) : null}
                <Button
                  title="Kiểm tra backend"
                  variant="secondary"
                  size="sm"
                  loading={sessionsQuery.isFetching}
                  onPress={handleCheckSessions}
                  style={styles.checkButton}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đăng nhập gần đây</Text>
          <View style={styles.card}>
            <View style={styles.emptyState}>
              <ClockCounterClockwise size={24} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Chờ API audit/login activity</Text>
              <Text style={styles.emptyText}>
                UI đã có khung hiển thị, nhưng sẽ không tự tạo dữ liệu mẫu khi BE chưa trả dữ liệu thật.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  },
  heroCard: {
    ...theme.components.elevatedCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  heroText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  infoValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  actionDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xxs,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  deviceCopy: {
    flex: 1,
  },
  deviceTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  deviceMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xxs,
  },
  liveBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.primaryFaded,
  },
  liveBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  checkButton: {
    marginTop: spacing.md,
  },
});
