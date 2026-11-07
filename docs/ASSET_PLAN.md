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


## Candidate shortlist researched for the realistic + mixed-budget direction

These are candidates, not approved/integrated files. Verify the exact download contents, current price, and license at purchase/download time.

### Tank hero model candidates

1. **Sketchfab — Centurions Tank by Avishkar Kadam**
   - Listing: https://sketchfab.com/3d-models/centurions-tank-e8c9856a6c384d7d9598ad29f39e5734
   - Listing states 120.1k triangles and 4K PBR maps; downloadable; CC BY.
   - Attribution is mandatory. Confirm the model's hierarchy and moving turret/barrel pivots before adopting it. 120k triangles and 4K maps require mobile LODs and texture downscaling.
2. **Polyfork — Medium Tank**
   - Listing: https://polyfork.dev/asset/medium-tank-65da6b
   - Free GLB is listed at 2,534 triangles; an HD edition is listed at 9,142 triangles / 48 materials, with animated turret, gun, hatch, sprockets and wheels. Commercial use is stated as allowed without attribution.
   - The low-poly presentation may not meet the desired realistic hero-asset bar; use only as a technical rig/pivot test unless visual inspection approves it.
3. **Fab — Game Ready Modern Main Battle Tank Military Vehicle 4K PBR**
   - Listing: https://www.fab.com/listings/327eab79-7c75-423e-a439-96eaa970d66b
   - Listing describes about 150k triangles, 4K PBR maps and GLB/FBX/OBJ/BLEND formats. Price and selected license need confirmation on the listing before purchase. Rig/pivot structure also needs inspection.

### Environment texture candidates

- **Snow 01** — https://polyhaven.com/a/snow_01 — CC0 PBR snow, downloadable in multiple resolutions.
- **Snow 02** — https://polyhaven.com/a/snow_02 — CC0 fresh powder snow.
- **Snow Floor** — https://polyhaven.com/a/snow_floor — CC0 compacted/dirtier snow.
- **Snow Field HDRI** — https://polyhaven.com/a/snow_field — CC0 winter lighting reference.
- **Pine Tree 01** — https://polyhaven.com/a/pine_tree_01 — CC0, but the listing's full source download is extremely large and high-poly; do not ship this raw version to Android. Find a reduced LOD or use it as a high-detail source for optimization.

### Additional environment / prop sources

- **WWII Tank Pack (MetaWorldOS)** — https://metaworldos.itch.io/wwii-tank-pack-glb-models — CC0, GLB, PBR, but the full ZIP is listed at 809 MB and the models are low-poly. Do not download the entire pack into the Android runtime; inspect individual files and only select what is useful.
- **Poly Haven license** — https://polyhaven.com/license — all listed assets CC0, including commercial use.
- **Quaternius license** — https://quaternius.com/license.html — commercial use and modification allowed; do not redistribute source assets standalone.

### Integration gate

Do not replace the player tank until a candidate passes:
- visible review of front/side/rear and texture quality;
- separate turret and barrel pivots or a rig that can be controlled by code;
- correct forward axis and real-world scale;
- a mobile LOD budget (target roughly 20k–60k triangles for the active tank LOD, subject to profiling);
- 1–2 material sets where practical, 1K–2K textures for mobile LOD, 4K reserved for optional high-end tier;
- clear license proof and attribution file if required.

A visually realistic static tank is not enough for this game: turret rotation, barrel elevation and preferably track animation must work independently. Do not purchase a candidate or claim integration without the user's explicit purchase approval and an actual file review.
