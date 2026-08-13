import { resolveDatePickerContinuation } from './datePickerContinuation';

describe('resolveDatePickerContinuation', () => {
  it('keeps ordinary date edits on the current screen flow', () => {
    expect(resolveDatePickerContinuation({
      isRoundTrip: false,
      mode: 'departure',
    })).toBe('go_back');
  });

  it('requires a return date before searching for a round trip', () => {
    expect(resolveDatePickerContinuation({
      isRoundTrip: true,
      mode: 'departure',
      next: 'search',
    })).toBe('select_return');
  });

  it.each([
    ['departure', false],
    ['return', true],
  ] as const)('continues to search after selecting %s', (mode, isRoundTrip) => {
    expect(resolveDatePickerContinuation({
      isRoundTrip,
      mode,
      next: 'search',
    })).toBe('search');
  });
});
