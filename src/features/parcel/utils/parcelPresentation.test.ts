import en from '@shared/i18n/locales/en.json';
import vi from '@shared/i18n/locales/vi.json';

import {
  getParcelClaimStatusLabelKey,
  getParcelCustodyEventLabelKey,
  getParcelIncidentStatusLabelKey,
  getParcelTrackingConfidenceDescriptionKey,
  shouldShowParcelIncidentSearchDeadline,
} from './parcelPresentation';

const flattenCopyValues = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (value === null || typeof value !== 'object') return [];
  return Object.values(value).flatMap(flattenCopyValues);
};

describe('parcel Reliability presentation', () => {
  it.each([
    ['ACCEPTED', 'parcel.reliability.events.ACCEPTED'],
    ['HANDOFF', 'parcel.reliability.events.HANDOFF'],
    ['MANUAL_CUSTODY_EXCEPTION', 'parcel.reliability.events.MANUAL_CUSTODY_EXCEPTION'],
  ])('maps custody event %s to app-owned copy', (value, expected) => {
    expect(getParcelCustodyEventLabelKey(value)).toBe(expected);
  });

  it.each([
    ['OPEN', 'parcel.reliability.incidentStatuses.OPEN'],
    ['SEARCH_EXPIRED', 'parcel.reliability.incidentStatuses.SEARCH_EXPIRED'],
    ['LOST_CONFIRMED', 'parcel.reliability.incidentStatuses.LOST_CONFIRMED'],
  ])('maps incident status %s to app-owned copy', (value, expected) => {
    expect(getParcelIncidentStatusLabelKey(value)).toBe(expected);
  });

  it.each([
    ['SUBMITTED', 'parcel.claim.statuses.SUBMITTED'],
    ['FUNDING_PENDING', 'parcel.claim.statuses.FUNDING_PENDING'],
    ['PAID', 'parcel.claim.statuses.PAID'],
    ['APPEALED', 'parcel.claim.statuses.APPEALED'],
  ])('maps claim status %s to app-owned copy', (value, expected) => {
    expect(getParcelClaimStatusLabelKey(value)).toBe(expected);
  });

  it.each([
    ['CONFIRMED_SCAN', 'parcel.reliability.confidenceDescriptions.CONFIRMED_SCAN'],
    ['MANUAL_EXCEPTION', 'parcel.reliability.confidenceDescriptions.MANUAL_EXCEPTION'],
    ['INFERRED_FROM_MANIFEST', 'parcel.reliability.confidenceDescriptions.INFERRED_FROM_MANIFEST'],
  ])('maps tracking confidence %s to a user explanation', (value, expected) => {
    expect(getParcelTrackingConfidenceDescriptionKey(value)).toBe(expected);
  });

  it.each([
    ['OPEN', 'ON_TRACK', true],
    ['SEARCHING', 'DUE_SOON', true],
    ['ESCALATED', 'ON_TRACK', true],
    ['OPEN', 'BREACHED', false],
    ['SEARCH_EXPIRED', 'BREACHED', false],
    ['FOUND', 'ON_TRACK', false],
    ['FORWARDING', 'ON_TRACK', false],
    ['RESOLVED', 'CLOSED', false],
    ['NEW_INTERNAL_STATE', 'ON_TRACK', false],
  ])('shows a search deadline for status %s and SLA %s: %s', (status, slaState, expected) => {
    expect(shouldShowParcelIncidentSearchDeadline(status, slaState)).toBe(expected);
  });

  it('never echoes unknown wire tokens back to the UI', () => {
    const unknownToken = 'NEW_INTERNAL_STATE';

    expect(getParcelCustodyEventLabelKey(unknownToken)).toBe(
      'parcel.reliability.events.UNKNOWN',
    );
    expect(getParcelIncidentStatusLabelKey(unknownToken)).toBe(
      'parcel.reliability.incidentStatuses.UNKNOWN',
    );
    expect(getParcelClaimStatusLabelKey(unknownToken)).toBe(
      'parcel.claim.statuses.UNKNOWN',
    );
    expect(getParcelTrackingConfidenceDescriptionKey(unknownToken)).toBe(
      'parcel.reliability.confidenceDescriptions.UNKNOWN',
    );
  });

  it.each([
    ['en', en],
    ['vi', vi],
  ] as const)('keeps %s Parcel copy user-facing', (_language, locale) => {
    const passengerCopy = flattenCopyValues({
      claim: locale.parcel.claim,
      compensation: locale.parcel.compensation,
      incident: locale.parcel.incident,
      reliability: locale.parcel.reliability,
    }).join('\n');

    [
      'BE',
      'Firebase purpose',
      'evidenceUrls',
      'policy snapshot',
      'Reliability workflow',
      'quy trình Reliability',
      'APPROVED/FUNDING_PENDING',
      'HỆ THỐNG',
      'SYSTEM',
    ].forEach(term => expect(passengerCopy).not.toContain(term));
    expect(locale.parcel.compensation.subtitle).toContain('{{operator}}');
  });
});
