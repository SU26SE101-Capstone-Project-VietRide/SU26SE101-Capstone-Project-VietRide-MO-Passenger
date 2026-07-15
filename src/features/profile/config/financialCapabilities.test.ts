import {
  COMING_SOON_FINANCIAL_ROUTES,
  getFinancialUnavailableNotice,
  isProfileWalletEntryPointEnabled,
  PROFILE_FINANCIAL_CAPABILITIES,
  PROFILE_PAYMENT_DATA_POLICY,
} from './financialCapabilities';

describe('profile financial release gates', () => {
  it('enables only the BE-backed wallet and VNPay top-up capabilities', () => {
    expect(PROFILE_FINANCIAL_CAPABILITIES).toEqual({
      walletOverview: true,
      topUp: true,
      withdrawal: false,
      savedPaymentMethods: false,
    });
    expect(isProfileWalletEntryPointEnabled()).toBe(true);
  });

  it('never allows raw PAN or CVV collection in React Native state', () => {
    expect(PROFILE_PAYMENT_DATA_POLICY).toEqual({
      acceptsRawCardNumber: false,
      acceptsCvv: false,
    });
  });

  it.each([
    ['Withdraw', 'Withdraw funds', 'withdrawal or payout contract'],
    ['SavedPayments', 'Saved payment methods', 'tokenized payment-method management contract'],
    ['AddPaymentMethod', 'Add payment method', 'PCI-compliant hosted flow'],
  ] as const)(
    'provides route-specific fail-closed copy for %s',
    (routeName, title, reasonFragment) => {
      const notice = getFinancialUnavailableNotice(routeName);

      expect(notice.title).toBe(title);
      expect(notice.description).toContain(reasonFragment);
      expect(notice.safetyNote).toMatch(/does not|No bank account/i);
    },
  );

  it('keeps every unsupported financial capability visible as a coming-soon route', () => {
    expect(COMING_SOON_FINANCIAL_ROUTES).toEqual([
      'Withdraw',
      'SavedPayments',
      'AddPaymentMethod',
    ]);
    expect(PROFILE_FINANCIAL_CAPABILITIES.withdrawal).toBe(false);
    expect(PROFILE_FINANCIAL_CAPABILITIES.savedPaymentMethods).toBe(false);
  });
});
