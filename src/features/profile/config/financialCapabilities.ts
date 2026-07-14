/**
 * Release gates for profile-owned financial features.
 *
 * Keep these fail-closed until the mobile feature is backed by production APIs,
 * verified redirect/deep-link handling, and end-to-end tests. Do not wire these
 * gates to EXPO_PUBLIC_* variables: a build-time flag must never expose mock
 * balances, transactions, or credential-entry forms.
 */
export const PROFILE_FINANCIAL_CAPABILITIES = Object.freeze({
  walletOverview: false,
  topUp: false,
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

export const isProfileWalletEntryPointEnabled = (): boolean =>
  PROFILE_FINANCIAL_CAPABILITIES.walletOverview;

