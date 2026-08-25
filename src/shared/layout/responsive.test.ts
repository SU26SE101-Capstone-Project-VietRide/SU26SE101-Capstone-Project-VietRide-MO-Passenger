import { getWidthClass } from './responsive';

describe('getWidthClass', () => {
  it.each([
    [320, 'compact'],
    [359, 'compact'],
    [360, 'regular'],
    [390, 'regular'],
    [429, 'regular'],
    [430, 'large'],
  ] as const)('resolves %ipx to %s', (width, expected) => {
    expect(getWidthClass(width)).toBe(expected);
  });
});
