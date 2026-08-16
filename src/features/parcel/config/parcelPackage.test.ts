import {
  areParcelDimensionsPositive,
  getParcelDimensions,
  MIN_PARCEL_DIMENSION_CM,
  resolveParcelSizeFromDimensions,
} from './parcelPackage';

describe('parcel package presets', () => {
  it('keeps size choices as fill-in presets', () => {
    expect(getParcelDimensions('small')).toEqual({
      lengthCm: 25,
      widthCm: 20,
      heightCm: 10,
    });
  });

  it('accepts measurements above the 5 cm floor, including oversize cargo', () => {
    expect(
      areParcelDimensionsPositive({
        lengthCm: MIN_PARCEL_DIMENSION_CM,
        widthCm: MIN_PARCEL_DIMENSION_CM,
        heightCm: MIN_PARCEL_DIMENSION_CM,
      }),
    ).toBe(true);
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
    { lengthCm: 4.99, widthCm: 20, heightCm: 10 },
    { lengthCm: 25, widthCm: -1, heightCm: 10 },
    { lengthCm: 25, widthCm: 20, heightCm: Number.NaN },
  ])('rejects dimensions below 5 cm or non-finite: %o', dimensions => {
    expect(areParcelDimensionsPositive(dimensions)).toBe(false);
  });

  it('moves the quick-access chip to the smallest preset that can hold the box', () => {
    expect(resolveParcelSizeFromDimensions({
      lengthCm: 5,
      widthCm: 5,
      heightCm: 5,
    })).toBe('small');
    expect(resolveParcelSizeFromDimensions(getParcelDimensions('small'))).toBe('small');
    expect(resolveParcelSizeFromDimensions({
      lengthCm: 10,
      widthCm: 25,
      heightCm: 20,
    })).toBe('small');
    expect(resolveParcelSizeFromDimensions({
      lengthCm: 26,
      widthCm: 20,
      heightCm: 10,
    })).toBe('medium');
    expect(resolveParcelSizeFromDimensions(getParcelDimensions('medium'))).toBe('medium');
    expect(resolveParcelSizeFromDimensions({
      lengthCm: 46,
      widthCm: 35,
      heightCm: 25,
    })).toBe('large');
    expect(resolveParcelSizeFromDimensions({
      lengthCm: 120,
      widthCm: 80,
      heightCm: 70,
    })).toBe('large');
  });
});
