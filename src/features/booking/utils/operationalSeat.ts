export const formatOperationalSeatNumber = (
  seatNumber: string | null,
  pendingAssignmentLabel: string,
): string => seatNumber?.trim() || pendingAssignmentLabel;
