/**
 * Compatibility export for callers that still reference the legacy route.
 * Financial routes remain fail-closed until a production implementation lands.
 */
export {
  FinancialFeatureUnavailableScreen as WalletScreen,
} from './FinancialFeatureUnavailableScreen';
