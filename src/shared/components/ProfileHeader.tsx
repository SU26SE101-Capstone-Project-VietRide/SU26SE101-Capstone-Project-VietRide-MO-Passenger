import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ArrowLeft, Bell } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { UserAvatar } from '@shared/components/UserAvatar';
import type { AppTheme } from '@shared/theme';
import type { RootStackParamList } from '@app/navigation/types';

export interface ProfileHeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotificationButton?: boolean;
  onNotificationPress?: () => void;
  notificationBadgeCount?: number;
  userName?: string;
  greeting?: string;
}

export function ProfileHeader({
  showBackButton = true,
  onBackPress,
  showNotificationButton = true,
  onNotificationPress,
  notificationBadgeCount = 0,
  userName,
  greeting,
}: ProfileHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resolvedUserName =
    authUser?.fullName
    || authUser?.displayName
    || userName
    || t('shared.profileHeader.defaultUserName');
  const resolvedGreeting = greeting ?? t('shared.profileHeader.greeting');
  const shouldShowGreeting = isAuthenticated && resolvedUserName.trim().length > 0;
  const normalizedNotificationBadgeCount = Number.isFinite(notificationBadgeCount)
    ? Math.max(0, Math.floor(notificationBadgeCount))
    : 0;
  const hasNotificationBadge = normalizedNotificationBadgeCount > 0;
  const notificationBadgeLabel = normalizedNotificationBadgeCount > 99
    ? '99+'
    : String(normalizedNotificationBadgeCount);
  const notificationAccessibilityLabel = hasNotificationBadge
    ? `${t('profile.notifications')}. ${t('notification.unreadCount', {
        count: normalizedNotificationBadgeCount,
      })}`
    : t('profile.notifications');

  const handleAuthPress = useCallback(() => {
    navigation.navigate('Auth', { screen: 'Login' });
  }, [navigation]);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      navigation.navigate('Main', { screen: 'Notification' });
    }
  };

  return (
    <View style={styles.topProfileBar}>
      <View style={styles.profileRow}>
        {showBackButton && navigation.canGoBack() ? (
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}
        <UserAvatar url={authUser?.avatarUrl} name={resolvedUserName} size={44} />
        {shouldShowGreeting ? (
          <View style={styles.profileTextContainer}>
            <Text style={styles.greetingText}>{resolvedGreeting}</Text>
            <Text style={styles.userNameText} numberOfLines={1}>
              {resolvedUserName}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityLabel={t('shared.profileHeader.authenticationAction')}
            accessibilityRole="button"
            onPress={handleAuthPress}
            style={({ pressed }) => [
              styles.authPromptButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.authPromptEyebrow}>
              {t('shared.profileHeader.signedOut')}
            </Text>
            <Text style={styles.authPromptText} numberOfLines={1}>
              {t('shared.profileHeader.authenticationAction')}
            </Text>
          </Pressable>
        )}
      </View>
      
      {showNotificationButton ? (
        <Pressable
          accessibilityLabel={notificationAccessibilityLabel}
          accessibilityRole="button"
          onPress={handleNotification}
          style={({ pressed }) => [
            styles.bellButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.notificationIconAnchor}>
            <Bell size={22} color={theme.colors.textPrimary} />
            {hasNotificationBadge ? (
              <View
                pointerEvents="none"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.notificationBadge}
              >
                <Text style={styles.notificationBadgeText}>
                  {notificationBadgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  topProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    ...theme.components.headerButton,
    width: 36,
    height: 36,
    marginRight: 4,
  },
  profileTextContainer: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  greetingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  userNameText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  authPromptButton: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.xs,
  },
  authPromptEyebrow: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  authPromptText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  bellButton: {
    ...theme.components.headerButton,
    width: 40,
    height: 40,
    overflow: 'visible',
  },
  notificationIconAnchor: {
    position: 'relative',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -7,
    right: -9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    zIndex: 2,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    lineHeight: 12,
    letterSpacing: -0.2,
    includeFontPadding: false,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
} as const);
