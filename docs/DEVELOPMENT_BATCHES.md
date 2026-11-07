# TANK BATTLE — Development batches

This file tracks code changes separately from features that still require end-to-end or physical-device validation.

## Batch 1 — Core rules and arena validation

**Implemented in source**
- Centralized landing terrain validation in `MatchState`; removed the duplicate WebSocket check that incorrectly rejected the bridge at the center of the map.
- Added tests for bridge landing, invalid coordinates, deployment timeout fallback and the four-player room cap.
- Updated the README to describe the actual prototype rather than the original empty foundation.

**Still needs validation**
- Run the latest CI test suite after the reconnect test expectation fix.
- Validate full match flow with two to four real clients.

## Batch 2 — Multiplayer session recovery

**Implemented in source**
- Server tracks whether a player is connected and when the disconnect occurred.
- Server issues a random reconnect token and accepts it only for the original room/player.
- Client persists the token locally and sends it when rejoining the same room.
- Reconnecting replaces the old socket while preserving the player identity and match state.

**Still needs implementation / validation**
- Automated WebSocket integration test for disconnect/reconnect.
- Reconnect grace period and explicit forfeit policy.
- Host migration, room cleanup, matchmaking, authentication, rate limiting and production anti-cheat.
- Public `wss://` hosting is not configured.

## Batch 3 — Destructible arena synchronization

**Implemented in source**
- Frozen River bunker bodies, sandbag walls, bridge rails and supply crates now carry stable IDs shared with the server registry.
- Client maps authoritative object health updates by ID rather than guessing the nearest similarly named mesh.
- Online explosion visuals no longer apply a second local damage pass.

**Still needs implementation / validation**
- Mesh-accurate collision, full terrain deformation, persistent wreckage and robust debris.
- Visual verification that every prop ID maps to the intended scene mesh.

## Batch 4 — Deployment flow and map presentation

**Implemented in source**
- Added a procedural transport-aircraft flyover during deployment.
- Added a visible landing target marker that follows the player's steering input.
- Prevented server state broadcasts from resetting the local landing target during descent.
- Landing control disables after the player lands; the marker and aircraft are removed when deployment ends.
- Added linear alpine fog for atmospheric depth.

**Still needs implementation / validation**
- Final cargo aircraft and animated parachute assets, proper descent physics, camera sequence, landing animation and audio.
- Verify all deployment positions against the final terrain/navmesh.

## Batch 5 — Android performance and build pipeline

**Implemented in source**
- Graphics profile changes now reapply automatic canvas resolution and resize the canvas.
- Added atmospheric fog and retained High / Balanced / Low profiles with FPS display.
- Added CI concurrency groups to cancel stale runs from the same branch/workflow.

**Still needs implementation / validation**
- Measure FPS, 1% lows, temperature, memory and battery on the actual iQOO Neo 10.
- Verify orientation, touch layout, pause/resume, app lifecycle and network switching.
- Signed release APK, versioning and release notes.

## Batch 7 — First integrated winter surface assets

**Implemented in source**
- Added three original lightweight SVG surface maps: tiled snow albedo, snow normal-style map and frozen-ice albedo.
- Wired asynchronous texture loading into the Frozen River snow and ice materials, with repeat addressing and material refresh after load.
- Kept procedural color materials as fallbacks if a texture fails to load.
- Recorded the original assets and their runtime paths in `ASSET_CREDITS.md`.

**Still needs implementation / validation**
- Confirm SVG texture support and visual quality in the Android WebView build.
- Replace these first-pass authored textures with verified free CC0 scanned PBR materials when binary asset download and inspection are completed.
- Integrate a production tank GLB and modular environment models; no external 3D model has been integrated yet.

## Batch 8 — Authoritative special-weapon behavior

**Implemented in source**
- Guided missiles now select the nearest living enemy that is valid under the match's friendly-fire rules and steer toward that target on the server.
- Cluster bombs now resolve a central blast plus four offset submunition blasts; damage is aggregated per target and object before the turn advances.
- Shot result metadata reports whether guidance was active, how many submunitions were resolved, and their authoritative impact coordinates.
- The client renders the central cluster blast plus the four server-reported submunition impacts.
- The online guided-missile visual now travels to the server-reported impact point instead of showing an unrelated straight ballistic arc.
- Added server tests for guided target acquisition and cluster submunition count.

**Still needs implementation / validation**
- Server test suite and Android debug APK build passed on commit `8ad988e` (GitHub Actions).
- Tune homing turn rate, lock-on range, cluster spread and damage with actual multiplayer playtests.
- Add distinct missile/cluster VFX, audio, collision refinement and balance safeguards.

## Production art and remaining game systems

- No production-grade external tank or environment asset is confirmed integrated. The free-only asset policy remains in force.
- Source and license-check optimized free tank GLB, snow/ice PBR maps, HDRI, vegetation, military props, VFX and audio.
- Complete lobby, matchmaking, invite flow, scoreboard, match results, settings, tutorial and accessibility.
- Add accounts/profile, XP, statistics, leaderboard, skins and inventory persistence.
- Complete gameplay balance and testing for all weapons, damage, collision, elimination and FFA / 2v2 edge cases.

## Validation rule

A source-code change is not considered complete until the relevant CI checks pass. Android readiness additionally requires a successful APK build and installation/play test on the target phone. Production readiness requires the missing art, server hosting, lifecycle, security and release work above.

## Batch 9 — WebSocket input protection

**Implemented in source**
- Added a rolling-window per-connection message limiter (50 messages per 10 seconds).
- Set a 16 KiB maximum WebSocket payload to reduce oversized-message abuse.
- Added deterministic unit tests for rate-limit boundaries and invalid configuration.

**Still needs implementation / validation**
- Exercise the limits with real concurrent clients and tune them against normal mobile network behavior.
- Add authentication, reconnect expiry/forfeit policy, room lifecycle cleanup and production hosting protections.
