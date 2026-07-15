import React, { useCallback } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { ArrowLeft, Bell } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { AppTheme } from '@shared/theme';
import type { RootStackParamList } from '@app/navigation/types';

export interface ProfileHeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotificationButton?: boolean;
  onNotificationPress?: () => void;
  userName?: string;
  greeting?: string;
  avatarSource?: ImageSourcePropType;
}

export function ProfileHeader({
  showBackButton = true,
  onBackPress,
  showNotificationButton = true,
  onNotificationPress,
  userName,
  greeting = 'Xin chào,',
  avatarSource = require('../../assets/images/Avatar.png'),
}: ProfileHeaderProps): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const resolvedUserName =
    authUser?.fullName || authUser?.displayName || userName || 'VietRide Passenger';
  const shouldShowGreeting = isAuthenticated && resolvedUserName.trim().length > 0;

  const handleAuthPress = useCallback(() => {
    logout().catch((error) => {
      if (__DEV__) {
        console.warn('[Auth] Unable to open auth flow from profile header:', error);
      }
    });
  }, [logout]);

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
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}
        <Image source={avatarSource} style={styles.headerAvatar} />
        {shouldShowGreeting ? (
          <View style={styles.profileTextContainer}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.userNameText} numberOfLines={1}>
              {resolvedUserName}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleAuthPress}
            style={({ pressed }) => [
              styles.authPromptButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.authPromptEyebrow}>Bạn chưa đăng nhập</Text>
            <Text style={styles.authPromptText} numberOfLines={1}>
              Đăng nhập / Đăng ký
            </Text>
          </Pressable>
        )}
      </View>
      
      {showNotificationButton ? (
        <Pressable
          onPress={handleNotification}
          style={({ pressed }) => [
            styles.bellButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Bell size={22} color={theme.colors.textPrimary} />
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
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
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
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
} as const);
