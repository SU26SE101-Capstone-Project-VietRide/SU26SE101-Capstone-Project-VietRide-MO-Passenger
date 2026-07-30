/**
 * Release gates for profile-owned financial features.
 *
 * Capabilities are compile-time release decisions, never environment flags.
 * Wallet overview and VNPay top-up are backed by WalletController. Withdrawal
 * and saved-card management stay fail-closed because the BE has no supported
 * passenger contract for them.
 */
export const PROFILE_FINANCIAL_CAPABILITIES = Object.freeze({
  walletOverview: true,
  topUp: true,
  withdrawal: false,
  savedPaymentMethods: false,
});

/**
 * PAN and CVV must be collected by a PCI-compliant hosted flow or native SDK,
 * never by VietRide JavaScript state.
 */
export const PROFILE_PAYMENT_DATA_POLICY = Object.freeze({
  acceptsRawCardNumber: false,
  acceptsCvv: false,
});

export type FinancialUnavailableRoute =
  | 'Wallet'
  | 'TopUp'
  | 'Withdraw'
  | 'SavedPayments'
  | 'AddPaymentMethod';

export type ComingSoonFinancialRoute = Extract<
  FinancialUnavailableRoute,
  'Withdraw' | 'SavedPayments' | 'AddPaymentMethod'
>;

export const COMING_SOON_FINANCIAL_ROUTES: readonly ComingSoonFinancialRoute[] = Object.freeze([
  'Withdraw',
  'SavedPayments',
  'AddPaymentMethod',
]);

export interface FinancialUnavailableNotice {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly safetyNoteKey: string;
}

const FINANCIAL_UNAVAILABLE_NOTICES: Readonly<
  Record<FinancialUnavailableRoute, FinancialUnavailableNotice>
> = Object.freeze({
  Wallet: {
    titleKey: 'financial.walletUnavailable.title',
    descriptionKey: 'financial.walletUnavailable.description',
    safetyNoteKey: 'financial.walletUnavailable.safety',
  },
  TopUp: {
    titleKey: 'financial.topUpUnavailable.title',
    descriptionKey: 'financial.topUpUnavailable.description',
    safetyNoteKey: 'financial.topUpUnavailable.safety',
  },
  Withdraw: {
    titleKey: 'financial.withdraw.title',
    descriptionKey: 'financial.withdraw.description',
    safetyNoteKey: 'financial.withdraw.safety',
  },
  SavedPayments: {
    titleKey: 'financial.savedPayments.title',
    descriptionKey: 'financial.savedPayments.description',
    safetyNoteKey: 'financial.savedPayments.safety',
  },
  AddPaymentMethod: {
    titleKey: 'financial.addPaymentMethod.title',
    descriptionKey: 'financial.addPaymentMethod.description',
    safetyNoteKey: 'financial.addPaymentMethod.safety',
  },
});

export const getFinancialUnavailableNotice = (
  routeName: FinancialUnavailableRoute,
): FinancialUnavailableNotice => FINANCIAL_UNAVAILABLE_NOTICES[routeName];

export const isProfileWalletEntryPointEnabled = (): boolean =>
  PROFILE_FINANCIAL_CAPABILITIES.walletOverview;
