import { useQuery } from '@tanstack/react-query';
import { getBookingHistory, bookingKeys } from '../api/bookingApi';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { BookingHistoryItem } from '../types/booking';

export function useBookingHistory() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: user ? bookingKeys.history() : ['bookings', 'history', 'none'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return getBookingHistory();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!user,
  });
}
