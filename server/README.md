# TANK BATTLE multiplayer server

This is the first network transport milestone. It uses a WebSocket server and the existing MatchState rules module.

## Run locally

From the repository root:

```sh
cd server
npm install
npm start
```

The server listens on port 2567 by default. Set `PORT` in the hosting environment when needed.

## Initial JSON protocol

- `{ "type":"join", "roomId":"room-01", "mode":"free-for-all", "displayName":"Player" }`
- `{ "type":"start-deployment" }`
- `{ "type":"land", "x":12, "z":-8 }`
- `{ "type":"shoot", "shot":{"yaw":20,"elevation":35,"power":70,"weapon":"standard"} }`
- `{ "type":"turn-expired" }`
- `{ "type":"ping" }`

Server messages include `joined`, `state`, `shot`, `pong`, and `error`.

## Important limitations

This is an early network transport milestone, not a production multiplayer service. Shot parameters are validated and broadcast, but authoritative projectile simulation, collision, damage, reconnect handling, authentication, matchmaking, rate limiting, persistence, and deployment are still pending. The landing check currently validates simple bounds only; it does not inspect the actual terrain, river, or bridge. The current client prototype is not yet connected to this server. Do not expose this server publicly as a finished game backend.
