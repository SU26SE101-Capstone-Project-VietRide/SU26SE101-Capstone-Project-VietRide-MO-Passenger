import {
  ETA_QUALITY_VALUES,
  isEtaQuality,
  normalizeEtaQuality,
} from './etaQuality';

describe('ETA quality contract', () => {
  it.each(ETA_QUALITY_VALUES)('preserves the known %s value', (quality) => {
    expect(isEtaQuality(quality)).toBe(true);
    expect(normalizeEtaQuality(quality)).toBe(quality);
  });

  it('normalizes a future string value without hiding its ETA', () => {
    expect(isEtaQuality('PREDICTIVE')).toBe(false);
    expect(normalizeEtaQuality('PREDICTIVE')).toBe('UNKNOWN');
  });

  it.each([undefined, null, 1, {}, []])(
    'normalizes malformed helper input %p to UNKNOWN',
    (value) => {
      expect(isEtaQuality(value)).toBe(false);
      expect(normalizeEtaQuality(value)).toBe('UNKNOWN');
    },
  );
});
