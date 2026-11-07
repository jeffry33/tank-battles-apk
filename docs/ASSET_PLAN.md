# TANK BATTLE — Production Asset Plan

This document defines the asset targets for the Frozen River vertical slice. It is a sourcing plan, not a claim that these production assets have already been downloaded or integrated.

## Visual direction

Target: grounded, realistic military hardware in a stylized-realistic alpine winter environment. Keep the same art direction across tanks, terrain, props, VFX, UI, and audio. Prioritize readable silhouettes and stable Android frame time over raw polygon count.

## Asset inventory and requirements

| Priority | Asset group | Required production assets | Preferred format | Notes |
|---|---|---|---|---|
| P0 | Player tank | One detailed tank body, turret, cannon, tracks/wheels, hatches, optics; separate moving turret/barrel parts | GLB | One shared gameplay model; cosmetics later. Rig/pivots must support turret yaw, barrel elevation, track animation. |
| P0 | Winter ground | Snow albedo/normal/roughness/AO, packed snow, ice, slush, exposed rock | PBR textures | Use tiled materials and decals; avoid one huge 8K texture. |
| P0 | Alpine environment | Modular mountain/rock meshes, snow caps, cliffs and distant background | GLB | LODs and simplified collision meshes required. |
| P0 | Frozen river | Ice sheets, broken ice edges, shallow water/river surface, shoreline meshes | GLB + PBR | Keep gameplay collision separate from visual mesh. |
| P1 | Vegetation | Pine trees in at least 3 silhouettes, shrubs, dead branches | GLB | LODs, instancing, limited alpha overdraw. |
| P1 | Military props | Bunker modules, sandbags, crates, bridge pieces, barriers, radar mast | GLB | Stable object IDs and simple collision proxies; destructible props need server registry. |
| P1 | VFX | Muzzle flash, projectile trail, explosion, snow burst, smoke, debris, ice fragments | Sprite sheets / particles / GLB | Lightweight mobile VFX; avoid excessive transparent layers. |
| P1 | Audio | Engine idle/move, tracks, turret, cannon variants, impacts, explosions, UI, ambience, wind | OGG / WAV source | Loop points and volume mix; verify redistribution rights. |
| P2 | UI art | Icons, reticles, team emblems, tank skins, loading screen | SVG / PNG / WebP | Maintain legibility on phone screens. |
| P2 | Deployment | Cargo aircraft, parachute, landing marker, descent animation | GLB + animation | Aircraft may be a cinematic background asset, not a high-detail gameplay object. |

## Approved starting sources (license must be checked per downloaded item)

- **Poly Haven** — preferred for realistic PBR textures, HDRIs and selected environment props. Its asset library is CC0; commercial use and modification are allowed without attribution. Source: https://polyhaven.com/license
- **Quaternius** — useful for rapid prototypes and modular props. The current Quaternius Asset License allows commercial projects and modification, but prohibits redistributing the asset itself as a standalone asset. Check the license and pack page for each download. Source: https://quaternius.com/license.html
- **Kenney** — useful for UI prototypes, simple props and placeholder audio/visual assets. Kenney states that assets on its asset pages are CC0 and may be used commercially; check the included license for each pack. Source: https://kenney.nl/support
- **Sketchfab** — use only after checking the individual model's license. Do not use Editorial-only assets in the game or assume that every downloadable model permits commercial use. Source: https://sketchfab.com/licenses

## PlayCanvas delivery format and optimization

- Runtime model target: **GLB/glTF**. PlayCanvas documents GLB as the recommended compact model format and supports animations and PBR materials.
- Compress textures for mobile GPU memory. Prefer Basis/KTX2 where the pipeline supports it; use Android-supported GPU texture formats such as ETC/ETC2 or ASTC according to device support.
- Create LOD0/LOD1/LOD2 for the tank and major environment props; use low-detail collision proxies.
- Use texture atlases/material sharing for repeated props, instancing for vegetation, and cull distant detail.
- Avoid assuming an Android phone with 6–8 GB RAM can run desktop-level assets. Establish a visual baseline on the actual target device and profile GPU time, memory, draw calls and frame rate.

References:
- PlayCanvas supported formats: https://developer.playcanvas.com/user-manual/assets/supported-formats/
- PlayCanvas texture compression: https://developer.playcanvas.com/user-manual/optimization/texture-compression/

## Asset acceptance checklist

Before adding any downloaded asset to the repository:
1. Record source URL, creator, asset name, download date and exact license in `ASSET_CREDITS.md`.
2. Confirm commercial use, modification, redistribution inside a compiled game, and attribution requirements.
3. Confirm GLB import, PBR material integrity, scale/origin, pivots, animations and collision proxy.
4. Check polygon count, texture dimensions, number of materials and mobile memory cost.
5. Test in the PlayCanvas scene on an Android device before replacing the procedural placeholder.
6. Do not commit large unoptimized source packs or Blender working files to the runtime bundle.

## First replacement batch

1. Replace the procedural tank with one modular GLB tank model.
2. Replace the flat snow/ice materials with a small set of tiling PBR materials and a winter HDRI.
3. Replace pine and boulder primitives with instanced, LOD-capable GLB assets.
4. Replace the bridge/bunker primitives with modular GLB props while preserving stable network IDs.
5. Add mobile-sized audio and VFX packs only after the visual baseline is stable.

## Current state

No external production asset is confirmed integrated yet. Existing visuals remain procedural placeholders in `src/main.js`, `src/frozen-river.js`, and `src/destructible-world.js`.
