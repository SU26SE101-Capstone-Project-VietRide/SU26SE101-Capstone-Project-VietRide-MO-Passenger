# Google -> Goong migration checklist

## Inventory

- [ ] Search `react-native-maps`.
- [ ] Search `PROVIDER_GOOGLE`.
- [ ] Search `maps.googleapis.com`.
- [ ] Search Places/Geocoder/Directions/DistanceMatrix usage.
- [ ] Search `GOOGLE_MAPS_`.
- [ ] Identify Google Sign-In/Firebase config that MUST remain.
- [ ] Identify `@rnmapbox/maps` usage separately.

## Provider layer

- [ ] Domain coordinate type is `{ latitude, longitude }`.
- [ ] Goong REST conversion helper exists.
- [ ] GeoJSON conversion helper exists.
- [ ] Raw Goong JSON is normalized.
- [ ] Screens do not call `rsapi.goong.io` directly.

## Places

- [ ] Autocomplete V2 implemented.
- [ ] Debounce/min-character policy implemented.
- [ ] Stale requests cannot overwrite latest query.
- [ ] Place Detail V2 resolves final coordinate.
- [ ] Geocode/reverse geocode implemented only where needed.
- [ ] Administrative-unit compatibility behavior is intentional.

## Routing

- [ ] Directions V2 uses `lat,lng`.
- [ ] Route polyline is decoded once.
- [ ] UI receives `GeoPoint[]`.
- [ ] GeoJSON renderer receives `[lng,lat]`.
- [ ] Directions is not called per GPS packet.

## Map

- [ ] Goong Maptiles key is used for map style.
- [ ] Current-location marker is correct.
- [ ] Pickup/dropoff markers are correct.
- [ ] Route line aligns with road.
- [ ] Camera fit/follow behavior works.

## Security

- [ ] Maptiles key and REST API key are separate.
- [ ] Real keys are not committed.
- [ ] Production REST architecture matches intended proxy/direct decision.
- [ ] `api_key` is redacted from logs.

## Regression

- [ ] Passenger address selection works.
- [ ] Shuttle address selection works if applicable.
- [ ] Ticket tracking works.
- [ ] Parcel tracking works.
- [ ] Booking flow unchanged.
- [ ] Parcel flow unchanged.
- [ ] Socket tracking unchanged.
- [ ] Google Sign-In still works.
- [ ] Firebase still works.
- [ ] Android build passes.
- [ ] iOS build passes if project targets iOS.

## Cleanup

- [ ] No remaining map-specific Google usage.
- [ ] Dead Google map env vars removed.
- [ ] Dead native Google map config removed.
- [ ] Dead dependencies removed only after repo-wide verification.
