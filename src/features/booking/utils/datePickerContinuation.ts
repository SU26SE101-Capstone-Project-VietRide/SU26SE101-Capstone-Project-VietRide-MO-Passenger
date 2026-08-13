export type DatePickerMode = 'departure' | 'return';
export type DatePickerContinuation = 'go_back' | 'select_return' | 'search';

interface ResolveDatePickerContinuationInput {
  isRoundTrip: boolean;
  mode: DatePickerMode;
  next?: 'search';
}

export const resolveDatePickerContinuation = ({
  isRoundTrip,
  mode,
  next,
}: ResolveDatePickerContinuationInput): DatePickerContinuation => {
  if (next !== 'search') return 'go_back';
  if (mode === 'departure' && isRoundTrip) return 'select_return';
  return 'search';
};
