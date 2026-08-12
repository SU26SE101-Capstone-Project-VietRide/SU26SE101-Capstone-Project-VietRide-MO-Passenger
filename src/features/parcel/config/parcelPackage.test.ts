import {
  areParcelDimensionsPositive,
  getParcelDimensions,
} from './parcelPackage';

describe('parcel package presets', () => {
  it('keeps size choices as fill-in presets', () => {
    expect(getParcelDimensions('small')).toEqual({
      lengthCm: 25,
      widthCm: 20,
      heightCm: 10,
    });
  });

  it('accepts arbitrary positive dimensions instead of enforcing a preset envelope', () => {
    expect(
      areParcelDimensionsPositive({
        lengthCm: 120,
        widthCm: 80,
        heightCm: 70,
      }),
    ).toBe(true);
  });

  it.each([
    { lengthCm: 0, widthCm: 20, heightCm: 10 },
    { lengthCm: 25, widthCm: -1, heightCm: 10 },
    { lengthCm: 25, widthCm: 20, heightCm: Number.NaN },
  ])('rejects non-positive or non-finite dimensions: %o', dimensions => {
    expect(areParcelDimensionsPositive(dimensions)).toBe(false);
  });
});
