# Fix: GPS / "my location" in the installed Android app

## Diagnosis

**Root cause 1 (confirmed): the installed app keeps running old code.**
- `vite.config.ts` sets `registerType: "prompt"`. The published `/sw.js` has no `skipWaiting`/`clientsClaim`. It only activates a new version when it receives a `SKIP_WAITING` message.
- `src/lib/register-sw.ts` passes `onNeedRefresh: () => {}`, so that message is never sent. Each new version installs and then stays **waiting**. The old worker keeps serving the old precached JS until every window of the site is closed.
- Android keeps the standalone app alive in the background, so the waiting version almost never takes over. A browser tab closes more easily, which is why the browser shows the new code.
- Reinstalling does not help. The service worker belongs to the website (origin), not to the home-screen icon, and Chrome keeps it.
- `networkTimeoutSeconds: 1` for page loads makes this worse. On a slow mobile connection, cached old HTML is served after 1 second, and that HTML loads the old JS bundle.
- This explains why the 5s+5s+12s timeout change made no difference: the installed app never ran it.

**Root cause 2 (code, smaller): GPS is requested twice at the same time.**
- `handleRegionChange("location")` calls `requestGps()`, and the `useEffect` on `activeRegion` calls it again (lines ~925 and ~935). Each call has its own 12s timer. If the first call fails or times out after the second one succeeds, it shows an error over a valid position. The spinner can also flicker.

**About "Europe/Berlin":** this text is not hard-coded. It is the `meta.timezone` that Aladhan returns for the coordinates sent. That value is correct for a German location. So "Europe/Berlin" alone does not prove a wrong location. It only means coordinates (or a cached old state) inside Germany. `activeRegion` is saved correctly as `"location"` (it is stored in `localStorage` and restored on start). Saved region state is not the cause.

**Observability:** today, errors in the installed app cannot be seen. There is no version marker and no error code is shown.

## Minimal fix

1. `vite.config.ts`: switch to `registerType: "autoUpdate"`, add `workbox.skipWaiting: true` and `clientsClaim: true`, and raise the page `networkTimeoutSeconds` from 1 to 4. A new deploy then takes over the installed app on its next launch or reload.
2. `src/lib/register-sw.ts`: keep the existing guards. Use `registerSW({ immediate: true })` and call `registration.update()` when the app becomes visible (`visibilitychange`). That way an app kept in the background still picks up new versions. No forced reload loop.
3. `src/routes/index.tsx` (prayer card only):
   - Remove the duplicate `requestGps()` call in `handleRegionChange`, so the effect is the only automatic trigger.
   - Use a request id (ref): results, errors and timeouts from an older request are ignored.
   - Show the geolocation error code (1 = permission, 2 = unavailable, 3 = timeout) as a small hint, plus `pos.coords.accuracy` in metres after success.
4. Add a tiny build version marker (build timestamp via `define`) in the prayer settings panel. It shows which code the installed app is actually running.

No changes to the install bar, other sections, or saved user data.

## Test plan
- After publishing, open the installed app and check the version marker in prayer settings. It must match the new build after one relaunch, without reinstalling.
- Choose "موقعي / Standort": exactly one request starts, and the spinner ends within 12s.
- Permission denied: shows code 1. GPS off: code 2 or 3. Success: shows the place name and accuracy.
- Repeat in a browser tab to confirm both behave the same.
