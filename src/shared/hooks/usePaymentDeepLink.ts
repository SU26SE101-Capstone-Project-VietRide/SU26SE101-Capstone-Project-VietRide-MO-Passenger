import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';

export const PAYMENT_RETURN_DEEP_LINK = 'vietride://payments/return';
export const PAYMENT_RETURN_APP_LINK = 'https://app.vietride.online/payments/return';

const MAX_PAYMENT_RETURN_URL_LENGTH = 4_096;
const MAX_QUERY_PARAMETER_COUNT = 32;
const MAX_QUERY_KEY_LENGTH = 96;
const MAX_QUERY_VALUE_LENGTH = 1_024;
const DUPLICATE_DELIVERY_WINDOW_MS = 1_500;

export interface PaymentReturnEvent {
  source: 'custom-scheme' | 'app-link';
}

const hasUnambiguousQuery = (url: URL): boolean => {
  const seenKeys = new Set<string>();
  let parameterCount = 0;

  for (const [rawKey, value] of url.searchParams.entries()) {
    parameterCount += 1;
    const key = rawKey.toLowerCase();

    if (
      parameterCount > MAX_QUERY_PARAMETER_COUNT
      || key.length === 0
      || key.length > MAX_QUERY_KEY_LENGTH
      || value.length > MAX_QUERY_VALUE_LENGTH
      || seenKeys.has(key)
    ) {
      return false;
    }

    seenKeys.add(key);
  }

  return true;
};

/**
 * Accepts only VietRide's exact payment-return endpoints. Query values are
 * deliberately not exposed: browser-return data is untrusted and can only
 * wake the app so authenticated APIs can reconcile the actual payment state.
 */
export function parsePaymentReturnUrl(url: string): PaymentReturnEvent | null {
  if (url.length === 0 || url.length > MAX_PAYMENT_RETURN_URL_LENGTH) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.username
      || parsedUrl.password
      || parsedUrl.port
      || parsedUrl.hash
      || !hasUnambiguousQuery(parsedUrl)
    ) {
      return null;
    }

    if (
      parsedUrl.protocol === 'vietride:'
      && parsedUrl.hostname === 'payments'
      && parsedUrl.pathname === '/return'
    ) {
      return { source: 'custom-scheme' };
    }

    if (
      parsedUrl.protocol === 'https:'
      && parsedUrl.hostname === 'app.vietride.online'
      && parsedUrl.pathname === '/payments/return'
    ) {
      return { source: 'app-link' };
    }
  } catch {
    return null;
  }

  return null;
}

type PaymentReturnHandler = (event: PaymentReturnEvent) => void;

/** Handles cold and warm payment returns without trusting gateway query data. */
export function usePaymentDeepLink(onPaymentReturn: PaymentReturnHandler): void {
  const handlerRef = useRef(onPaymentReturn);
  const lastDeliveryAtRef = useRef<number | null>(null);
  handlerRef.current = onPaymentReturn;

  const handleUrl = useCallback(({ url }: { url: string }) => {
    const event = parsePaymentReturnUrl(url);
    if (!event) return;

    const now = Date.now();
    const lastDeliveryAt = lastDeliveryAtRef.current;
    if (
      lastDeliveryAt !== null
      && now - lastDeliveryAt < DUPLICATE_DELIVERY_WINDOW_MS
    ) {
      return;
    }

    lastDeliveryAtRef.current = now;
    handlerRef.current(event);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL()
      .then((url) => {
        if (isMounted && url) {
          handleUrl({ url });
        }
      })
      .catch(() => {
        // A failed initial URL lookup must never block app startup.
      });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [handleUrl]);
}
