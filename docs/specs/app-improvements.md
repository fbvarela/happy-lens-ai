# HappyLens AI: Product Ideas

Ideas for completing and extending the app without adding unnecessary complexity.

## Recommended Next

### 1. Shot Session Mode

Turn a coach recommendation into a small, actionable shooting session:

- Save the location, time, subject, active gear and recommended settings.
- Show a short checklist: arrive, position subject, check light, shoot.
- Mark shots as planned, taken or skipped.
- Keep the session available offline.

This gives the planner, coach and diagram a single useful workflow instead of
three separate tools.

### 2. Reliable Auto Exposure

Make the diagram's Auto mode behave like a real recommendation engine:

- Display the reason for each change: `clouds increased ISO`, `telephoto raised shutter`, or `subjects require f/5.6`.
- Keep Auto, but allow one-click reset after manual changes.
- Show warnings when the camera limit prevents a good exposure: ISO ceiling,
  shutter too slow, or insufficient depth of field.
- Add a simple exposure status: `safe`, `borderline`, or `needs support`.

### 3. Accurate Gear Profiles

Complete the optical data used by the calculator:

- Sensor format and circle of confusion per camera body.
- Physical focal length or focal range per lens.
- Minimum focus distance.
- Stabilisation and reliable handheld shutter limits.
- Optional manufacturer/reference URL.

Show the data source or mark values as approximate. This builds trust in the
DoF and exposure results.

### 4. Position Comparison

Let the photographer compare two or three camera positions before choosing one:

- Save a position on the diagram.
- Compare light direction, subject distance, DoF, visor coverage and settings.
- Highlight the best position with a short reason.

This makes dragging objects useful for decisions, not only visual exploration.

## High-Value Features

### 5. Weather Timeline in the Diagram

Use the existing hourly weather data to show a compact timeline for the selected
shooting window:

- Cloud cover, rain probability, wind and temperature.
- A visible change in shadow softness as cloud cover changes.
- A warning for rain, strong wind or rapidly changing conditions.
- Suggested backup times when the selected hour is poor.

### 6. Shot List Generator

Generate a practical shot list from subject, location and light:

- Wide establishing shot.
- Medium interaction shot.
- Close detail shot.
- Backlit/rim-light variation when appropriate.
- A safe fallback shot for bad weather.

Each item should open the coach with the same location, time and active gear.

### 7. Visual Focus Assistant

Make focus guidance more useful than a distance number:

- Show which subject is the focus target.
- Show the near and far focus limits.
- Warn when another subject falls outside the DoF.
- Suggest stopping down, moving back or changing focal length.
- Show the hyperfocal option for landscapes.

### 8. Gear Presets and Favorites

Support real-world gear preparation:

- Favorite lenses for each camera.
- A default lens per subject type.
- A lightweight travel kit containing only selected gear.
- Duplicate a custom camera to create a variation quickly.
- Import/export gear as JSON for backup.

### 9. Recipe Explanations

Make every recommendation teach something:

- Why this shutter speed was selected.
- Why the aperture changed.
- What would happen if ISO were lowered.
- Why the light is front, side or backlit.

Keep explanations short and expandable so the main interface stays compact.

## Creative Extensions

### 10. Learn From a Reference Photo

Allow a user to upload a photo and enter or estimate:

- Camera and lens.
- Focal length, aperture, shutter and ISO.
- Approximate subject distance.

Compare the reference setup with the current scene and explain the differences.
Do not pretend to infer exact EXIF or lighting when the data is unavailable.

### 11. Light Direction Memory

Save useful local observations:

- `This wall gets soft light after 18:00.`
- `Avoid this position when the wind comes from the west.`
- `Best reflections after rain.`

Display notes when the user returns to the same coordinates.

### 12. Route and Location Scout

For a planned photo trip, show several saved locations on a map with:

- Best light window.
- Weather fit.
- Walking order.
- Suggested subject and gear.
- Offline notes and cached map tiles.

### 13. Accessibility and Field Use

Improve usability outdoors and on phones:

