---
name: goong-distance-matrix
description: Use Goong Distance Matrix V2 for multi-point distance/ETA calculations.
---

# Goong Distance Matrix

## Endpoint

```text
GET https://rsapi.goong.io/v2/distancematrix
```

Format:

```text
origins=lat,lng
destinations=lat,lng|lat,lng|...
vehicle=...
api_key=...
```

## Use it for

- compare ETA from one point to several destinations
- batch distance checks
- rank candidate stops/vehicles by travel distance or time
- operational estimates

## Do not use it for

- drawing a route line
- turn-by-turn geometry
- continuously querying every live GPS packet

Use Directions for route geometry.

## Coordinate construction

Build each point with `toGoongLatLng`.

Build multiple points with a dedicated join helper; never concatenate raw tuples from UI state.

## Parse each matrix element

Each element can have its own status.

Normalize per cell:

```ts
type MatrixCell =
  | { ok: true; distanceMeters: number; durationSeconds: number }
  | { ok: false; reason: string };
```

Do not assume the entire matrix succeeds because HTTP status is 200.

## Batching

Before sending large batches:

- check current Goong quota/endpoint limits;
- chunk intentionally;
- preserve source/destination indexes;
- cap concurrency.

Do not guess a maximum batch size in code without a documented source.

## Definition of done

- destination order is preserved.
- individual failures do not corrupt adjacent results.
- distances/durations are numeric internally.
- high-frequency tracking does not cause matrix request storms.
