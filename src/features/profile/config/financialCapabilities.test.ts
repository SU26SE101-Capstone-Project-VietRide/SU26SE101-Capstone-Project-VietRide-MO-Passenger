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
    ['Withdraw', 'financial.withdraw'],
    ['SavedPayments', 'financial.savedPayments'],
    ['AddPaymentMethod', 'financial.addPaymentMethod'],
  ] as const)(
    'provides route-specific fail-closed translation keys for %s',
    (routeName, translationPrefix) => {
      const notice = getFinancialUnavailableNotice(routeName);

      expect(notice.titleKey).toBe(`${translationPrefix}.title`);
      expect(notice.descriptionKey).toBe(`${translationPrefix}.description`);
      expect(notice.safetyNoteKey).toBe(`${translationPrefix}.safety`);
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
