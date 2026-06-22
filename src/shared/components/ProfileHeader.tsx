import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

export interface ProfileHeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
  showNotificationButton?: boolean;
  onNotificationPress?: () => void;
  userName?: string;
  greeting?: string;
  avatarSource?: any;
}

export function ProfileHeader({
  showBackButton = true,
  onBackPress,
  showNotificationButton = true,
  onNotificationPress,
  userName = 'Guest',
  greeting = 'Xin chào,',
  avatarSource = require('../../assets/images/Avatar.png'),
}: ProfileHeaderProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

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
      navigation.navigate('Notification');
    }
  };

  return (
    <View style={styles.topProfileBar}>
      <View style={styles.profileRow}>
        {showBackButton && navigation.canGoBack() && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>
        )}
        <Image source={avatarSource} style={styles.headerAvatar} />
        <View style={styles.profileTextContainer}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userNameText}>{userName}</Text>
        </View>
      </View>
      
      {showNotificationButton && (
        <Pressable
          onPress={handleNotification}
          style={({ pressed }) => [
            styles.bellButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Bell size={22} color={theme.colors.textPrimary} />
        </Pressable>
      )}
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
  bellButton: {
    ...theme.components.headerButton,
    width: 40,
    height: 40,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
