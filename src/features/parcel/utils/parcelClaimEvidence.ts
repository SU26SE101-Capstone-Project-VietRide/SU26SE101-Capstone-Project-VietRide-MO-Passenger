import type { ParcelClaimEvidence } from '../types';

const EVIDENCE_TYPE_LABEL_KEYS: Readonly<Record<string, string>> = {
  DOCUMENT: 'parcel.claim.evidenceTypes.DOCUMENT',
  INCIDENT_PHOTO: 'parcel.claim.evidenceTypes.INCIDENT_PHOTO',
  INVOICE: 'parcel.claim.evidenceTypes.INVOICE',
  PAYMENT_PROOF: 'parcel.claim.evidenceTypes.PAYMENT_PROOF',
  PHOTO: 'parcel.claim.evidenceTypes.PHOTO',
  RECEIPT: 'parcel.claim.evidenceTypes.RECEIPT',
};

const IMAGE_EVIDENCE_TYPES = new Set([
  'DAMAGE_PHOTO',
  'IMAGE',
  'INCIDENT_PHOTO',
  'PHOTO',
]);

const IMAGE_PATH_PATTERN = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i;
const INHERITED_INCIDENT_NOTE = 'inherited from the incident report.';

const parseSafeEvidenceUrl = (reference: string): URL | null => {
  try {
    const url = new URL(reference.trim());
    if (url.protocol !== 'https:' || url.username || url.password) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
};

export const getParcelClaimEvidenceTypeLabelKey = (
  evidenceType: string,
): string =>
  EVIDENCE_TYPE_LABEL_KEYS[evidenceType.trim().toUpperCase()] ??
  'parcel.claim.evidenceTypes.UNKNOWN';

export const isSafeParcelClaimEvidenceReference = (
  reference: string,
): boolean => parseSafeEvidenceUrl(reference) !== null;

export const isParcelClaimEvidenceImage = (
  evidence: Pick<ParcelClaimEvidence, 'evidenceType' | 'reference'>,
): boolean => {
  if (IMAGE_EVIDENCE_TYPES.has(evidence.evidenceType.trim().toUpperCase())) {
    return true;
  }

  const url = parseSafeEvidenceUrl(evidence.reference);
  if (!url) return false;

  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded path. The extension remains detectable for Firebase URLs.
  }
  return IMAGE_PATH_PATTERN.test(pathname);
};

export const getParcelClaimEvidenceDisplayNote = (
  evidence: Pick<ParcelClaimEvidence, 'evidenceType' | 'note'>,
  inheritedIncidentLabel: string,
): string | null => {
  const note = evidence.note?.trim();
  if (!note) return null;

  if (
    evidence.evidenceType.trim().toUpperCase() === 'INCIDENT_PHOTO' &&
    note.toLowerCase() === INHERITED_INCIDENT_NOTE
  ) {
    return inheritedIncidentLabel;
  }

  return note;
};
