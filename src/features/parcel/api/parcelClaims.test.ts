import { parseParcelClaims } from './parcelSchemas';

const IDS = {
  claim: '11111111-1111-4111-8111-111111111111',
  parcel: '22222222-2222-4222-8222-222222222222',
  incident: '33333333-3333-4333-8333-333333333333',
  user: '44444444-4444-4444-8444-444444444444',
  evidence: '55555555-5555-4555-8555-555555555555',
} as const;
const NOW = '2026-08-22T09:00:00+07:00';

const claimWire = {
  claimId: IDS.claim,
  parcelId: IDS.parcel,
  incidentId: IDS.incident,
  status: 'FUNDING_PENDING',
  declaredValueVnd: 2_000_000,
  provenDirectLossVnd: null,
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
    expect(claim.availableActions).toEqual(['APPEAL']);
    expect(claim.policySnapshot?.maxCompensationVnd).toBe(1_500_000);
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
  });

  it('normalizes nullable actions to an empty list', () => {
    expect(parseParcelClaims([{
      ...claimWire,
      availableActions: null,
    }])[0].availableActions).toEqual([]);
  });
});
