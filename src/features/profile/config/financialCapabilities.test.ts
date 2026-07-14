import {
  isProfileWalletEntryPointEnabled,
  PROFILE_FINANCIAL_CAPABILITIES,
  PROFILE_PAYMENT_DATA_POLICY,
} from './financialCapabilities';

describe('profile financial release gates', () => {
  it('keeps every unimplemented financial entry point fail-closed', () => {
    expect(Object.values(PROFILE_FINANCIAL_CAPABILITIES)).not.toContain(true);
    expect(isProfileWalletEntryPointEnabled()).toBe(false);
  });

  it('never allows raw PAN or CVV collection in React Native state', () => {
    expect(PROFILE_PAYMENT_DATA_POLICY).toEqual({
      acceptsRawCardNumber: false,
      acceptsCvv: false,
    });
  });
});

