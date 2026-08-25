---
name: goong-routing
description: Use Goong Directions V2 for route, distance, duration, and route geometry without coordinate-order bugs.
---

# Goong Routing

## Endpoint

```text
GET https://rsapi.goong.io/v2/direction
```

Core params:

```text
origin=latitude,longitude
destination=latitude,longitude
vehicle=...
api_key=...
```

Goong V2 docs define `origin` and `destination` in latitude,longitude order.

## Vehicle

Do not invent vehicle values.

Use only values documented by the currently targeted Goong endpoint and centralize the app-to-provider mapping.

Example contract:

```ts
type AppVehicle = 'car' | 'motorcycle' | 'truck' | 'bike';

function toGoongVehicle(v: AppVehicle): string {
  // map only after checking current Goong V2 docs
}
```

## Request boundary

Always build request coordinates through:

```ts
toGoongLatLng(point)
```

Never inline string interpolation in screens.

## Response normalization

UI/domain should receive:

```ts
type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  points: GeoPoint[];
  provider: 'goong';
};
```

Do not expose raw `routes[0]...` throughout the app.

## Polyline

Goong's React Native integration docs demonstrate reading:

```text
routes[0].overview_polyline.points
```

and decoding it before rendering.

Decode in the provider/adapter layer.

After decode, normalize to:

```ts
GeoPoint[]
```

Only at GeoJSON render boundary convert each point to `[longitude, latitude]`.

## Alternatives

If `alternatives=true` is used:

- expose multiple routes intentionally;
- do not silently pick an arbitrary route;
- define product selection logic.

If the product does not support route choice, keep alternatives off.

## Tracking use

Directions is not a substitute for live tracking.

For a moving shuttle/vehicle:

- socket/GPS provides live position;
- Directions may be re-requested when rerouting is truly needed;
- do not call Directions on every GPS packet.

## Definition of done

- origin/destination are correct.
- distance and duration use numeric values internally.
- route polyline aligns with basemap.
- no directions request loop is tied directly to high-frequency location updates.
- no raw provider response leaks into UI.
