---
name: goong-places
description: Implement Vietnamese address search with Goong Autocomplete V2, Place Detail V2, and Geocode V2.
---

# Goong Places

## Official V2 endpoints

```text
GET https://rsapi.goong.io/v2/place/autocomplete
GET https://rsapi.goong.io/v2/place/detail
GET https://rsapi.goong.io/v2/geocode
```

## Search flow

Use:

```text
user types
 -> debounce
 -> Autocomplete V2
 -> user selects suggestion
 -> Place Detail V2
 -> normalize location
 -> update domain state
```

Do not treat autocomplete suggestion text as final coordinates.

## Autocomplete rules

Minimum default:

- trim input
- do not call under 3 useful characters unless UX specifically requires it
- debounce around 300–500 ms
- abort/ignore stale requests
- do not show stale results after input changes
- use `location` or `origin` when a feature has a meaningful current/reference point
- set a modest result limit

Goong notes that Autocomplete calls are billable, so request frequency must be intentionally optimized.

Useful V2 fields include:

```text
input
location
origin
limit
radius
more_compound
has_deprecated_administrative_unit
```

## Place detail

Endpoint:

```text
GET /v2/place/detail?place_id=...&api_key=...
```

Normalize:

```ts
result.geometry.location.lat -> latitude
result.geometry.location.lng -> longitude
result.formatted_address -> formattedAddress
```

## Geocode

Use V2 geocode for:

- forward geocode: address -> coordinate
- reverse geocode: coordinate -> address

Do not use geocode on every keystroke. Autocomplete is the search primitive.

## Vietnam administrative units

Goong V2 is designed around updated administrative data.

Default new code should display current administrative data.

Use:

```text
has_deprecated_administrative_unit=true
```

only when the product needs old administrative names for compatibility/reference.

Do not make old district names the canonical location identity.

## Data persistence

Prefer storing:

```ts
{
  latitude,
  longitude,
  formattedAddress,
  provider: 'goong',
  placeId // optional, if useful
}
```

Do not store only a display string if coordinates matter to routing/tracking.

## UX error cases

Handle separately:

- no suggestions
- network offline
- request timeout
- invalid/expired key
- quota/rate issue
- place detail missing coordinate
- user cleared text
- stale response

## Definition of done

- Vietnamese diacritics work.
- Search works for street, landmark, and common place name.
- Selected suggestion resolves to a coordinate.
- Old autocomplete response cannot overwrite a newer query.
- API call count is controlled.
