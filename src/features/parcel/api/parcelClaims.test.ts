import { parseParcelClaims } from './parcelSchemas';

const IDS = {
  claim: '11111111-1111-4111-8111-111111111111',
  parcel: '22222222-2222-4222-8222-222222222222',
  incident: '33333333-3333-4333-8333-333333333333',
  user: '44444444-4444-4444-8444-444444444444',
  evidence: '55555555-5555-4555-8555-555555555555',
  appeal: '66666666-6666-4666-8666-666666666666',
  payout: '77777777-7777-4777-8777-777777777777',
} as const;
const NOW = '2026-08-22T09:00:00+07:00';

const claimWire = {
  claimId: IDS.claim,
  parcelId: IDS.parcel,
  incidentId: IDS.incident,
  status: 'FUNDING_PENDING',
  declaredValueVnd: 2_000_000,
  proofStatus: 'VERIFIED',
  provenDirectLossVnd: 2_000_000,
  compensationRatePercent: 80,
  policyCapVnd: 1_500_000,
  cargoAwardVnd: 1_500_000,
  freightRefundVnd: 100_000,
  totalAwardVnd: 1_600_000,
  policyVersion: 2,
  beneficiaryUserId: IDS.user,
  decisionReason: null,
  decidedBy: null,
  decidedAt: NOW,
  payoutReferenceId: null,
  paidAt: null,
  appealReason: null,
  appealedByUserId: null,
  appealedAt: null,
  acceptedEvidenceIds: [IDS.evidence],
  evidence: [{
    evidenceId: IDS.evidence,
    evidenceType: 'PHOTO',
    reference: 'https://storage.example/evidence.jpg',
    note: null,
    uploadedByUserId: IDS.user,
    createdAt: NOW,
  }],
  parcelSummary: null,
  incidentSummary: null,
  policySnapshot: {
    version: 2,
    compensationRatePercent: 80,
    maxCompensationVnd: 1_500_000,
    noProofFallbackMultiplier: 1,
    claimWindowDays: 7,
    searchSlaHours: 24,
    decisionSlaBusinessDays: 3,
    payoutSlaBusinessDays: 5,
  },
  decisionDeadline: NOW,
  payoutDeadline: null,
  availableActions: ['APPEAL', 'OPERATOR_APPROVE'],
};

describe('Parcel claim contract', () => {
  it('keeps funding-pending distinct from paid and allow-lists appeal', () => {
    const claim = parseParcelClaims([claimWire])[0];
    expect(claim.status).toBe('FUNDING_PENDING');
    expect(claim.paidAt).toBeNull();
    expect(claim.totalAwardVnd).toBe(1_600_000);
    expect(claim.proofStatus).toBe('VERIFIED');
    expect(claim.acceptedEvidenceIds).toEqual([IDS.evidence]);
    expect(claim.availableActions).toEqual(['APPEAL']);
    expect(claim.policySnapshot?.maxCompensationVnd).toBe(1_500_000);
    expect(claim.appeal).toBeNull();
  });

  it('parses the separate appeal case and drops operator-only actions', () => {
    const claim = parseParcelClaims([{
      ...claimWire,
      status: 'PAID',
      paidAt: NOW,
      appeal: {
        appealId: IDS.appeal,
        claimId: IDS.claim,
        originalClaimStatus: 'PAID',
        originalTotalAwardVnd: 1_600_000,
        status: 'FUNDING_PENDING',
        reason: 'The invoice was corrected.',
        submittedByUserId: IDS.user,
        submittedAt: NOW,
        proofStatus: 'VERIFIED',
        revisedProvenDirectLossVnd: 2_500_000,
        revisedCargoAwardVnd: 2_000_000,
        revisedFreightRefundVnd: 100_000,
        revisedTotalAwardVnd: 2_100_000,
        supplementaryAwardVnd: 500_000,
        decisionReason: 'The additional evidence was accepted.',
        decidedByUserId: null,
        decidedAt: NOW,
        payoutReferenceId: IDS.payout,
        paidAt: null,
        acceptedEvidenceIds: [IDS.evidence],
        availableActions: ['DECIDE_APPEAL', 'OPERATOR_APPROVE'],
      },
    }])[0];

    expect(claim.status).toBe('PAID');
    expect(claim.appeal).toMatchObject({
      appealId: IDS.appeal,
      originalClaimStatus: 'PAID',
      status: 'FUNDING_PENDING',
      proofStatus: 'VERIFIED',
      revisedTotalAwardVnd: 2_100_000,
      supplementaryAwardVnd: 500_000,
      acceptedEvidenceIds: [IDS.evidence],
      availableActions: [],
    });
  });

  it('preserves an unknown appeal status without exposing its wire token as copy', () => {
    const claim = parseParcelClaims([{
      ...claimWire,
      appeal: {
        appealId: IDS.appeal,
        claimId: IDS.claim,
        originalClaimStatus: 'REJECTED',
        originalTotalAwardVnd: 0,
        status: 'NEW_APPEAL_STATE',
        reason: 'Please review the case.',
        submittedByUserId: IDS.user,
        submittedAt: NOW,
        revisedProvenDirectLossVnd: null,
        revisedCargoAwardVnd: 0,
        revisedFreightRefundVnd: 0,
        revisedTotalAwardVnd: 0,
        supplementaryAwardVnd: 0,
        decisionReason: null,
        decidedByUserId: null,
        decidedAt: null,
        payoutReferenceId: null,
        paidAt: null,
        availableActions: null,
      },
    }])[0];

    expect(claim.appeal?.status).toBe('NEW_APPEAL_STATE');
    expect(claim.appeal?.availableActions).toEqual([]);
  });

  it('rejects blank evidence references and unsafe awards', () => {
    expect(() => parseParcelClaims([{
      ...claimWire,
      evidence: [{ ...claimWire.evidence[0], reference: ' ' }],
    }])).toThrow();
    expect(() => parseParcelClaims([{
      ...claimWire,
      totalAwardVnd: Number.MAX_SAFE_INTEGER + 1,
    }])).toThrow();
    expect(() => parseParcelClaims([{
      ...claimWire,
      acceptedEvidenceIds: ['not-a-uuid'],
    }])).toThrow();
    expect(() => parseParcelClaims([{
      ...claimWire,
      appeal: {
        appealId: 'not-a-uuid',
        claimId: IDS.claim,
        originalClaimStatus: 'REJECTED',
        originalTotalAwardVnd: 0,
        status: 'SUBMITTED',
        reason: 'Please review the case.',
        submittedByUserId: IDS.user,
        submittedAt: NOW,
        revisedProvenDirectLossVnd: null,
        revisedCargoAwardVnd: 0,
        revisedFreightRefundVnd: 0,
        revisedTotalAwardVnd: 0,
        supplementaryAwardVnd: 0,
        decisionReason: null,
        decidedByUserId: null,
        decidedAt: null,
        payoutReferenceId: null,
        paidAt: null,
        availableActions: [],
      },
    }])).toThrow();
  });

  it('normalizes nullable actions to an empty list', () => {
    expect(parseParcelClaims([{
      ...claimWire,
      availableActions: null,
    }])[0].availableActions).toEqual([]);
  });

  it('normalizes proof fields omitted by an older read model', () => {
    const legacyWire: Record<string, unknown> = { ...claimWire };
    delete legacyWire.proofStatus;
    delete legacyWire.acceptedEvidenceIds;

    const claim = parseParcelClaims([legacyWire])[0];

    expect(claim.proofStatus).toBeNull();
    expect(claim.acceptedEvidenceIds).toEqual([]);
  });
});
