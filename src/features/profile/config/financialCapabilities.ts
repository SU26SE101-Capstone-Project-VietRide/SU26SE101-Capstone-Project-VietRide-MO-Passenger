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
  readonly title: string;
  readonly description: string;
  readonly safetyNote: string;
}

const FINANCIAL_UNAVAILABLE_NOTICES: Readonly<
  Record<FinancialUnavailableRoute, FinancialUnavailableNotice>
> = Object.freeze({
  Wallet: {
    title: 'Wallet unavailable',
    description:
      'Wallet access is disabled for this release. No balance or transaction request will be made from this screen.',
    safetyNote: 'Your existing booking and payment flows are not changed.',
  },
  TopUp: {
    title: 'Top up unavailable',
    description:
      'VNPay top-up is disabled for this release. VietRide will not start a payment request from this screen.',
    safetyNote: 'No payment is assumed successful until the backend ledger confirms it.',
  },
  Withdraw: {
    title: 'Withdraw funds',
    description:
      'Coming soon. The current passenger backend does not expose a supported withdrawal or payout contract.',
    safetyNote: 'No bank account, card number, PIN, or CVV is collected here.',
  },
  SavedPayments: {
    title: 'Saved payment methods',
    description:
      'Coming soon. The current passenger backend does not expose a supported tokenized payment-method management contract.',
    safetyNote: 'VietRide does not invent or store card details in app state.',
  },
  AddPaymentMethod: {
    title: 'Add payment method',
    description:
      'Coming soon. Adding a payment method requires a backend-approved, PCI-compliant hosted flow or native SDK.',
    safetyNote: 'This app does not collect raw card numbers or CVV.',
  },
});

export const getFinancialUnavailableNotice = (
  routeName: FinancialUnavailableRoute,
): FinancialUnavailableNotice => FINANCIAL_UNAVAILABLE_NOTICES[routeName];

export const isProfileWalletEntryPointEnabled = (): boolean =>
  PROFILE_FINANCIAL_CAPABILITIES.walletOverview;
