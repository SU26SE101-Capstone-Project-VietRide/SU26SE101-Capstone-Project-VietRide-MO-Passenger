---
name: goong-security
description: Handle Goong Maptiles/API keys, Expo environment variables, restrictions, and backend proxying safely.
---

# Goong Key & Security Rules

## Two key types

Goong documents:

- `Maptiles Key`: map view / map load
- `API Key`: REST APIs

Never swap them.

## Client exposure model

Anything shipped inside a native mobile bundle must be treated as observable by a determined user.

Therefore:

### Maptiles key

A map renderer needs the Maptiles key at runtime. Use a dedicated least-privilege project key and apply available restrictions/monitoring.

### REST API key

Preferred production architecture for VietRide:

```text
Mobile -> VietRide BE -> Goong REST API
```

Keep the REST API key on the server when practical.

This also centralizes:

- quotas
- logging
- retry policy
- caching
- provider switching

## Direct mobile REST mode

Direct calls can be acceptable for local development/prototype when intentionally chosen.

If a value is stored in `EXPO_PUBLIC_*`, DO NOT describe it as secret.

Document the tradeoff.

## Suggested env

Mobile:

```env
EXPO_PUBLIC_MAP_PROVIDER=goong
EXPO_PUBLIC_GOONG_MAPTILES_KEY=YOUR_MAPTILES_KEY
EXPO_PUBLIC_GOONG_REST_MODE=proxy
```

Optional direct local test:

```env
# Publicly embedded in the client build; not a secret.
EXPO_PUBLIC_GOONG_API_KEY=YOUR_API_KEY
```

Backend:

```env
GOONG_API_KEY=YOUR_SERVER_SIDE_GOONG_API_KEY
GOONG_API_BASE_URL=https://rsapi.goong.io/v2
```

## Never

- commit real keys
- log key-bearing full URLs
- include REST API key in crash breadcrumbs
- put server key in `EXPO_PUBLIC_*`
- reuse a powerful unrestricted key everywhere
- remove unrelated Google OAuth/Firebase keys during map migration

## Rotation

If a real key is discovered in Git history/chat/log output:

1. revoke/rotate it;
2. do not rely only on deleting the file;
3. add secret scanning/checks if available.

## Definition of done

- key types are correctly separated.
- production REST calls use the intended transport.
- no real key is committed.
- logs redact query params such as `api_key`.
