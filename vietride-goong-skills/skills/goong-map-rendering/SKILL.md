---
name: goong-map-rendering
description: Render Goong maps correctly in React Native, including camera, markers, lines, and coordinate conversion.
---

# Goong Map Rendering

## Renderer policy

For a new Goong-native rendering path, follow Goong's current React Native MapLibre documentation.

For an existing VietRide screen:

1. inspect current renderer;
2. preserve it if the task only changes Places/REST and it can consume the required Goong data;
3. migrate renderer separately when needed.

Do not introduce a second native map renderer to the same screen.

## Maptiles

Goong documents a dedicated Maptiles Key for map view.

Example style pattern documented by Goong:

```text
https://tiles.goong.io/assets/goong_map_web.json?api_key=<MAPTILES_KEY>
```

Keep style URL construction in one config function.

## Coordinates

MapLibre / GeoJSON coordinate order:

```ts
[longitude, latitude]
```

Use a helper:

```ts
toGeoJSONPosition(point)
```

Never write:

```ts
coordinate={[point.latitude, point.longitude]}
```

## Camera

All camera actions must accept `GeoPoint` and convert at the renderer boundary.

Examples of camera intents:

- center current user
- center selected place
- fit route bounds
- follow moving vehicle
- stop following after manual map gesture

Do not let camera state become the source of truth for booking location data.

## Markers

Marker data should have a stable ID.

```ts
type MapMarker = {
  id: string;
  point: GeoPoint;
  kind: 'pickup' | 'dropoff' | 'vehicle' | 'user' | 'stop';
};
```

Avoid index-only IDs when markers can reorder.

## Route line

Use GeoJSON LineString:

```ts
{
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: route.points.map(toGeoJSONPosition)
  },
  properties: {}
}
```

The provider adapter should decode/normalize route geometry before the UI receives it.

## Tracking

Goong is for basemap/route/address services.

Real-time location updates continue through VietRide's existing GPS/socket layer. The map renderer should consume the latest normalized `GeoPoint`.

Throttle or animate camera updates independently from socket message frequency.

## Definition of done

- Goong map style loads.
- Markers appear at expected real-world location.
- HCMC/Hanoi sanity test does not place markers in ocean/another country.
- Route line aligns with roads.
- Camera follow does not fight user gestures.
- No REST key is accidentally used as a Maptiles key or vice versa.
