import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import {
  discardPendingPaymentOpen,
  openPendingPaymentDestination,
} from '@app/navigation/navigationRef';
import { bookingKeys } from '@features/booking/api/bookingApi';
import { bookingHistoryKeys } from '@features/booking/api/bookingHistoryApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import {
  addVnPaySdkPaymentBackListener,
  isAbandonedVnPaySdkResult,
  reconcilePendingVnPaySession,
  VNPAY_CANCEL_POLL_DELAYS_MS,
  type PendingVnPaySession,
  type VnPaySdkResult,
} from '@shared/payments';

type PaymentWakeSignal = 'cold-start' | 'native-payment-back' | 'app-active';

const PASSIVE_PAYMENT_CHECK_DELAYS_MS = [0] as const;

export function PaymentLifecycleCoordinator(): null {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const activeReconciliationRef = useRef<Promise<void> | null>(null);
  const activeOwnerUserIdRef = useRef<string | null>(null);
  const queuedNativeWakeRef = useRef<{
    ownerUserId: string;
    result?: VnPaySdkResult;
  } | null>(null);
  const mountedRef = useRef(false);
  const wakePaymentLifecycleRef = useRef<(
    signal: PaymentWakeSignal,
    sdkResult?: VnPaySdkResult,
  ) => void>(() => undefined);
  const runGenerationRef = useRef(0);

  const invalidatePaymentOwner = useCallback(async (
    ownerUserId: string,
    pending: PendingVnPaySession,
  ): Promise<void> => {
    const invalidations: Array<Promise<void>> = [];
    if (pending.kind === 'booking') {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: bookingKeys.user(ownerUserId) }),
        queryClient.invalidateQueries({ queryKey: bookingHistoryKeys.user(ownerUserId) }),
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

    await Promise.allSettled(invalidations);
  }, [queryClient]);

  const wakePaymentLifecycle = useCallback((
    signal: PaymentWakeSignal,
    sdkResult?: VnPaySdkResult,
  ): void => {
    if (!userId) return;

    const ownerUserId = userId;
    if (
      activeReconciliationRef.current
      && activeOwnerUserIdRef.current !== ownerUserId
    ) {
      // Detach an old account's run. Its generation/auth guards keep the old
      // promise from mutating the new account when it eventually settles.
      runGenerationRef.current += 1;
      activeReconciliationRef.current = null;
      activeOwnerUserIdRef.current = null;
      queuedNativeWakeRef.current = null;
    }

    const abandoned = isAbandonedVnPaySdkResult(sdkResult);
    const inFlight = activeReconciliationRef.current !== null;

    if (inFlight && signal !== 'native-payment-back') return;

    // Session reconciliation stays serialized so one PaymentBack cannot race
    // an AppState/cold-start poll for the same account.
    if (inFlight && signal === 'native-payment-back') {
      queuedNativeWakeRef.current = { ownerUserId, result: sdkResult };
      return;
    }

    const generation = ++runGenerationRef.current;
    const request = Promise.resolve()
      .then(() => reconcilePendingVnPaySession({
          ownerUserId,
          isCurrent: () =>
            mountedRef.current
            && runGenerationRef.current === generation
            && useAuthStore.getState().user?.id === ownerUserId,
          ...(abandoned
            ? { delaysMs: VNPAY_CANCEL_POLL_DELAYS_MS }
            : signal === 'native-payment-back'
              ? {}
              : { delaysMs: PASSIVE_PAYMENT_CHECK_DELAYS_MS }),
        }))
      .then(async (result) => {
        if (
          !mountedRef.current
          || runGenerationRef.current !== generation
          || useAuthStore.getState().user?.id !== ownerUserId
        ) {
          return;
        }

        const ownerPending = result.pending?.ownerUserId === ownerUserId
          ? result.pending
          : null;
        if (ownerPending) {
          await invalidatePaymentOwner(ownerUserId, ownerPending);
          if (
            !mountedRef.current
            || runGenerationRef.current !== generation
            || useAuthStore.getState().user?.id !== ownerUserId
          ) {
            return;
          }
        }

        const isUnresolvedPending = Boolean(
          ownerPending
          && !result.cleared
          && (!result.status || result.status.status === 'PENDING'),
        );

        if (
          signal === 'cold-start'
          && isUnresolvedPending
        ) {
          openPendingPaymentDestination(ownerPending!);
        }

        if (
          signal !== 'app-active'
          && !abandoned
          && isUnresolvedPending
        ) {
          Alert.alert(
            t('paymentReturn.processingTitle'),
            t('paymentReturn.processingDescription'),
            [{ text: t('common.understood') }],
          );
        }
      })
      .catch(() => {
        if (
          !mountedRef.current
          || runGenerationRef.current !== generation
          || useAuthStore.getState().user?.id !== ownerUserId
        ) {
          return;
        }
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
          activeOwnerUserIdRef.current = null;
          const queuedWake = queuedNativeWakeRef.current;
          queuedNativeWakeRef.current = null;
          if (
            queuedWake
            && mountedRef.current
            && useAuthStore.getState().user?.id === queuedWake.ownerUserId
          ) {
            Promise.resolve().then(() => {
              if (
                mountedRef.current
                && useAuthStore.getState().user?.id === queuedWake.ownerUserId
              ) {
                wakePaymentLifecycleRef.current(
                  'native-payment-back',
                  queuedWake.result,
                );
              }
            });
          }
        }
      });

    activeReconciliationRef.current = request;
    activeOwnerUserIdRef.current = ownerUserId;
  }, [invalidatePaymentOwner, t, userId]);

  wakePaymentLifecycleRef.current = wakePaymentLifecycle;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runGenerationRef.current += 1;
      activeReconciliationRef.current = null;
      activeOwnerUserIdRef.current = null;
      queuedNativeWakeRef.current = null;
      wakePaymentLifecycleRef.current = () => undefined;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      runGenerationRef.current += 1;
      activeReconciliationRef.current = null;
      activeOwnerUserIdRef.current = null;
      queuedNativeWakeRef.current = null;
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
