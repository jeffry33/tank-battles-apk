# Android Early Playable QA

## Current build status

- Android debug APK is produced by the GitHub Actions workflow `Build TANK BATTLE Android APK`.
- The artifact is named `tank-battle-debug-apk`.
- A successful CI build confirms compilation only. It does not confirm installation, rendering, touch controls, thermal performance or a complete match on a physical phone.
- The current APK is a debug build and is not a signed release package.

## Install on Android

1. Open the repository's Actions page: https://github.com/jeffry33/tank-battles-apk/actions
2. Open the latest successful `Build TANK BATTLE Android APK` run on branch `feature/full-game-development`.
3. Download the `tank-battle-debug-apk` artifact and extract the ZIP.
4. Open the APK on the Android phone. If Android asks, allow installation from the browser or file manager used to open it.
5. Launch TANK BATTLE and start with the Balanced graphics profile.

## Important multiplayer requirement

The APK does not contain a hosted WebSocket game server. The lobby's default `ws://localhost:2567` address is only valid when a server is running on the same device (or when using a development setup that forwards that port). For a remote match, the server must be deployed to a host that supports persistent WebSocket connections and the address must use `wss://`.

The current AI opponents are created by the server after a human joins a room, presses READY and starts deployment. Therefore, do not interpret a successful APK build as proof that solo-vs-AI works offline.

## Physical-device checklist

- [ ] APK installs and launches without a crash.
- [ ] Arena renders and the camera follows the tank.
- [ ] Touch joystick moves the tank.
- [ ] Aim pad rotates the turret.
- [ ] Elevation and power controls update.
- [ ] Multiplayer server connection succeeds over mobile data and Wi-Fi.
- [ ] Human can ready up and toggle back to not-ready.
- [ ] Host can start a solo match with AI seats.
- [ ] Landing completes and the human turn starts.
- [ ] AI takes its turn and fires.
- [ ] Damage, elimination and match result are synchronized.
- [ ] No crash or severe slowdown over a full match.
- [ ] FPS, temperature and memory are recorded on the target device.

## Device target

Initial target: vivo iQOO Neo 10, 8 GB RAM. Use Balanced as the first test profile. The 60 FPS target is a design goal, not a measured result.
