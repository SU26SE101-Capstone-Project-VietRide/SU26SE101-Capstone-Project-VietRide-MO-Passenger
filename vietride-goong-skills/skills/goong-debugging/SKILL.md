---
name: goong-debugging
description: Diagnose Goong map, place, routing, key, quota, and coordinate bugs in VietRide.
---

# Goong Debugging

## Debug in this order

### 1. Confirm which layer is failing

Classify:

- map tiles/render
- GPS/location permission
- autocomplete
- place detail
- geocode
- directions
- distance matrix
- route geometry decode
- live socket updates
- camera

Do not label every map-screen issue "Goong API error".

### 2. Validate key type

Map blank:
- check Maptiles key and style URL.

REST 401/403-like failure:
- check REST API key, restrictions, endpoint, environment.

Do not test by exposing production key in logs.

### 3. Validate coordinates

Sanity rules for Vietnam:

```text
latitude  ~ 8..24
longitude ~ 102..110
```

These ranges are debugging hints only, not business validation.

If a point appears far away, inspect order first.

Goong REST:

```text
lat,lng
```

GeoJSON / MapLibre:

```text
[lng,lat]
```

### 4. Inspect stale autocomplete

Symptoms:
- old query results reappear
- selected address changes unexpectedly

Fix:
- AbortController when supported, or
- monotonically increasing request ID and ignore stale responses.

### 5. Inspect route decode

Check:

- `overview_polyline.points` exists
- decoder returns `[lat,lng]` or another known shape
- adapter converts it to `GeoPoint`
- renderer converts it to `[lng,lat]`

Do not apply coordinate swap twice.

### 6. Inspect request frequency

Autocomplete:
- debounce
- min characters

Directions/matrix:
- not bound directly to each GPS packet

### 7. Network

Differentiate:

- no connection
- timeout
- provider 4xx
- provider 5xx
- malformed response
- no result

Expose a user-safe error; keep diagnostic detail in controlled logs.

## Bug report template

```text
Feature:
Environment:
Renderer:
Goong endpoint:
Input point(s):
Input order:
Expected:
Actual:
HTTP status:
Provider status:
Raw response saved safely?:
Keys redacted?:
Repro steps:
```

## Definition of done

Root cause is identified at a specific layer, not guessed from the visible symptom.
