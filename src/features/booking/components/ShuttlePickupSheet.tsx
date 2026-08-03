import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { CheckCircle, Crosshair, MapPinLine, ShieldCheck, X } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components/Button';
import { Input } from '@shared/components/Input';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  formatGeocodedAddress,
  geocodeAddress,
  getCurrentCoordinates,
  isDeviceLocationError,
  requestForegroundLocationPermission,
  reverseGeocodeCoordinates,
} from '@shared/services/deviceLocation';
import type { GeoCoordinate } from '@shared/types/common';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { ShuttlePickupDraft } from '../types';
import { useMotion } from '@shared/motion';
import {
  SHUTTLE_ADDRESS_MAX_LENGTH,
  validateShuttlePickup,
} from '../utils/shuttle';

interface ShuttlePickupSheetProps {
  visible: boolean;
  stationId: string;
  stationName: string;
  initialValue: ShuttlePickupDraft | null;
  onClose: () => void;
  onSave: (value: ShuttlePickupDraft) => void;
}

type ResolutionMode = 'current' | 'address' | null;

export function ShuttlePickupSheet({
  visible,
  stationId,
  stationName,
  initialValue,
  onClose,
  onSave,
}: ShuttlePickupSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { reduceMotion } = useMotion();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const requestSequenceRef = useRef(0);
  const [address, setAddress] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [coordinates, setCoordinates] = useState<GeoCoordinate | null>(null);
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>(null);
  const [error, setError] = useState<string | null>(null);
  const sheetInsetStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.lg) }),
    [insets.bottom],
  );

  useEffect(() => {
    if (!visible) {
      requestSequenceRef.current += 1;
      return;
    }

    setAddress(initialValue?.address ?? '');
    setResolvedAddress(initialValue?.address ?? '');
    setCoordinates(initialValue
      ? { latitude: initialValue.latitude, longitude: initialValue.longitude }
      : null);
    setResolutionMode(null);
    setError(null);
  }, [initialValue, visible]);

  const isResolving = resolutionMode !== null;
  const isLocationVerified = Boolean(
    coordinates
    && resolvedAddress
    && address.trim() === resolvedAddress,
  );

  const validation = useMemo(() => {
    if (!coordinates || !isLocationVerified) return null;
    return validateShuttlePickup({ address, ...coordinates });
  }, [address, coordinates, isLocationVerified]);

  const beginRequest = useCallback((mode: Exclude<ResolutionMode, null>): number => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    setResolutionMode(mode);
    setError(null);
    return sequence;
  }, []);

  const finishRequest = useCallback((sequence: number): void => {
    if (requestSequenceRef.current === sequence) {
      setResolutionMode(null);
    }
  }, []);

  const presentSafeError = useCallback((caughtError: unknown, sequence: number): void => {
    if (requestSequenceRef.current !== sequence) return;
    setError(isDeviceLocationError(caughtError)
      ? t(`booking.shuttleSheet.locationErrors.${caughtError.code}`)
      : t('booking.shuttleSheet.locationErrors.generic'));
  }, [t]);

  const handleUseCurrentLocation = useCallback(async (): Promise<void> => {
    if (isResolving) return;
    const sequence = beginRequest('current');

    try {
      await requestForegroundLocationPermission();
      const nextCoordinates = await getCurrentCoordinates();
      const geocodedAddress = await reverseGeocodeCoordinates(nextCoordinates);
      const nextAddress = formatGeocodedAddress(geocodedAddress).trim();
      if (!nextAddress) {
        throw new Error('Address unavailable');
      }
      if (requestSequenceRef.current !== sequence) return;

      setCoordinates(nextCoordinates);
      setAddress(nextAddress);
      setResolvedAddress(nextAddress);
    } catch (caughtError: unknown) {
      presentSafeError(caughtError, sequence);
    } finally {
      finishRequest(sequence);
    }
  }, [beginRequest, finishRequest, isResolving, presentSafeError]);

  const handleResolveAddress = useCallback(async (): Promise<void> => {
    if (isResolving) return;
    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
      setError(t('booking.shuttleSheet.errors.addressRequired'));
      return;
    }
    if (normalizedAddress.length > SHUTTLE_ADDRESS_MAX_LENGTH) {
      setError(t('booking.shuttleSheet.errors.addressTooLong', {
        count: SHUTTLE_ADDRESS_MAX_LENGTH,
      }));
      return;
    }

    const sequence = beginRequest('address');
    try {
      await requestForegroundLocationPermission();
      const nextCoordinates = await geocodeAddress(normalizedAddress);
      if (requestSequenceRef.current !== sequence) return;

      setAddress(normalizedAddress);
      setResolvedAddress(normalizedAddress);
      setCoordinates(nextCoordinates);
    } catch (caughtError: unknown) {
      presentSafeError(caughtError, sequence);
    } finally {
      finishRequest(sequence);
    }
  }, [address, beginRequest, finishRequest, isResolving, presentSafeError, t]);

  const handleAddressChange = useCallback((nextAddress: string): void => {
    setAddress(nextAddress);
    setError(null);
    if (nextAddress.trim() !== resolvedAddress) {
      setCoordinates(null);
    }
  }, [resolvedAddress]);

  const handleSave = useCallback((): void => {
    if (!validation?.value) {
      setError(t('booking.shuttleSheet.errors.verifyBeforeSave'));
      return;
    }

    onSave({ stationId, ...validation.value });
    onClose();
  }, [onClose, onSave, stationId, t, validation]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, sheetInsetStyle]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MapPinLine size={22} color={theme.colors.primary} weight="duotone" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('booking.shuttleSheet.title')}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {t('booking.shuttleSheet.subtitle', { station: stationName })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.shuttleSheet.closeAccessibility')}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
            >
              <X size={20} color={theme.colors.textPrimary} weight="bold" />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Button
              title={resolutionMode === 'current'
                ? t('booking.shuttleSheet.findingLocation')
                : t('booking.shuttleSheet.useCurrentLocation')}
              accessibilityLabel={t('booking.shuttleSheet.useCurrentLocationAccessibility')}
              variant="secondary"
              fullWidth
              loading={resolutionMode === 'current'}
              disabled={isResolving}
              onPress={handleUseCurrentLocation}
              style={styles.locationButton}
            />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('booking.shuttleSheet.orEnterAddress')}</Text>
              <View style={styles.divider} />
            </View>

            <Input
              label={t('booking.shuttle.pickupAddress')}
              required
              value={address}
              onChangeText={handleAddressChange}
              placeholder={t('booking.shuttleSheet.addressPlaceholder')}
              autoCapitalize="sentences"
              autoCorrect={false}
              multiline
              maxLength={SHUTTLE_ADDRESS_MAX_LENGTH}
              textAlignVertical="top"
              accessibilityLabel={t('booking.shuttleSheet.addressAccessibility')}
              hint={t('booking.shuttleSheet.characterCount', {
                current: address.length,
                max: SHUTTLE_ADDRESS_MAX_LENGTH,
              })}
            />

            <Button
              title={resolutionMode === 'address'
                ? t('booking.shuttleSheet.verifyingAddress')
                : t('booking.shuttleSheet.verifyAddress')}
              variant="outline"
              fullWidth
              loading={resolutionMode === 'address'}
              disabled={isResolving || !address.trim()}
              onPress={handleResolveAddress}
            />

            {isLocationVerified ? (
              <View style={styles.verifiedRow}>
                <CheckCircle size={19} color={theme.colors.success} weight="fill" />
                <Text style={styles.verifiedText}>{t('booking.shuttleSheet.verified')}</Text>
              </View>
            ) : (
              <View style={styles.verifyHintRow}>
                <Crosshair size={18} color={theme.colors.textTertiary} weight="duotone" />
                <Text style={styles.verifyHintText}>
                  {t('booking.shuttleSheet.verifyHint')}
                </Text>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.privacyRow}>
              <ShieldCheck size={18} color={theme.colors.primary} weight="duotone" />
              <Text style={styles.privacyText}>
                {t('booking.shuttleSheet.privacy')}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="ghost"
                onPress={onClose}
                disabled={isResolving}
                style={styles.actionButton}
              />
              <Button
                title={t('booking.shuttleSheet.save')}
                onPress={handleSave}
                disabled={!validation?.value || isResolving}
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.effects.scrim,
  },
  sheet: {
    maxHeight: '92%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.divider,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  content: {
    paddingBottom: spacing.sm,
  },
  locationButton: {
    marginBottom: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  dividerText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  verifiedText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.success,
  },
  verifyHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  verifyHintText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.error,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
  },
  privacyText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
