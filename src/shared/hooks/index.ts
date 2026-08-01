/**
 * Shared Hooks — Barrel Export
 */

export { useDebounce } from './useDebounce';
export { useCurrentCoordinates } from './useCurrentCoordinates';
export type { CurrentCoordinates } from './useCurrentCoordinates';
export { useIsAppActive } from './useIsAppActive';
export { useNetworkStatus } from './useNetworkStatus';
export { useThemedStyles } from './useThemedStyles';
export { useApiError } from './useApiError';
export { useTabBarScrollBehavior } from './useTabBarScrollBehavior';
export { useFloatingTabBarContentInset } from './useFloatingTabBarContentInset';
export {
  PAYMENT_RETURN_APP_LINK,
  PAYMENT_RETURN_DEEP_LINK,
  parsePaymentReturnUrl,
  usePaymentDeepLink,
} from './usePaymentDeepLink';
export type { PaymentReturnEvent } from './usePaymentDeepLink';
