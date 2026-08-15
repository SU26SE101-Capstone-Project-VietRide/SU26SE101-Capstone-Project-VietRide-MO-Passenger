import {
  resolveTripSearchRequest,
  toTripSearchFingerprint,
} from './resolveTripSearchRequest';

const sameCityLocations = {
  originStationId: '',
  destinationStationId: '',
  originLocationCode: '79',
  destinationLocationCode: '79',
  originWardCode: '',
  destinationWardCode: '',
};

describe('resolveTripSearchRequest', () => {
  it('uses the outbound trip station pair reversed for the return leg', () => {
    const result = resolveTripSearchRequest({
      isReturnLeg: true,
      locations: sameCityLocations,
      outboundTrip: {
        originStationId: 'mien-dong',
        destinationStationId: 'binh-duong',
      },
    });

    expect(result).toEqual({
      ok: true,
      request: {
        kind: 'station-pair',
        originStationId: 'binh-duong',
        destinationStationId: 'mien-dong',
      },
    });
  });

  it('does not rediscover the outbound trip by swapping identical province scopes', () => {
    expect(resolveTripSearchRequest({
      isReturnLeg: true,
      locations: sameCityLocations,
      outboundTrip: null,
    })).toEqual({
      ok: false,
      reason: 'collapsed-return-scope',
    });
  });

  it('still swaps distinct wards inside the same province', () => {
    const result = resolveTripSearchRequest({
      isReturnLeg: true,
      locations: {
        ...sameCityLocations,
        originWardCode: '26734',
        destinationWardCode: '26737',
      },
      outboundTrip: null,
    });

    expect(result).toEqual({
      ok: true,
      request: {
        kind: 'hierarchy',
        originProvinceCode: '79',
        destinationProvinceCode: '79',
        originLocationCode: '26737',
        destinationLocationCode: '26734',
      },
    });
  });

  it('builds a stable fingerprint without serializing objects', () => {
    expect(toTripSearchFingerprint({
      kind: 'station-pair',
      originStationId: 'binh-duong',
      destinationStationId: 'mien-dong',
    })).toBe('station|binh-duong|mien-dong');
  });

  it('keeps outbound hierarchy search for same-province all-wards', () => {
    const result = resolveTripSearchRequest({
      isReturnLeg: false,
      locations: sameCityLocations,
    });

    expect(result).toEqual({
      ok: true,
      request: {
        kind: 'hierarchy',
        originProvinceCode: '79',
        destinationProvinceCode: '79',
      },
    });
  });
});
