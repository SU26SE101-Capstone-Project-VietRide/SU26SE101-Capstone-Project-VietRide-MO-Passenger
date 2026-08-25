import {
  MAX_SCANNABLE_CODE_SIZE,
  MIN_SCANNABLE_CODE_SIZE,
  getResponsiveScannableCodeSize,
} from './ScannableCodeCard';

describe('getResponsiveScannableCodeSize', () => {
  it('clamps compact cards to the minimum scannable size', () => {
    expect(getResponsiveScannableCodeSize(120)).toBe(MIN_SCANNABLE_CODE_SIZE);
  });

  it('uses the measured width inside the supported range', () => {
    expect(getResponsiveScannableCodeSize(172.8)).toBe(172);
  });

  it('clamps large cards to the maximum supported size', () => {
    expect(getResponsiveScannableCodeSize(240)).toBe(MAX_SCANNABLE_CODE_SIZE);
  });

  it('falls back safely when layout has not produced a finite width', () => {
    expect(getResponsiveScannableCodeSize(Number.NaN)).toBe(MIN_SCANNABLE_CODE_SIZE);
  });
});
