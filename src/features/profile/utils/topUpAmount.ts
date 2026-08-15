import { MINIMUM_TOP_UP_AMOUNT } from '../api/walletApi';

export type TopUpAmountIssue = 'empty' | 'invalid' | 'belowMinimum';

export interface TopUpAmountResolution {
  amount: number;
  issue: TopUpAmountIssue | null;
}

export function resolveTopUpAmount(
  customAmount: string,
  selectedPreset: number | null,
): TopUpAmountResolution {
  const digits = customAmount.trim();
  if (digits.length > 0) {
    if (!/^\d+$/.test(digits)) {
      return { amount: 0, issue: 'invalid' };
    }

    const parsed = Number.parseInt(digits, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return { amount: 0, issue: 'invalid' };
    }
    if (parsed < MINIMUM_TOP_UP_AMOUNT) {
      return { amount: parsed, issue: 'belowMinimum' };
    }
    return { amount: parsed, issue: null };
  }

  if (
    selectedPreset != null
    && Number.isSafeInteger(selectedPreset)
    && selectedPreset >= MINIMUM_TOP_UP_AMOUNT
  ) {
    return { amount: selectedPreset, issue: null };
  }

  return { amount: 0, issue: 'empty' };
}
