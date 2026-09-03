import type { ParcelClaimEvidence } from '../types';
import {
  getParcelClaimEvidenceDisplayNote,
  getParcelClaimEvidenceTypeLabelKey,
  isParcelClaimEvidenceImage,
  isSafeParcelClaimEvidenceReference,
} from './parcelClaimEvidence';

const evidence = (
  evidenceType: string,
  reference: string,
  note: string | null = null,
): ParcelClaimEvidence => ({
  evidenceId: '11111111-1111-4111-8111-111111111111',
  evidenceType,
  reference,
  note,
  uploadedByUserId: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-09-04T10:00:00+07:00',
});

describe('parcel claim evidence presentation', () => {
  it('maps known BE evidence types without exposing wire tokens', () => {
    expect(getParcelClaimEvidenceTypeLabelKey('INCIDENT_PHOTO')).toBe(
      'parcel.claim.evidenceTypes.INCIDENT_PHOTO',
    );
    expect(getParcelClaimEvidenceTypeLabelKey(' invoice ')).toBe(
      'parcel.claim.evidenceTypes.INVOICE',
    );
    expect(getParcelClaimEvidenceTypeLabelKey('FUTURE_TYPE')).toBe(
      'parcel.claim.evidenceTypes.UNKNOWN',
    );
  });

  it('only treats credential-free HTTPS references as safe to open', () => {
    expect(
      isSafeParcelClaimEvidenceReference(
        'https://firebasestorage.googleapis.com/v0/b/test/o/photo.jpg?alt=media',
      ),
    ).toBe(true);
    expect(
      isSafeParcelClaimEvidenceReference('http://storage.example/photo.jpg'),
    ).toBe(false);
    expect(isSafeParcelClaimEvidenceReference('intent://open-document')).toBe(
      false,
    );
    expect(
      isSafeParcelClaimEvidenceReference(
        'https://user@storage.example/photo.jpg',
      ),
    ).toBe(false);
  });

  it('previews photo evidence but leaves PDFs to the document opener', () => {
    expect(
      isParcelClaimEvidenceImage(
        evidence('INCIDENT_PHOTO', 'https://storage.example/no-extension'),
      ),
    ).toBe(true);
    expect(
      isParcelClaimEvidenceImage(
        evidence(
          'INVOICE',
          'https://firebasestorage.googleapis.com/v0/b/test/o/invoices%2Freceipt.jpeg?alt=media',
        ),
      ),
    ).toBe(true);
    expect(
      isParcelClaimEvidenceImage(
        evidence('INVOICE', 'https://storage.example/invoice.pdf'),
      ),
    ).toBe(false);
  });

  it('localizes the BE inheritance note and preserves passenger notes', () => {
    expect(
      getParcelClaimEvidenceDisplayNote(
        evidence(
          'INCIDENT_PHOTO',
          'https://storage.example/photo.jpg',
          'Inherited from the incident report.',
        ),
        'Được thêm tự động từ báo cáo sự cố.',
      ),
    ).toBe('Được thêm tự động từ báo cáo sự cố.');
    expect(
      getParcelClaimEvidenceDisplayNote(
        evidence(
          'INVOICE',
          'https://storage.example/invoice.jpg',
          'Hóa đơn mua hàng',
        ),
        'Được thêm tự động từ báo cáo sự cố.',
      ),
    ).toBe('Hóa đơn mua hàng');
  });
});
