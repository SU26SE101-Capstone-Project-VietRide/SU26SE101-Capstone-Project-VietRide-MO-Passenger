import {
  encodePathSegment,
  encodeUuidPathSegment,
  isUuid,
} from './pathSegment';

const UUID = '4d680b5f-8a94-4f26-9f5b-413bd1221e02';

describe('pathSegment', () => {
  describe('isUuid', () => {
    it('accepts canonical UUIDs regardless of hex casing', () => {
      expect(isUuid(UUID)).toBe(true);
      expect(isUuid(UUID.toUpperCase())).toBe(true);
    });

    it.each([
      '',
      'not-a-uuid',
      `${UUID}/read`,
      `${UUID}?admin=true`,
      ` ${UUID}`,
      '4d680b5f-8a94-0f26-9f5b-413bd1221e02',
      null,
      undefined,
    ])('rejects an invalid entity UUID: %p', (value) => {
      expect(isUuid(value)).toBe(false);
    });
  });

  describe('encodePathSegment', () => {
    it('encodes reserved URL characters inside one segment', () => {
      expect(encodePathSegment('parcel/code?#', 'parcel code')).toBe(
        'parcel%2Fcode%3F%23',
      );
    });

    it.each(['', ' ', '.', '..', ' leading', 'trailing ', 'a\u0000b', '\ud800', 'x'.repeat(129)])(
      'rejects an ambiguous or unbounded segment: %p',
      (value) => {
        expect(() => encodePathSegment(value)).toThrow(TypeError);
      },
    );
  });

  describe('encodeUuidPathSegment', () => {
    it('returns a validated UUID segment', () => {
      expect(encodeUuidPathSegment(UUID, 'parcelId')).toBe(UUID);
    });

    it('rejects path injection before a request is built', () => {
      expect(() => encodeUuidPathSegment(`${UUID}/status`, 'parcelId')).toThrow(
        'Invalid parcelId.',
      );
    });
  });
});
