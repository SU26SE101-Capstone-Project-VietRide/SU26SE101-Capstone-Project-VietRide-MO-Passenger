jest.mock('../api/walletApi', () => ({
  MINIMUM_TOP_UP_AMOUNT: 10_000,
}));

import { MINIMUM_TOP_UP_AMOUNT } from '../api/walletApi';
import { resolveTopUpAmount } from './topUpAmount';

describe('resolveTopUpAmount', () => {
  it('accepts a selected preset when custom amount is empty', () => {
    expect(resolveTopUpAmount('', 100_000)).toEqual({
      amount: 100_000,
      issue: null,
    });
  });

  it('rejects custom amounts below the 10.000 VND minimum', () => {
    expect(resolveTopUpAmount('9999', null)).toEqual({
      amount: 9_999,
      issue: 'belowMinimum',
    });
    expect(resolveTopUpAmount('1', 100_000).issue).toBe('belowMinimum');
  });

  it('rejects empty, zero, and non-integer values', () => {
    expect(resolveTopUpAmount('', null)).toEqual({ amount: 0, issue: 'empty' });
    expect(resolveTopUpAmount('0', null)).toEqual({ amount: 0, issue: 'invalid' });
    expect(resolveTopUpAmount('12ab', null)).toEqual({ amount: 0, issue: 'invalid' });
    expect(resolveTopUpAmount(String(Number.MAX_SAFE_INTEGER + 1), null).issue)
      .toBe('invalid');
  });

  it('accepts the exact minimum and larger safe integers', () => {
    expect(resolveTopUpAmount(String(MINIMUM_TOP_UP_AMOUNT), null)).toEqual({
      amount: MINIMUM_TOP_UP_AMOUNT,
      issue: null,
    });
    expect(resolveTopUpAmount('250000', null)).toEqual({
      amount: 250_000,
      issue: null,
    });
  });
});
