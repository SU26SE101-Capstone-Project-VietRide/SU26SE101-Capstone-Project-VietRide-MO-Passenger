/**
 * PaymentDeepLinkHandler — Global listener for VNPay payment return deep links
 *
 * Mounted once in the RootNavigator. When a `vietride://payments/return` deep
 * link is received, it invalidates relevant React Query caches so any visible
 * booking/wallet screen automatically re-fetches the latest payment status.
 *
 * This is the "glue" between the OS-level deep link and the app's existing
 * polling/reconciliation hooks.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { usePaymentDeepLink, type VnPayReturnParams } from '@shared/hooks';

/** Render-less component — returns null, produces no UI. */
export function PaymentDeepLinkHandler(): null {
  const queryClient = useQueryClient();

  const handlePaymentReturn = useCallback(
    (params: VnPayReturnParams) => {
      const isSuccess = params.vnp_ResponseCode === '00';

      // Invalidate all booking and wallet queries so any active
      // reconciliation hook or screen picks up the new status.
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });

      if (isSuccess) {
        Alert.alert(
          'Thanh toán thành công',
          'Giao dịch VNPay đã hoàn tất. Hệ thống đang xác nhận đơn hàng của bạn.',
          [{ text: 'OK' }],
        );
      } else {
        const code = params.vnp_ResponseCode ?? 'unknown';
        Alert.alert(
          'Thanh toán chưa hoàn tất',
          `Giao dịch VNPay chưa thành công (mã: ${code}). Bạn có thể thử lại từ màn hình đặt vé.`,
          [{ text: 'OK' }],
        );
      }
    },
    [queryClient],
  );

  usePaymentDeepLink(handlePaymentReturn);

  return null;
}
