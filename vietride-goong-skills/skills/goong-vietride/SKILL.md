---
name: goong-vietride
description: Router skill for any VietRide task involving maps, places, geocoding, route drawing, distance/ETA, address search, tracking maps, or migration from Google Maps to Goong.
---

# Goong VietRide — Router Skill

## Trigger

Use this skill when a task mentions any of:

- Goong
- Google Maps migration
- map / marker / camera
- address picker
- autocomplete / places / place detail
- geocode / reverse geocode
- directions / route / polyline
- distance / ETA / matrix
- shuttle map
- ticket tracking
- parcel tracking
- current location display

## First action

Inspect only the affected feature and its imports/config. Do not rewrite the whole map stack without evidence.

## Route to sub-skills

| Task | Read |
|---|---|
| Google -> Goong migration | `../goong-migration/SKILL.md` |
| Render map / marker / camera / GeoJSON | `../goong-map-rendering/SKILL.md` |
| Search address / Autocomplete / Detail / Geocode | `../goong-places/SKILL.md` |
| Route / Directions / route line | `../goong-routing/SKILL.md` |
| ETA or distance for many points | `../goong-distance-matrix/SKILL.md` |
| Keys / env / backend proxy | `../goong-security/SKILL.md` |
| Blank map / weird route / API failure | `../goong-debugging/SKILL.md` |

Read more than one only when the task truly spans those concerns.

## Non-negotiable contracts

### Provider boundary

UI code MUST NOT call `rsapi.goong.io` directly.

Prefer:

```text
screen -> hook/use-case -> map provider service -> transport
```

Create or extend a provider adapter in a dedicated map service area.

### Coordinate boundary

Domain:

```ts
{ latitude, longitude }
```

Goong REST:

```text
latitude,longitude
```

GeoJSON / MapLibre:

```ts
[longitude, latitude]
```

Never infer order from an unnamed `number[]`.

### API version

Use Goong REST API V2 for new integration unless an existing backend contract explicitly requires V1.

### Existing VietRide behavior

Do not change:

- booking semantics
- parcel semantics
- shuttle selection semantics
- Socket.IO tracking protocol
- GPS update protocol
- API response contracts unrelated to maps

Map provider migration is an infrastructure change, not a business-flow rewrite.

## Definition of done

- No new Google Maps/Places/Directions usage.
- No raw coordinate tuple leaks into domain logic.
- Error/loading/empty states exist.
- Map and address behavior tested on real Vietnamese locations.
- No real key committed.
- Relevant checklist passes.
