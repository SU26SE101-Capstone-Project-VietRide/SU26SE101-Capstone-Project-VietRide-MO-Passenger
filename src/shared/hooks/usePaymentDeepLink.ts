/**
 * usePaymentDeepLink — Handles VNPay payment return deep links
 *
 * Listens for `vietride://payments/return?vnp_ResponseCode=...&vnp_TxnRef=...`
 * and fires a callback so the app can reconcile payment status.
 *
 * Flow:
 * 1. User pays via VNPay in external browser
 * 2. VNPay redirects to `vietride://payments/return?...`
 * 3. Android intent-filter catches it → app resumes
 * 4. This hook parses the URL and notifies subscribers
 */

import { useEffect, useRef, useCallback } from 'react';
import { Linking } from 'react-native';

export interface VnPayReturnParams {
  /** '00' = success, anything else = failure/cancel */
  vnp_ResponseCode: string | null;
  vnp_TxnRef: string | null;
  vnp_Amount: string | null;
  vnp_OrderInfo: string | null;
  vnp_TransactionNo: string | null;
  /** The full raw URL */
  rawUrl: string;
}

const PAYMENT_RETURN_PATH = 'payments/return';

function parsePaymentReturnUrl(url: string): VnPayReturnParams | null {
  try {
    // Normalize: vietride://payments/return?... → parse query params
    const questionMark = url.indexOf('?');
    if (questionMark === -1) {
      return null;
    }

    // Verify this is a payment return URL
    const pathPart = url.substring(0, questionMark).toLowerCase();
    if (!pathPart.includes(PAYMENT_RETURN_PATH)) {
      return null;
    }

    const queryString = url.substring(questionMark + 1);
    const params = new URLSearchParams(queryString);

    return {
      vnp_ResponseCode: params.get('vnp_ResponseCode'),
      vnp_TxnRef: params.get('vnp_TxnRef'),
      vnp_Amount: params.get('vnp_Amount'),
      vnp_OrderInfo: params.get('vnp_OrderInfo'),
      vnp_TransactionNo: params.get('vnp_TransactionNo'),
      rawUrl: url,
    };
  } catch {
    return null;
  }
}

type PaymentReturnHandler = (params: VnPayReturnParams) => void;

/**
 * Hook that listens for VNPay payment return deep links.
 *
 * @param onPaymentReturn Called when the app receives a payment return deep link.
 *   The `vnp_ResponseCode === '00'` indicates success.
 *
 * @example
 * ```tsx
 * usePaymentDeepLink((params) => {
 *   if (params.vnp_ResponseCode === '00') {
 *     // Payment succeeded — reconcile with backend
 *     refetchBookingStatus();
 *   } else {
 *     // Payment failed or cancelled
 *     showPaymentFailedAlert();
 *   }
 * });
 * ```
 */
export function usePaymentDeepLink(onPaymentReturn: PaymentReturnHandler): void {
  const handlerRef = useRef(onPaymentReturn);
  handlerRef.current = onPaymentReturn;

  const handleUrl = useCallback(({ url }: { url: string }) => {
    const params = parsePaymentReturnUrl(url);
    if (params) {
      handlerRef.current(params);
    }
  }, []);

  useEffect(() => {
    // 1. Handle deep link that opened/resumed the app (cold start)
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleUrl({ url });
        }
      })
      .catch(() => {
        // Silently ignore — getInitialURL can fail in dev
      });

    // 2. Handle deep links while the app is already running (warm resume)
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);
}

export { parsePaymentReturnUrl };
