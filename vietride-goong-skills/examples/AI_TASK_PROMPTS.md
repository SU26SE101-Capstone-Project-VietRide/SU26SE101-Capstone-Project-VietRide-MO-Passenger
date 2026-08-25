# Prompt examples for your coding agent

## Migrate one feature

```text
Read skills/goong-vietride/SKILL.md and the migration + places subskills.
Migrate only the Shuttle address search from Google Places to Goong V2.
Preserve UI/UX and existing business behavior.
Do not remove unrelated Google Sign-In/Firebase config.
Before editing, inventory current imports and explain the affected provider boundary.
After editing, run the Google-to-Goong checklist items relevant to this feature.
```

## Fix coordinate bug

```text
Read skills/goong-vietride/SKILL.md and goong-debugging.
The route/marker appears in the wrong location.
Trace coordinate shape from API response -> domain -> GeoJSON/map renderer.
Do not patch by blindly swapping values at the screen.
Fix the boundary conversion and add a unit test.
```

## Implement Goong address picker

```text
Read skills/goong-vietride/SKILL.md and goong-places.
Implement Goong Autocomplete V2 + Place Detail V2 using the existing service architecture.
Use min 3 characters, 350 ms debounce, stale-request protection, typed normalized results,
and keep raw Goong JSON out of UI components.
```

## Route drawing

```text
Read skills/goong-vietride/SKILL.md, goong-routing and goong-map-rendering.
Use Goong Directions V2 to obtain route/distance/duration.
Normalize route points to GeoPoint[].
Only convert to [longitude, latitude] inside the GeoJSON renderer boundary.
Do not call Directions on each live GPS update.
```
