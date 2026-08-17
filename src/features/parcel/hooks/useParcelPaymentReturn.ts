import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  addVnPaySdkPaymentBackListener,
  getPendingVnPaySession,
  isAbandonedVnPaySdkResult,
  isTerminalPaymentSessionStatus,
  pollVnPaySessionStatus,
  VNPAY_CANCEL_POLL_DELAYS_MS,
  VNPAY_SESSION_POLL_DELAYS_MS,
  type VnPaySdkResult,
  type VnPaySessionKind,
} from '@shared/payments';
import { isParcelPaymentPending } from '../utils/parcelPayment';
import { matchParcelVnPaySession } from '../utils/parcelVnPaySession';

export type ParcelPaymentReturnPhase =
  | 'idle'
  | 'checking'
  | 'abandoned'
  | 'awaiting_parcel';

const PARCEL_AFTER_SUCCESS_DELAYS_MS = [
  0,
  400,
  800,
  1_200,
  1_800,
  2_500,
] as const;

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

interface UseParcelPaymentReturnOptions {
  parcelId: string;
  paymentPending: boolean;
  expectedKind: VnPaySessionKind | null;
  enabled: boolean;
  refetchParcel: () => Promise<{ data?: { status?: string } | undefined }>;
}

export function useParcelPaymentReturn({
  parcelId,
  paymentPending,
  expectedKind,
  enabled,
  refetchParcel,
}: UseParcelPaymentReturnOptions): {
  phase: ParcelPaymentReturnPhase;
  isChecking: boolean;
  checkNow: (sdkResult?: VnPaySdkResult) => Promise<void>;
} {
  const userId = useAuthStore((state) => state.user?.id);
  const [phase, setPhase] = useState<ParcelPaymentReturnPhase>('idle');
  const runGenerationRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastAbandonedAtRef = useRef(0);
  const refetchParcelRef = useRef(refetchParcel);
  refetchParcelRef.current = refetchParcel;

  const canReconcile = Boolean(
    enabled && paymentPending && userId && expectedKind && parcelId,
  );

  const cancel = useCallback(() => {
    runGenerationRef.current += 1;
    inFlightRef.current = null;
    setPhase((current) => (current === 'checking' ? 'idle' : current));
  }, []);

  const checkNow = useCallback((sdkResult?: VnPaySdkResult): Promise<void> => {
    if (!canReconcile || !userId || !expectedKind) {
      return Promise.resolve();
    }

    const abandoned = isAbandonedVnPaySdkResult(sdkResult)
      || (
        Date.now() - lastAbandonedAtRef.current < 12_000
        && sdkResult === undefined
      );
    if (isAbandonedVnPaySdkResult(sdkResult)) {
      lastAbandonedAtRef.current = Date.now();
    }

    if (inFlightRef.current && !isAbandonedVnPaySdkResult(sdkResult)) {
      return inFlightRef.current;
    }

    const generation = ++runGenerationRef.current;
    const ownerUserId = userId;
    const kind = expectedKind;
    const isCurrent = (): boolean =>
      generation === runGenerationRef.current
      && useAuthStore.getState().user?.id === ownerUserId;

    if (abandoned) {
      setPhase('abandoned');
    } else {
      setPhase('checking');
    }

    const task = (async () => {
      const pending = await getPendingVnPaySession();
      if (!isCurrent()) return;

      const matches = matchParcelVnPaySession(pending, {
        ownerUserId,
        parcelId,
        kind,
      });

      await refetchParcelRef.current();
      if (!isCurrent()) return;

      if (!matches) {
        if (!abandoned) {
          setPhase('idle');
        }
        return;
      }

      const status = await pollVnPaySessionStatus({
        sessionId: pending.sessionId,
        isCurrent,
        delaysMs: abandoned
          ? VNPAY_CANCEL_POLL_DELAYS_MS
          : VNPAY_SESSION_POLL_DELAYS_MS,
      });
      if (!isCurrent()) return;

      await refetchParcelRef.current();
      if (!isCurrent()) return;

      if (
        abandoned
        || status?.status === 'FAILED'
        || status?.status === 'EXPIRED'
      ) {
        setPhase('abandoned');
        return;
      }

      if (status?.status === 'SUCCEEDED') {
        for (const delayMs of PARCEL_AFTER_SUCCESS_DELAYS_MS) {
          if (!isCurrent()) return;
          if (delayMs > 0) await wait(delayMs);
          if (!isCurrent()) return;
          const result = await refetchParcelRef.current();
          if (!isParcelPaymentPending(result.data?.status)) {
            setPhase('idle');
            return;
          }
        }
        setPhase('awaiting_parcel');
        return;
      }

      if (status && isTerminalPaymentSessionStatus(status.status)) {
        setPhase('idle');
        return;
      }

      setPhase(abandoned ? 'abandoned' : 'checking');
    })()
      .catch(() => {
        if (!isCurrent()) return;
        setPhase(abandoned ? 'abandoned' : 'idle');
      })
      .finally(() => {
        if (inFlightRef.current === task) {
          inFlightRef.current = null;
        }
      });

    inFlightRef.current = task;
    return task;
  }, [canReconcile, expectedKind, parcelId, userId]);

  useEffect(() => {
    if (!canReconcile) {
      cancel();
      setPhase('idle');
    }
  }, [canReconcile, cancel]);

  useEffect(() => {
    if (!paymentPending && phase !== 'idle') {
      setPhase('idle');
      lastAbandonedAtRef.current = 0;
    }
  }, [paymentPending, phase]);

  useEffect(() => {
    const subscription = addVnPaySdkPaymentBackListener((event) => {
      checkNow(event.result).catch(() => undefined);
    });
    return () => subscription?.remove();
  }, [checkNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkNow().catch(() => undefined);
        }
      },
    );
    return () => subscription.remove();
  }, [checkNow]);

  return {
    phase,
    isChecking: phase === 'checking',
    checkNow,
  };
}
