import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { usePaymentDeepLink, type PaymentReturnEvent } from '@shared/hooks';

/**
 * Converts an OS payment-return signal into user-scoped cache reconciliation.
 * It never infers success from redirect query parameters; only BE state is
 * authoritative for booking confirmation and wallet balance.
 */
export function PaymentDeepLinkHandler(): null {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  const handlePaymentReturn = useCallback(
    (_event: PaymentReturnEvent) => {
      if (!userId) return;

      queryClient
        .invalidateQueries({
          queryKey: bookingKeys.user(userId),
          refetchType: 'none',
        })
        .catch(() => undefined);

      // Payment screens own the authoritative foreground reconciliation. This
      // only marks booking data stale so active polling is never restarted or
      // raced by an untrusted OS redirect signal. Wallet top-up deliberately
      // remains owned by its single-flight foreground gate.

      Alert.alert(
        'Đang xác nhận thanh toán',
        'VietRide đã nhận tín hiệu quay lại. Kết quả chỉ được cập nhật sau khi hệ thống xác minh giao dịch với VNPay.',
        [{ text: 'Đã hiểu' }],
      );
    },
    [queryClient, userId],
  );

  usePaymentDeepLink(handlePaymentReturn);
  return null;
}
