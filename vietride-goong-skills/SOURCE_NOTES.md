# Source notes

This pack was prepared against Goong Help documentation available on 2026-08-25.

Verified official behavior used by the skills:

1. Goong provides two key types:
   - Map Tiles for map view
   - API Key for REST API

2. Goong React Native documentation includes MapLibre integration and demonstrates:
   - Goong map style URL
   - `[lng, lat]` map coordinates
   - Autocomplete -> Place Detail search flow
   - Directions route decoding

3. Goong REST API V2 includes:
   - Autocomplete
   - Place Detail
   - Geocode
   - Directions
   - Distance Matrix
   - Trip

4. Verified V2 endpoints:
   - `https://rsapi.goong.io/v2/place/autocomplete`
   - `https://rsapi.goong.io/v2/place/detail`
   - `https://rsapi.goong.io/v2/geocode`
   - `https://rsapi.goong.io/v2/direction`
   - `https://rsapi.goong.io/v2/distancematrix`

5. Directions V2 documents origin/destination in `latitude,longitude` order.

6. Distance Matrix V2 documents origins/destinations in `latitude,longitude` order.

Always re-check official docs when modifying endpoint paths, supported vehicle values, quota limits or provider-specific response fields.
