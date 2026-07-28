import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { usePaymentDeepLink, type PaymentReturnEvent } from '@shared/hooks';

/**
 * Converts an OS payment-return signal into user-scoped cache reconciliation.
 * It never infers success from redirect query parameters; only BE state is
 * authoritative for booking confirmation and wallet balance.
 */
export function PaymentDeepLinkHandler(): null {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  const handlePaymentReturn = useCallback(
    (_event: PaymentReturnEvent) => {
      if (!userId) return;

      queryClient
        .invalidateQueries({
          queryKey: bookingKeys.user(userId),
          refetchType: 'none',
        })
        .catch(() => undefined);

      queryClient
        .invalidateQueries({
          queryKey: parcelKeys.user(userId),
          refetchType: 'none',
        })
        .catch(() => undefined);

      queryClient
        .invalidateQueries({
          queryKey: passengerHistoryKeys.user(userId),
          refetchType: 'none',
        })
        .catch(() => undefined);

      // Payment screens own authoritative foreground reconciliation. This only
      // marks booking/parcel/history data stale so the untrusted OS redirect
      // never races active polling. Wallet top-up remains owned by its
      // single-flight foreground gate.

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
