/**
 * Builds the public GET /v1/trips/search payload.
 *
 * Round-trip return is the reverse of the selected outbound *path*, not a
 * swap of the original city/ward codes. Swapping TPHCM→TPHCM is a no-op and
 * would rediscover the outbound trip as if it were the return.
 */
export interface TripSearchLocationInput {
  originStationId: string;
  destinationStationId: string;
  originLocationCode: string;
  destinationLocationCode: string;
  originWardCode: string;
  destinationWardCode: string;
}

export interface OutboundTripStations {
  originStationId?: string;
  destinationStationId?: string;
}

export type ResolvedTripSearchRequest =
  | {
    kind: 'station-pair';
    originStationId: string;
    destinationStationId: string;
  }
  | {
    kind: 'hierarchy';
    originProvinceCode: string;
    destinationProvinceCode: string;
    originLocationCode?: string;
    destinationLocationCode?: string;
  };

export type ResolveTripSearchResult =
  | { ok: true; request: ResolvedTripSearchRequest }
  | { ok: false; reason: 'missing-pair' | 'collapsed-return-scope' };

const trim = (value: string | undefined): string => value?.trim() ?? '';

const stationPair = (
  originStationId: string,
  destinationStationId: string,
): ResolvedTripSearchRequest | null => {
  const origin = trim(originStationId);
  const destination = trim(destinationStationId);
  if (!origin || !destination) return null;
  return {
    kind: 'station-pair',
    originStationId: origin,
    destinationStationId: destination,
  };
};

const hierarchyScopeKey = (
  provinceCode: string,
  wardCode: string,
): string => `${provinceCode}|${wardCode}`;

export function toTripSearchFingerprint(request: ResolvedTripSearchRequest): string {
  if (request.kind === 'station-pair') {
    return `station|${request.originStationId}|${request.destinationStationId}`;
  }
  return [
    'hierarchy',
    request.originProvinceCode,
    request.originLocationCode ?? '',
    request.destinationProvinceCode,
    request.destinationLocationCode ?? '',
  ].join('|');
}

export function resolveTripSearchRequest(input: {
  isReturnLeg: boolean;
  locations: TripSearchLocationInput;
  outboundTrip?: OutboundTripStations | null;
}): ResolveTripSearchResult {
  const locations = input.locations;

  if (input.isReturnLeg) {
    const reverseOfOutbound = stationPair(
      input.outboundTrip?.destinationStationId ?? '',
      input.outboundTrip?.originStationId ?? '',
    );
    if (reverseOfOutbound) {
      return { ok: true, request: reverseOfOutbound };
    }
  }

  const selectedStations = input.isReturnLeg
    ? stationPair(locations.destinationStationId, locations.originStationId)
    : stationPair(locations.originStationId, locations.destinationStationId);
  if (selectedStations) {
    return { ok: true, request: selectedStations };
  }

  const originProvince = trim(
    input.isReturnLeg ? locations.destinationLocationCode : locations.originLocationCode,
  );
  const destinationProvince = trim(
    input.isReturnLeg ? locations.originLocationCode : locations.destinationLocationCode,
  );
  const originWard = trim(
    input.isReturnLeg ? locations.destinationWardCode : locations.originWardCode,
  );
  const destinationWard = trim(
    input.isReturnLeg ? locations.originWardCode : locations.destinationWardCode,
  );

  if (!originProvince || !destinationProvince) {
    return { ok: false, reason: 'missing-pair' };
  }

  if (
    input.isReturnLeg
    && hierarchyScopeKey(originProvince, originWard)
      === hierarchyScopeKey(destinationProvince, destinationWard)
  ) {
    return { ok: false, reason: 'collapsed-return-scope' };
  }

  return {
    ok: true,
    request: {
      kind: 'hierarchy',
      originProvinceCode: originProvince,
      destinationProvinceCode: destinationProvince,
      ...(originWard ? { originLocationCode: originWard } : {}),
      ...(destinationWard ? { destinationLocationCode: destinationWard } : {}),
    },
  };
}
