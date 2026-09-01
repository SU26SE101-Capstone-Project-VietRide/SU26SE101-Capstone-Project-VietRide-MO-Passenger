export const TICKET_JOURNEY_COLOR_TOKENS = {
  pickup: 'primary',
  dropoff: 'success',
  dropoffHalo: 'successLight',
  connector: 'divider',
} as const;

export interface ResolvedTicketJourneyPoint {
  name: string;
  usesRouteEndpoint: boolean;
}

const normalizeLabel = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const resolveTicketJourneyPoint = (
  bookedPointName: string | null | undefined,
  routeEndpointName: string | null | undefined,
  unavailableLabel: string,
): ResolvedTicketJourneyPoint => {
  const bookedName = normalizeLabel(bookedPointName);
  if (bookedName) {
    return { name: bookedName, usesRouteEndpoint: false };
  }

  const routeEndpoint = normalizeLabel(routeEndpointName);
  if (routeEndpoint) {
    return { name: routeEndpoint, usesRouteEndpoint: true };
  }

  return { name: unavailableLabel, usesRouteEndpoint: false };
};
