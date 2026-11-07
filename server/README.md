# TANK BATTLE — Multiplayer server foundation

This folder contains the first server-side match rules module. It is not yet a deployed online service.

## Match rules implemented
- Up to four players.
- Free-for-all and 2v2 team assignment.
- Deployment/landing phase state.
- Sixty-second turn deadline.
- Server-side validation of whose turn it is and shot parameters.
- Server-side HP/damage resolution and winner detection.

## Important
This is only the deterministic match-state layer. It does not yet include a WebSocket/Colyseus room, authentication, matchmaking, persistence, rate limiting, anti-cheat, or a deployed server. Do not expose this module directly to the public internet without adding those layers.

## Planned integration
1. Wrap MatchState in a Colyseus Room.
2. Broadcast snapshots and validated shot events to clients.
3. Run projectile simulation and collision resolution on the server.
4. Persist player progression and match results.
5. Deploy to a managed Node.js host with monitoring and backups.
