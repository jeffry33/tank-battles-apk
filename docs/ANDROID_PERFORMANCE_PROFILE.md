# Android Performance Profile — iQOO Neo 10 (8 GB RAM)

## Reference test device

- Device: vivo iQOO Neo 10, Indonesian 8 GB RAM / 256 GB storage variant.
- SoC: Qualcomm Snapdragon 8s Gen 4; GPU: Adreno 825.
- Display: 6.78-inch AMOLED, 1260 × 2800, up to 144 Hz.
- Battery: 7,000 mAh; vapor-chamber cooling.
- OS baseline reported for the Indonesian model: Funtouch OS 15 / Android 15.
- Official product listing: https://shop.vivo.com/id/product/2170
- Indonesia launch/specification context: https://www.antaranews.com/berita/4879413/iqoo-neo-10-jadi-kejutan-di-pasar-indonesia-dengan-snapdragon-8s-gen-4

This profile is a target, not a claim that the game has been benchmarked on this phone. Physical-device tests are still required.

## Performance goals

| Metric | Initial acceptance target | Notes |
|---|---:|---|
| Frame rate | 60 FPS target | 144 Hz display is not a promise of 144 FPS in this WebGL game. |
| Frame-time | 16.7 ms average budget | Watch spikes during explosions and deployment. |
| 1% low | >= 45 FPS | Measure in a repeatable 10-minute match. |
| Thermal stability | No sustained severe throttling | Repeat after the device warms up. |
| Memory | Avoid reloads / WebView termination | Keep asset memory bounded; 8 GB is shared with Android. |
| Network | Smooth at 4 players | Test Wi-Fi and mobile data separately. |

## Graphics presets

### High (default target for this device, only after profiling)
- 1080p-class internal rendering target; do not force native 1260 × 2800 rendering without a GPU test.
- 2x or 4x anisotropic filtering only if supported and measured.
- One main directional light with 1024 shadow map; limit shadow distance and avoid extra shadow-casting lights.
- PBR materials with compressed textures; use mipmaps and texture atlases.
- LODs for tanks, trees, rocks and distant props.
- Limit transparent particles, smoke overdraw and simultaneous debris.
- Keep post-processing minimal until measured.

### Balanced fallback
- 720p–900p-class internal rendering target.
- 512–1024 shadow map or disable dynamic shadows if frame-time spikes.
- Reduce particle count, shadow distance, vegetation density and far terrain detail.
- Keep tank silhouette, aiming readability and explosion feedback intact.

### Low fallback
- 720p-class internal rendering target.
- Disable dynamic shadows and expensive post effects.
- Simplify distant environment and reduce particle/debris counts.
- Preserve gameplay clarity and UI responsiveness.

Note: exact render-scale and graphics controls must be implemented against the PlayCanvas API version in package.json and validated on device before claiming they work.

## Required physical-device test plan

1. Install a signed debug APK on the iQOO Neo 10 (8 GB).
2. Test cold launch, lobby, deployment, 10-minute combat, explosions, destroyed props, and return to lobby.
3. Record average FPS, 1% low, frame-time spikes, peak memory, battery drain, and device temperature.
4. Repeat at 60 Hz and 144 Hz display settings; compare stability, not just peak FPS.
5. Repeat over Wi-Fi and mobile data with 2 and 4 clients.
6. Test background/foreground, screen lock/unlock, incoming call interruption, and reconnect behavior.
7. Run at least three consecutive matches to expose thermal and memory regressions.
8. Verify touch controls, aspect ratio, safe areas, text size, and all HUD controls at the device's actual display scaling.

## Current known limitations

- Current scene is procedural blockout geometry, not final production assets.
- Multiplayer server is a prototype; public hosting, reconnect handling, authentication, rate limiting and production anti-cheat are not complete.
- There is no verified APK build or physical-device benchmark yet.
- The project currently requests antialiasing at application creation and a 1024 directional shadow map; those values need measured validation rather than assumptions.

## Release gate

Do not label the build "optimized for iQOO Neo 10" until the APK has been installed and the above tests have been run on the actual 8 GB device. Initial goal is stable 60 FPS High/ Balanced switching, not a 144 FPS promise.
