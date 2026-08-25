# Goong PR review checklist

- [ ] Change is scoped to the requested map concern.
- [ ] No unrelated business-flow rewrite.
- [ ] No new direct Google Maps Platform dependency.
- [ ] Goong V2 used for new REST integration.
- [ ] REST URLs are centralized.
- [ ] Provider responses are normalized.
- [ ] No unnamed coordinate tuples cross domain boundaries.
- [ ] Goong REST uses `lat,lng`.
- [ ] GeoJSON/MapLibre uses `[lng,lat]`.
- [ ] Autocomplete is debounced and stale-safe.
- [ ] REST call volume is reasonable.
- [ ] Live GPS updates do not trigger route/matrix request storms.
- [ ] Loading/error/empty states exist.
- [ ] Keys are redacted and not committed.
- [ ] Maptiles vs REST key distinction is respected.
- [ ] Tests cover coordinate conversion.
- [ ] Real-device/dev-client map smoke test completed.
