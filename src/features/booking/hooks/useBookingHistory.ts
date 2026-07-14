import { useQuery } from '@tanstack/react-query';
import { getBookingHistory, bookingKeys } from '../api/bookingApi';
import { useAuthStore } from '../../auth/store/useAuthStore';

export function useBookingHistory() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: userId ? bookingKeys.history(userId) : ['bookings', 'none', 'history'],
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error('Not authenticated');
      return getBookingHistory(signal);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(userId),
  });
}
