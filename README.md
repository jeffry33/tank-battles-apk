# TANK BATTLE — Android / Web prototype

TANK BATTLE is an in-development, turn-based 3D tank artillery game. This repository contains a playable-development prototype, not a finished commercial game.

## Implemented prototype features

- PlayCanvas 3D scene, lighting, touch movement and turret aiming controls.
- Procedural Frozen River arena blockout with a river, bridge, bunkers, props and deployment markers.
- Artillery aiming controls and local projectile / impact visual prototype.
- WebSocket room server with up to four human/AI seats and Free For All / Team Battle modes.
- Server-controlled baseline AI opponents that fill vacant seats when the host starts a match; AI uses the authoritative shot resolver.
- Match combat statistics and local XP/level progression stored in WebView local storage.
- Server-owned deployment phase, turn clock, movement allowance, shot validation, projectile resolution, player damage and elimination.
- Server-side arena prop registry, simplified projectile/prop collision and destructible-object health synchronization.
- Android packaging workflow in GitHub Actions that produces a **debug APK**.

## Known limitations — not production complete

- Tank and environment geometry are still mostly procedural blockout, not final realistic production assets.
- The arena is a prototype approximation; it does not yet have full terrain elevation, mesh-accurate collision or real terrain deformation.
- Projectile collision is simplified server-side geometry, not full mesh / terrain physics. Weapon behavior and balance still need validation.
- Destructible objects use simplified hit volumes and visual proxies; stable per-object visual mapping and debris need further work.
- Multiplayer is still a prototype WebSocket room server and has no public hosting, matchmaking, authentication, cross-device accounts, or production anti-cheat.
- Reconnect tokens, a 90-second disconnect grace/forfeit policy, empty-room cleanup, 16 KiB message cap and per-connection message rate limiting are implemented, but need real multi-device testing.
- AI is currently a baseline artillery opponent: it selects the nearest valid enemy and fires a standard shell. AI movement, pickups, special-weapon decisions and difficulty settings are not implemented.
- XP and profile data are local to the device/browser. There is no server-side account or cloud persistence yet.
- Deployment is not yet the complete cargo-plane / steerable parachute sequence.
- The arena includes original first-pass SVG snow/ice surface maps, but no third-party production tank GLB, scanned photorealistic PBR set, full audio suite or final production art has been integrated.
- Graphics profiles are implementation targets, not measured benchmarks. The target iQOO Neo 10 has not yet been physically tested.
- A debug APK has been produced by CI previously, but it is not a signed release and has not been verified as a complete match on the target phone.

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Run the multiplayer server in a separate terminal:

```bash
cd server
npm install
npm test
npm start
```

The default HTTP/WebSocket port is `2567`. The server exposes `GET /health` for basic host health checks. The in-game default address `ws://localhost:2567` is suitable only when the game and server run on the same device. For online play, deploy the server and configure a reachable `wss://` endpoint.

## Build Android debug APK

The GitHub Actions workflow **Build TANK BATTLE Android APK** runs on pushes to development branches, pull requests to main, or manual dispatch. It builds the web bundle, adds/syncs Capacitor Android, runs Gradle `assembleDebug`, and uploads the artifact `tank-battle-debug-apk`.

The artifact is a debug APK for testing, not a signed Play Store release. Install and test it on a physical Android device before treating a build as playable.

## Development priorities

1. Harden the server-authoritative core rules and WebSocket lifecycle.
2. Complete four-player online match flow and deployment.
3. Replace procedural placeholders with optimized, commercially usable free assets.
4. Improve the Frozen River arena, collision, effects and audio.
5. Complete lobby, HUD, results, progression and settings.
6. Add server-hosting/authentication and cloud profile persistence.
7. Profile and test on the target Android device, then produce a signed release build.

All third-party assets must be checked for their exact license and recorded in `ASSET_CREDITS.md`. The project currently follows a free-assets-only policy.
