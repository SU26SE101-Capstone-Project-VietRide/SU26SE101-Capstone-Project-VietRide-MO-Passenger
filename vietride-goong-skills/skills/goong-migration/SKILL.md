---
name: goong-migration
description: Safely migrate VietRide map and place features from Google Maps Platform to Goong without breaking booking, parcel, shuttle, or tracking flows.
---

# Google -> Goong Migration

## Goal

Replace Google map/places functionality incrementally, with minimal business regression.

## Step 1 — Inventory before editing

Search the repo for at least:

```text
react-native-maps
PROVIDER_GOOGLE
GooglePlaces
Places SDK
maps.googleapis.com
places.googleapis.com
directions
DistanceMatrix
GOOGLE_MAPS_
@rnmapbox/maps
MapView
Marker
Polyline
Geocoder
```

Classify each usage:

- map rendering
- marker/camera
- current location
- autocomplete
- place detail
- geocode
- directions
- distance matrix
- static map
- unrelated Google Sign-In/Firebase

NEVER remove Google Sign-In or Firebase configuration just because it contains the word Google.

## Step 2 — Decide migration depth

### Level A — REST-only migration

Use when the affected screen already renders correctly through a non-Google renderer.

Replace:

- Google Places -> Goong Autocomplete V2 + Place Detail V2
- Google Geocoding -> Goong Geocode V2
- Google Directions -> Goong Directions V2
- Google Distance Matrix -> Goong Distance Matrix V2

Do not replace renderer unnecessarily.

### Level B — Google map renderer migration

Use when a screen uses `react-native-maps` with Google provider or native Google Maps SDK.

Preferred long-term Goong-only renderer: MapLibre on Goong tiles, following current Goong React Native docs.

For the current codebase, migration MAY temporarily preserve an existing renderer when doing so reduces native-build risk. Make the provider boundary first; renderer replacement can be a separate PR.

## Step 3 — Introduce provider abstraction

Example:

```ts
export interface MapsProvider {
  autocomplete(input: string, options?: AutocompleteOptions): Promise<PlaceSuggestion[]>;
  placeDetail(placeId: string): Promise<ResolvedPlace>;
  geocodeAddress(address: string): Promise<ResolvedPlace[]>;
  reverseGeocode(point: GeoPoint): Promise<ResolvedPlace[]>;
  directions(input: DirectionsInput): Promise<RouteResult[]>;
  distanceMatrix(input: MatrixInput): Promise<MatrixResult>;
}
```

Screens should depend on this interface, not Goong response JSON.

## Step 4 — Normalize provider response

Never spread raw Goong response deep into UI.

Normalize:

```ts
type ResolvedPlace = {
  provider: 'goong';
  placeId?: string;
  name?: string;
  formattedAddress: string;
  location: GeoPoint;
  administrative?: {
    commune?: string;
    province?: string;
  };
};
```

Store provider-specific extras only if the feature needs them.

## Step 5 — Migrate by risk

Recommended order:

1. provider types + coordinate helpers
2. autocomplete
3. place detail
4. geocode/reverse geocode
5. directions
6. route drawing
7. live-tracking map renderer
8. remove dead Google map code/config
9. remove dead package/native setup

## Step 6 — Cleanup only after verification

Before removing a Google map key/dependency:

- full-repo search returns no map-specific usage
- Android/iOS build succeeds
- address search works
- map renders
- route draws
- tracking follows vehicle/user
- unrelated Google Sign-In/Firebase still works

## Mapping table

| Google capability | Goong replacement |
|---|---|
| Places Autocomplete | `GET /v2/place/autocomplete` |
| Place Details | `GET /v2/place/detail` |
| Geocoding | `GET /v2/geocode` |
| Directions | `GET /v2/direction` |
| Distance Matrix | `GET /v2/distancematrix` |
| Google basemap | Goong tiles via supported renderer |
| Device GPS | Keep `expo-location` |
| Live socket tracking | Keep existing Socket.IO flow |

## Do not

- Do not global-find-and-replace `Google`.
- Do not remove OAuth/Firebase config.
- Do not mix provider JSON with domain entities.
- Do not perform renderer migration and business-flow redesign in one change.
- Do not assume `[lat,lng]` and `[lng,lat]` are interchangeable.
