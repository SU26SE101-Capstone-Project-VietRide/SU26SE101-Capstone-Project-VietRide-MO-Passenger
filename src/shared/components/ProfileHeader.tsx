import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';

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
  userName = 'Viết Thông',
  greeting = 'Xin chào,',
  avatarSource = require('../../assets/images/Avatar.png'),
}: ProfileHeaderProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');

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
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={[styles.backButton, isLiquid && { backgroundColor: theme.glassOverlay }]}
          >
            <ArrowLeft size={22} color={theme.isDark ? '#FFF' : colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Image source={avatarSource} style={styles.headerAvatar} />
        <View style={styles.profileTextContainer}>
          <Text style={[styles.greetingText, { color: theme.isDark ? '#EBEBF5' : colors.textSecondary }]}>{greeting}</Text>
          <Text style={[styles.userNameText, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{userName}</Text>
        </View>
      </View>
      
      {showNotificationButton && (
        <TouchableOpacity
          onPress={handleNotification}
          style={[styles.bellButton, isLiquid && { backgroundColor: theme.glassOverlay }]}
          activeOpacity={0.7}
        >
          <Bell size={22} color={theme.isDark ? '#FFF' : colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginRight: 4,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  profileTextContainer: {
    justifyContent: 'center',
  },
  greetingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  userNameText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
