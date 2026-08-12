import type { PendingVnPaySession, VnPaySessionKind } from '@shared/payments';

export interface ParcelVnPaySessionMatchInput {
  ownerUserId: string;
  parcelId: string;
  kind: VnPaySessionKind;
}

/** Reusable matcher for Create/Detail — never builds SDK metadata. */
export const matchParcelVnPaySession = (
  session: PendingVnPaySession | null | undefined,
  {
    ownerUserId,
    parcelId,
    kind,
  }: ParcelVnPaySessionMatchInput,
): session is PendingVnPaySession =>
  Boolean(
    session
    && session.ownerUserId === ownerUserId
    && session.businessId === parcelId
    && session.kind === kind
    && session.vnpaySdk?.tmnCode?.trim()
    && session.vnpaySdk?.scheme?.trim()
    && typeof session.vnpaySdk.isSandbox === 'boolean',
  );

export const parcelPaymentKindForStage = (
  stage: 'deposit' | 'final' | null | undefined,
): VnPaySessionKind | null => {
  if (stage === 'deposit') return 'parcel_deposit';
  if (stage === 'final') return 'parcel_final';
  return null;
};