- High-contrast field mode.
- Larger touch targets only when touch mode is enabled.
- Reduced-motion setting for the sun and diagram transitions.
- Voice-friendly labels for camera settings and distances.
- Clear offline and stale-weather indicators.

### 14. Shareable Shoot Brief

Create a compact, read-only link or printable brief containing:

- Location and map.
- Date and local time.
- Weather snapshot.
- Diagram and chosen position.
- Active camera, lens and settings.
- Shot list.

Useful for sharing a plan with a couple, assistant or second photographer.

## Selected Solutions And Plan

The following five ideas are the current product focus.

### Reliable Auto Exposure

**Solution**

Use one deterministic recommendation result for aperture, shutter and ISO.
It should combine sun altitude, cloud cover, light direction, subject motion,
focal length, focus distance and camera limits. Auto is the default; moving an
exposure slider switches to manual, and an Auto control restores the result.

**Plan**

1. Create a shared calculator that returns settings, limits and reason codes.
2. Select an aperture that covers the focused subjects' DoF where possible.
3. Select a shutter that respects motion and focal-length handholding limits.
4. Calculate ISO last and clamp it to the camera and recipe limits.
5. Show warnings when a good exposure is impossible within those limits.
6. Explain changes with short reasons such as `low light`, `cloud cover` or
   `telephoto`.

### Weather Timeline In The Diagram

**Solution**

Add an hourly strip tied to the diagram date and selected local hour. Reuse
Open-Meteo data already used by the app. Selecting an hour updates the sun,
cloud softness, weather note and Auto exposure together.

**Plan**

1. Fetch and cache hourly cloud cover, rain, wind and temperature.
2. Highlight the selected hour and allow changing time from the strip.
3. Soften shadows and adjust advice according to cloud cover.
4. Warn about rain, strong wind and stale or unavailable forecasts.
5. Suggest nearby better hours when the selected conditions are poor.

### Visual Focus Assistant

**Solution**

Make focus visible in the visor. The selected subject or custom distance drives
the near and far boundaries; the DoF region reaches the scene edge when the
far limit is infinite. The diagram should warn when another subject is outside
the focus region.

**Plan**

1. Store camera-specific CoC and lens-specific physical focal data.
2. Keep Subject 1, Subject 2 and custom distance as explicit focus choices.
3. Draw near, far and hyperfocal markers on the visor.
4. Compare every placed subject against the selected focus range.
5. Suggest stopping down, moving back or changing focal length when needed.

### Recipe Explanations

**Solution**

Return structured reason codes with every recommendation and render concise
localized explanations from those codes. Keep the main card short, with an
expandable section for the full calculation inputs.

**Plan**

1. Add reason codes for light, motion, focal length, DoF, weather and limits.
2. Add English and Spanish translations for each reason.
3. Show one primary reason beside each changed setting.
4. Explain trade-offs when ISO, shutter or aperture reaches a limit.
5. Keep explanations deterministic and available offline; use AI only as an
   optional enhancement.

### Accessibility And Field Use

**Solution**

Add an explicit field mode for bright outdoor use, without enlarging the normal
interface. It should improve contrast, motion behavior, touch targets and
screen-reader feedback across Coach, Diagram and Gear.

**Plan**

1. Add high-contrast colors and stronger borders.
2. Respect reduced-motion preferences for diagram transitions.
3. Ensure every slider exposes its current value and unit.
4. Add optional larger touch targets instead of enlarging all controls.
5. Label offline, stale-weather and unavailable-location states clearly.
6. Verify keyboard navigation, mobile widths and screen-reader output.

## Suggested Order

1. Finish accurate gear data and reliable Auto exposure.
2. Add position comparison and clearer DoF guidance.
3. Connect weather, coach and diagram into Shot Session Mode.
4. Add shot lists and shareable shoot briefs.
5. Explore reference-photo learning and location scouting after the core flow
   feels reliable.

## Product Principle

Every feature should answer one field question quickly:

> Where should I stand, what should I focus on, and what should I set before I
> press the shutter?

If a feature does not improve that decision, keep it out of the main shooting
flow.
