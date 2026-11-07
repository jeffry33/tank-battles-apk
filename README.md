# TANK BATTLE — Android/Web foundation

This is the first source-code foundation, not the completed game or a finished APK.

## Current contents
- PlayCanvas 3D scene and lighting
- Temporary tank blockout with hull, tracks, turret and cannon
- Basic touch joystick and turret drag control
- Temporary battlefield, river bed, bridge and snow-ridge blockout
- Vite build setup
- Capacitor Android wrapper configuration

## Important limitations
- This is a visual/controls foundation only.
- The tank and environment are primitive blockout geometry, not professional final assets.
- No projectile physics, damage, terrain deformation, deployment sequence, lobby, multiplayer server, account system, progression or monetization yet.
- No APK has been built or device-tested.
- High-end visual quality requires properly licensed optimized GLB assets, PBR textures, environment work and extensive performance testing.

## Development
Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Production web build:

```bash
npm run build
```

Android wrapper (requires Android SDK/JDK in a build environment):

```bash
npx cap add android
npx cap sync android
npx cap open android
```

The Android build should be produced in a cloud/CI environment because the intended developer workflow is phone-only.

## Next milestones
1. Replace blockout tank with a licensed animated GLB tank.
2. Build the Frozen River terrain and environment.
3. Implement proper tank movement, aiming, projectile physics and damage.
4. Add authoritative online multiplayer and four-player turn manager.
5. Add deployment, lobby, progression and final Android packaging.

## Build an APK in GitHub Actions
1. Upload this project to a new GitHub repository.
2. Open the repository's Actions tab.
3. Select `Build TANK BATTLE Android APK`.
4. Choose `Run workflow`.
5. When the workflow finishes, download the `tank-battle-debug-apk` artifact.
6. Extract the ZIP and install `app-debug.apk` on an Android test device.

This workflow produces a debug APK for testing, not a signed Play Store release.
