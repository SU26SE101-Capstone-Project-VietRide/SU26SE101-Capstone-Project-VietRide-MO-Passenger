import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { usePaymentDeepLink, type PaymentReturnEvent } from '@shared/hooks';

/**
 * Converts an OS payment-return signal into user-scoped cache reconciliation.
 * It never infers success from redirect query parameters; only BE state is
 * authoritative for booking confirmation and wallet balance.
 */
export function PaymentDeepLinkHandler(): null {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);

  const handlePaymentReturn = useCallback(
    (_event: PaymentReturnEvent) => {
      if (!userId) return;

      queryClient
        .invalidateQueries({
          queryKey: bookingKeys.user(userId),
          refetchType: 'none',
        })
        .catch(() => undefined);

      queryClient
        .invalidateQueries({
          queryKey: parcelKeys.user(userId),
          refetchType: 'none',
        })
        .catch(() => undefined);

      queryClient
        .invalidateQueries({
          queryKey: passengerHistoryKeys.user(userId),
          // The initiating History screen owns its one foreground refetch.
          // Other payment surfaces only mark this user-scoped cache stale so
          // the next History visit refreshes without racing that owner.
          refetchType: 'none',
        })
        .catch(() => undefined);

      // Payment detail screens own authoritative reconciliation. Booking,
      // Parcel and History caches stay stale-only here so this global wake
      // signal cannot race the initiating screen's foreground owner.

      Alert.alert(
        t('paymentReturn.reconcilingTitle'),
        t('paymentReturn.reconcilingDescription'),
        [{ text: t('common.understood') }],
      );
    },
    [queryClient, t, userId],
  );

  usePaymentDeepLink(handlePaymentReturn);
  return null;
}
