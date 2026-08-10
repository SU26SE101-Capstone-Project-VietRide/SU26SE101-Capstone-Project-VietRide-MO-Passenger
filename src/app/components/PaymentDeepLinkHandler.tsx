import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { usePaymentDeepLink, type PaymentReturnEvent } from '@shared/hooks';
import {
  isSuccessfulPaymentSession,
  reconcilePendingVnPaySession,
} from '@shared/payments';

/**
 * Wake signal after the user returns from VNPay. Never infers paid status from
 * the deep-link URL itself — only BE session/business state is authoritative.
 */
export function PaymentDeepLinkHandler(): null {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);

  const handlePaymentReturn = useCallback(
    (_event: PaymentReturnEvent) => {
      if (!userId) return;

      const markBusinessCachesStale = () => {
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
            refetchType: 'none',
          })
          .catch(() => undefined);

        queryClient
          .invalidateQueries({
            queryKey: walletKeys.user(userId),
            refetchType: 'none',
          })
          .catch(() => undefined);
      };

      Alert.alert(
        t('paymentReturn.reconcilingTitle'),
        t('paymentReturn.reconcilingDescription'),
        [{ text: t('common.understood') }],
      );

      reconcilePendingVnPaySession()
        .then((result) => {
          markBusinessCachesStale();

          if (
            result.status
            && isSuccessfulPaymentSession(result.status.status)
          ) {
            // Owner screens still own success UX; this only refreshes caches.
            return;
          }
        })
        .catch(() => {
          markBusinessCachesStale();
        });
    },
    [queryClient, t, userId],
  );

  usePaymentDeepLink(handlePaymentReturn);
  return null;
}
