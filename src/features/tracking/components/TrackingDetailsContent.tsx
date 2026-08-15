import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Clock,
  LinkBreak,
  MapPin,
  ShareNetwork,
  Target,
  WarningCircle,
  WifiSlash,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks/useThemedStyles';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { getTrackingMapPalette } from './trackingMapStyles';

interface TrackingDetailsContentProps {
  canManageTripSharing: boolean;
  detailsFooter?: ReactNode;
  hasEtaRouteMismatch: boolean;
  hasTrackingTarget: boolean;
  isOnline: boolean;
  isRevoking: boolean;
  isShareOperationPending: boolean;
  isSharing: boolean;
  isTerminal: boolean;
  onRetry: () => void;
  onRevokeTripShare: () => void;
  onShareTrip: () => void;
  routeUnavailable: boolean;
  targetInsight: string | null;
  terminalMessage?: string;
  transientError: boolean;
  delayMinutes?: number;
}

export const TrackingDetailsContent = React.memo(
  function TrackingDetailsContentComponent({
    canManageTripSharing,
    delayMinutes,
    detailsFooter,
    hasEtaRouteMismatch,
    hasTrackingTarget,
    isOnline,
    isRevoking,
    isShareOperationPending,
    isSharing,
    isTerminal,
    onRetry,
    onRevokeTripShare,
    onShareTrip,
    routeUnavailable,
    targetInsight,
    terminalMessage,
    transientError,
  }: TrackingDetailsContentProps): React.JSX.Element {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const mapPalette = getTrackingMapPalette(theme.isDark);

    return (
      <View style={styles.container}>
        {targetInsight ? (
          <View
            style={[
              styles.infoBanner,
              hasTrackingTarget ? styles.infoBannerAccent : styles.infoBannerMuted,
            ]}
            accessibilityRole="summary"
          >
            <Target
              size={18}
              color={hasTrackingTarget ? mapPalette.target : theme.colors.textSecondary}
              weight="duotone"
            />
            <Text style={styles.infoBannerText}>{targetInsight}</Text>
          </View>
        ) : null}

        {!isOnline ? (
          <View style={styles.warningBanner} accessibilityRole="summary">
            <WifiSlash size={18} color={theme.colors.warning} />
            <Text style={styles.warningBannerText}>
              {t('tracking.connection.offline')}
            </Text>
          </View>
        ) : null}

        {delayMinutes !== undefined && !isTerminal ? (
          <View style={styles.warningBanner} accessibilityRole="summary">
            <Clock size={18} color={theme.colors.warning} />
            <Text style={styles.warningBannerText}>
              {t('tracking.delayMinutes', { count: delayMinutes })}
            </Text>
          </View>
        ) : null}

        {isTerminal ? (
          <View style={styles.neutralBanner} accessibilityRole="summary">
            <Clock size={18} color={theme.colors.textSecondary} />
            <Text style={styles.neutralBannerText}>
              {terminalMessage ?? t('tracking.tripComplete')}
            </Text>
          </View>
        ) : null}

        {transientError ? (
          <View style={styles.errorBanner} accessibilityRole="summary">
            <WarningCircle size={18} color={theme.colors.error} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {t('tracking.errors.refresh')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {hasEtaRouteMismatch ? (
          <View style={styles.neutralBanner} accessibilityRole="summary">
            <WarningCircle size={18} color={theme.colors.textSecondary} />
            <Text style={styles.neutralBannerText}>
              {t('tracking.progress.etaRouteMismatch')}
            </Text>
          </View>
        ) : null}

        {canManageTripSharing ? (
          <View style={styles.shareCard}>
            <View style={styles.shareHeading}>
              <View style={styles.shareIcon}>
                <ShareNetwork size={22} color={mapPalette.target} weight="duotone" />
              </View>
              <View style={styles.shareCopy}>
                <Text style={styles.shareTitle}>{t('tracking.share.title')}</Text>
                <Text style={styles.shareDescription}>
                  {t('tracking.share.description')}
                </Text>
                <Text style={styles.sharePrivacy}>
                  {t('tracking.share.privacyNote')}
                </Text>
              </View>
            </View>
            <View style={styles.shareActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tracking.share.action')}
                accessibilityHint={t('tracking.share.actionHint')}
                accessibilityState={{
                  busy: isSharing,
                  disabled: !isOnline || isShareOperationPending,
                }}
                disabled={!isOnline || isShareOperationPending}
                onPress={onShareTrip}
                style={({ pressed }) => [
                  styles.sharePrimaryButton,
                  !isOnline || isShareOperationPending
                    ? styles.shareButtonDisabled
                    : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color={theme.colors.textInverse} />
                ) : (
                  <ShareNetwork size={18} color={theme.colors.textInverse} weight="bold" />
                )}
                <Text style={styles.sharePrimaryText}>
                  {isSharing ? t('tracking.share.sharing') : t('tracking.share.action')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tracking.share.revokeAction')}
                accessibilityState={{
                  busy: isRevoking,
                  disabled: !isOnline || isShareOperationPending,
                }}
                disabled={!isOnline || isShareOperationPending}
                onPress={onRevokeTripShare}
                style={({ pressed }) => [
                  styles.shareRevokeButton,
                  !isOnline || isShareOperationPending
                    ? styles.shareButtonDisabled
                    : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                {isRevoking ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <LinkBreak size={18} color={theme.colors.error} weight="bold" />
                )}
                <Text style={styles.shareRevokeText}>
                  {isRevoking
                    ? t('tracking.share.revoking')
                    : t('tracking.share.revokeAction')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {routeUnavailable ? (
          <View style={styles.neutralBanner} accessibilityRole="summary">
            <MapPin size={18} color={theme.colors.textSecondary} />
            <Text style={styles.neutralBannerText}>
              {t('tracking.progress.routeUnavailable')}
            </Text>
          </View>
        ) : null}

        {detailsFooter ? <View style={styles.detailsFooter}>{detailsFooter}</View> : null}
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => {
  const palette = getTrackingMapPalette(theme.isDark);
  return {
    container: {
      gap: spacing.md,
    },
    pressed: {
      opacity: 0.78,
    },
    infoBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
    },
    infoBannerAccent: {
      backgroundColor: palette.targetHalo,
      borderWidth: 1,
      borderColor: palette.target,
    },
    infoBannerMuted: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    infoBannerText: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    warningBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.colors.warningLight,
    },
    warningBannerText: {
      flex: 1,
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.sm,
      color: theme.colors.warning,
    },
    neutralBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.colors.surfaceAlt,
    },
    neutralBannerText: {
      flex: 1,
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.sm,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.colors.errorLight,
    },
    errorBannerText: {
      flex: 1,
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.sm,
      color: theme.colors.error,
    },
    retryButton: {
      minHeight: 44,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.colors.error,
    },
    retryButtonText: {
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.xs,
      color: theme.colors.textInverse,
    },
    shareCard: {
      ...theme.components.card,
      gap: spacing.lg,
      padding: spacing.lg,
      borderColor: palette.targetHalo,
    },
    shareHeading: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing.md,
    },
    shareIcon: {
      width: 42,
      height: 42,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      backgroundColor: palette.targetHalo,
    },
    shareCopy: {
      flex: 1,
      minWidth: 0,
    },
    shareTitle: {
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.md,
      color: theme.colors.textPrimary,
    },
    shareDescription: {
      marginTop: spacing.xs,
      fontFamily: fontFamilies.regular,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    sharePrivacy: {
      marginTop: spacing.sm,
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.xs,
      lineHeight: 16,
      color: theme.colors.textTertiary,
    },
    shareActions: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    sharePrimaryButton: {
      minWidth: 170,
      minHeight: 48,
      flexGrow: 1,
      flexBasis: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.colors.primary,
    },
    sharePrimaryText: {
      flexShrink: 1,
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.colors.textInverse,
      textAlign: 'center' as const,
    },
    shareRevokeButton: {
      minWidth: 150,
      minHeight: 48,
      flexGrow: 1,
      flexBasis: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: borderRadius.lg,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.colors.errorLight,
    },
    shareRevokeText: {
      flexShrink: 1,
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.colors.error,
      textAlign: 'center' as const,
    },
    shareButtonDisabled: {
      opacity: 0.5,
    },
    detailsFooter: {
      gap: spacing.md,
    },
  };
};
