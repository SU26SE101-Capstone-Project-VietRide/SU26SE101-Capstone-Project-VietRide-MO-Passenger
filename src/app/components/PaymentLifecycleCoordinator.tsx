import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  discardPendingPaymentOpen,
  openPendingPaymentDestination,
} from '@app/navigation/navigationRef';
import { bookingKeys } from '@features/booking/api/bookingApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import {
  addVnPaySdkPaymentBackListener,
  getPendingVnPaySession,
  reconcilePendingVnPaySession,
  VNPAY_CANCEL_POLL_DELAYS_MS,
  type PendingVnPaySession,
  type VnPaySdkResult,
} from '@shared/payments';

type PaymentWakeSignal = 'cold-start' | 'native-payment-back' | 'app-active';

const isAbandonedSdkResult = (result: VnPaySdkResult | undefined): boolean =>
  result === 'CANCELLED' || result === 'FAILED';

export function PaymentLifecycleCoordinator(): null {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const activeReconciliationRef = useRef<Promise<void> | null>(null);

  const invalidatePaymentOwner = useCallback((
    ownerUserId: string,
    pending: PendingVnPaySession,
  ): void => {
    const invalidations: Array<Promise<void>> = [];
    if (pending.kind === 'booking') {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: bookingKeys.user(ownerUserId) }),
        queryClient.invalidateQueries({ queryKey: passengerHistoryKeys.user(ownerUserId) }),
      );
    } else if (pending.kind === 'parcel_deposit' || pending.kind === 'parcel_final') {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: parcelKeys.user(ownerUserId) }),
        queryClient.invalidateQueries({ queryKey: passengerHistoryKeys.user(ownerUserId) }),
      );
    } else {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: walletKeys.user(ownerUserId) }),
      );
    }

    Promise.all(invalidations).catch(() => undefined);
  }, [queryClient]);

  const wakePaymentLifecycle = useCallback((
    signal: PaymentWakeSignal,
    sdkResult?: VnPaySdkResult,
  ): void => {
    if (!userId || activeReconciliationRef.current) return;

    const ownerUserId = userId;
    const abandoned = isAbandonedSdkResult(sdkResult);
    const request = Promise.resolve()
      .then(async () => {
        if (signal === 'native-payment-back') {
          const pending = await getPendingVnPaySession();
          if (
            pending
            && pending.ownerUserId === ownerUserId
            && useAuthStore.getState().user?.id === ownerUserId
          ) {
            invalidatePaymentOwner(ownerUserId, pending);
          }
        }

        return reconcilePendingVnPaySession({
          ownerUserId,
          isCurrent: () => useAuthStore.getState().user?.id === ownerUserId,
          ...(abandoned ? { delaysMs: VNPAY_CANCEL_POLL_DELAYS_MS } : {}),
        });
      })
      .then((result) => {
        if (useAuthStore.getState().user?.id !== ownerUserId) return;

        if (result.pending) {
          invalidatePaymentOwner(ownerUserId, result.pending);
        }

        if (
          signal === 'cold-start'
          && result.pending?.ownerUserId === ownerUserId
        ) {
          openPendingPaymentDestination(result.pending);
        }

        if (
          !abandoned
          && result.pending
          && (!result.status || result.status.status === 'PENDING')
        ) {
          Alert.alert(
            t('paymentReturn.processingTitle'),
            t('paymentReturn.processingDescription'),
            [{ text: t('common.understood') }],
          );
        }
      })
      .catch(() => {
        if (useAuthStore.getState().user?.id !== ownerUserId) return;
        if (signal === 'cold-start') {
          Alert.alert(
            t('paymentReturn.processingTitle'),
            t('paymentReturn.processingDescription'),
            [{ text: t('common.understood') }],
          );
        }
      })
      .finally(() => {
        if (activeReconciliationRef.current === request) {
          activeReconciliationRef.current = null;
        }
      });

    activeReconciliationRef.current = request;
  }, [invalidatePaymentOwner, t, userId]);

  useEffect(() => {
    if (!userId) {
      discardPendingPaymentOpen();
      return;
    }
    wakePaymentLifecycle('cold-start');
  }, [userId, wakePaymentLifecycle]);

  useEffect(() => {
    const subscription = addVnPaySdkPaymentBackListener((event) => {
      wakePaymentLifecycle('native-payment-back', event?.result);
    });
    return () => subscription?.remove();
  }, [wakePaymentLifecycle]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        wakePaymentLifecycle('app-active');
      }
    });
    return () => subscription.remove();
  }, [wakePaymentLifecycle]);

  return null;
}
