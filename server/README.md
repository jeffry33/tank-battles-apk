# TANK BATTLE multiplayer server

Early WebSocket multiplayer backend using Node.js and the server-owned `MatchState` module.

## Run

From the repository root:

```sh
cd server
npm install
npm start
```

Default port: 2567. Set `PORT` on the hosting platform if required.

## Client messages

- `{ "type":"join", "roomId":"room-01", "mode":"free-for-all", "displayName":"Player" }`
- `{ "type":"start-deployment" }`
- `{ "type":"land", "x":12, "z":-8 }`
- `{ "type":"move", "x":12.4, "z":-8, "yaw":20 }`
- `{ "type":"shoot", "shot":{"yaw":20,"elevation":35,"power":70,"weapon":"standard"} }`
- `{ "type":"turn-expired" }`
- `{ "type":"ping" }`

Server messages include `joined`, `state`, `shot-resolved`, `pong`, and `error`.

## Current server-side combat milestone

The server validates turn ownership, shot angle and power, simulates a ballistic arc under gravity in fixed time steps, checks a simplified tank hit radius and arena bounds, applies radial damage, marks eliminated tanks, and advances the turn. Tank movement is also checked against turn ownership, arena bounds, a per-update distance limit, and an 8-unit per-turn allowance.

## Known limitations — not production ready

- The projectile simulation uses a flat ground plane and simplified tank hitboxes; it does not collide with hills, bunkers, bridge geometry, or destructible terrain.
- The browser client still has a local prototype firing simulation in parallel with the server result; final multiplayer presentation needs to be consolidated around server events.
- Deployment landing UI/plane/parachute is not implemented; the server only accepts a submitted landing coordinate.
- There is no automatic server timer loop yet; a trusted server scheduler must skip expired turns.
- Disconnect/reconnect, authentication, room cleanup, matchmaking, anti-cheat hardening, persistence, monitoring, and public hosting are pending.
- This service has not yet been load-tested or security-reviewed. Do not treat it as a production game backend.
