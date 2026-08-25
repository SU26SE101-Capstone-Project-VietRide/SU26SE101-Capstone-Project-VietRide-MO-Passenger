import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  confirmParcelDelivery,
  rejectParcelDelivery,
  undoRejectParcelDelivery,
  type ConfirmParcelDeliveryResult,
  type RejectParcelDeliveryResult,
  type UndoRejectParcelDeliveryResult,
} from '../api/parcelReliabilityApi';
import type {
  ParcelDeliveryTokenInput,
  RejectParcelDeliveryInput,
} from '../types';
import {
  ParcelSubmissionCoordinator,
  type IdempotentParcelSubmitter,
} from '../utils/parcelSubmissionCoordinator';

const equalInput = <T,>(left: T, right: T): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const useRetainedAnonymousDeliveryMutation = <TInput, TResult>(
  scope: string,
  submitter: IdempotentParcelSubmitter<TInput, TResult>,
) => {
  const coordinatorRef = useRef<ParcelSubmissionCoordinator<TInput, TResult> | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new ParcelSubmissionCoordinator(
      scope,
      submitter,
      equalInput,
    );
  }
  const mutation = useMutation({
    mutationFn: (input: TInput) => coordinatorRef.current!.submit(input),
    retry: 0,
  });
  return {
    ...mutation,
    retryRetainedAsync: () => coordinatorRef.current!.retryRetainedAsync(),
    hasRetainedAmbiguousSubmission: () => (
      coordinatorRef.current?.hasRetainedAmbiguousSubmission() ?? false
    ),
  };
};

/** API-ready only. Do not expose a screen until the delivery-token link contract exists. */
export const useConfirmParcelDelivery = () =>
  useRetainedAnonymousDeliveryMutation<
    ParcelDeliveryTokenInput,
    ConfirmParcelDeliveryResult
  >('parcel-delivery-confirm-mobile', confirmParcelDelivery);

export const useRejectParcelDelivery = () =>
  useRetainedAnonymousDeliveryMutation<
    RejectParcelDeliveryInput,
    RejectParcelDeliveryResult
  >('parcel-delivery-reject-mobile', rejectParcelDelivery);

export const useUndoRejectParcelDelivery = () =>
  useRetainedAnonymousDeliveryMutation<
    ParcelDeliveryTokenInput,
    UndoRejectParcelDeliveryResult
  >('parcel-delivery-undo-reject-mobile', undoRejectParcelDelivery);
