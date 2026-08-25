import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ArrowLeft, Bell } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { UserAvatar } from '@shared/components/UserAvatar';
import type { AppTheme } from '@shared/theme';
import type { RootStackParamList } from '@app/navigation/types';
import {
  getNotificationBadgePresentation,
  NotificationCountBadge,
} from './NotificationCountBadge';

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
  const { contentPaddingHorizontal } = useResponsiveLayout();
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resolvedUserName =
    authUser?.fullName
    || authUser?.displayName
    || userName
    || t('shared.profileHeader.defaultUserName');
  const resolvedGreeting = greeting ?? t('shared.profileHeader.greeting');
  const shouldShowGreeting = isAuthenticated && resolvedUserName.trim().length > 0;
  const notificationBadge = getNotificationBadgePresentation(notificationBadgeCount);
  const notificationAccessibilityLabel = notificationBadge
    ? `${t('profile.notifications')}. ${t('notification.unreadCount', {
        count: notificationBadge.count,
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
    <View style={[styles.topProfileBar, { paddingHorizontal: contentPaddingHorizontal }]}>
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
            {notificationBadge ? (
              <NotificationCountBadge
                backgroundColor={theme.colors.error}
                borderColor={theme.effects.isLiquid
                  ? theme.effects.glassSurfaceStrong
                  : theme.colors.surfaceAlt}
                count={notificationBadge.count}
                style={styles.notificationBadgePosition}
              />
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
    width: 44,
    height: 44,
    flexShrink: 0,
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
    width: 44,
    height: 44,
    flexShrink: 0,
    overflow: 'visible',
  },
  notificationIconAnchor: {
    position: 'relative',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgePosition: {
    position: 'absolute',
    top: -7,
    right: -9,
    zIndex: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
} as const);
