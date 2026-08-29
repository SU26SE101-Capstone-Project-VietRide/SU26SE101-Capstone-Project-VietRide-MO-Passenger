import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addVnPaySdkPaymentBackListener,
  getPendingVnPaySession,
  isAbandonedVnPaySdkResult,
  type VnPaySdkResult,
  type VnPaySessionKind,
} from '@shared/payments';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { isParcelPaymentPending } from '../utils/parcelPayment';
import { matchParcelVnPaySession } from '../utils/parcelVnPaySession';

export type ParcelPaymentReturnPhase =
  | 'idle'
  | 'checking'
  | 'abandoned'
  | 'awaiting_parcel';

interface UseParcelPaymentReturnOptions {
  parcelId: string;
  paymentPending: boolean;
  expectedKind: VnPaySessionKind | null;
  enabled: boolean;
  refetchParcel: () => Promise<{ data?: { status?: string } | undefined }>;
}

interface ActiveParcelReconciliation {
  generation: number;
  promise: Promise<void>;
  scope: string;
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
  const userId = useAuthStore(state => state.user?.id);
  const [phase, setPhase] = useState<ParcelPaymentReturnPhase>('idle');
  const runGenerationRef = useRef(0);
  const activeRunRef = useRef<ActiveParcelReconciliation | null>(null);
  const refetchParcelRef = useRef(refetchParcel);
  refetchParcelRef.current = refetchParcel;

  const mountedRef = useRef(true);
  const canReconcile = Boolean(
    enabled && paymentPending && userId && expectedKind && parcelId,
  );
  const reconciliationScope = canReconcile
    ? `${userId}:${expectedKind}:${parcelId}`
    : null;
  const reconciliationScopeRef = useRef(reconciliationScope);
  reconciliationScopeRef.current = reconciliationScope;

  const cancel = useCallback(() => {
    runGenerationRef.current += 1;
    activeRunRef.current = null;
    setPhase('idle');
  }, []);

  const checkNow = useCallback((sdkResult?: VnPaySdkResult): Promise<void> => {
    if (
      !canReconcile
      || !mountedRef.current
      || !reconciliationScope
      || !userId
      || !expectedKind
    ) {
      return Promise.resolve();
    }

    const ownerUserId = userId;
    const scope = reconciliationScope;
    const abandoned = isAbandonedVnPaySdkResult(sdkResult);
    const activeRun = activeRunRef.current;
    if (activeRun?.scope === scope && !abandoned) {
      return activeRun.promise;
    }
    if (activeRun) {
      // A changed parcel/account/kind (or an explicit cancel result) must not
      // coalesce with a request that captured the previous reconciliation scope.
      runGenerationRef.current += 1;
      activeRunRef.current = null;
    }

    const generation = ++runGenerationRef.current;
    const refetchForScope = refetchParcelRef.current;
    const isCurrent = (): boolean =>
      mountedRef.current
      && generation === runGenerationRef.current
      && reconciliationScopeRef.current === scope
      && useAuthStore.getState().user?.id === ownerUserId;

    if (abandoned) {
      setPhase('abandoned');
    } else {
      setPhase('checking');
    }

    const task = (async () => {
      const result = await refetchForScope();
      if (!isCurrent()) return;

      if (abandoned) {
        setPhase('abandoned');
        return;
      }

      if (isParcelPaymentPending(result.data?.status)) {
        setPhase('awaiting_parcel');
        return;
      }

      setPhase('idle');
    })()
      .catch(() => {
        if (!isCurrent()) return;
        setPhase(abandoned ? 'abandoned' : 'idle');
      })
      .finally(() => {
        if (activeRunRef.current?.generation === generation) {
          activeRunRef.current = null;
        }
      });

    activeRunRef.current = { generation, promise: task, scope };
    return task;
  }, [canReconcile, expectedKind, reconciliationScope, userId]);

  useEffect(() => {
    cancel();
    setPhase('idle');
  }, [cancel, reconciliationScope]);

  useEffect(() => {
    if (!paymentPending && phase !== 'idle') {
      setPhase('idle');
    }
  }, [paymentPending, phase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runGenerationRef.current += 1;
      activeRunRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = addVnPaySdkPaymentBackListener((event) => {
      if (!userId || !expectedKind || !reconciliationScope) return;
      const ownerUserId = userId;
      const scope = reconciliationScope;
      getPendingVnPaySession()
        .then(pending => {
          if (
            !mountedRef.current
            || useAuthStore.getState().user?.id !== ownerUserId
            || reconciliationScopeRef.current !== scope
            || !matchParcelVnPaySession(pending, {
              ownerUserId,
              parcelId,
              kind: expectedKind,
            })
          ) {
            return;
          }
          return checkNow(event.result);
        })
        .catch(() => undefined);
    });
    return () => subscription?.remove();
  }, [checkNow, expectedKind, parcelId, reconciliationScope, userId]);

  return {
    phase,
    isChecking: phase === 'checking',
    checkNow,
  };
}
