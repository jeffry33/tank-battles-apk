# TANK BATTLE multiplayer server deployment

The Android game does not host the multiplayer server. A public server must be deployed separately before players on different networks can join the same room.

## Container build

The repository includes Dockerfile.server. Build it from the repository root:

```sh
docker build -f Dockerfile.server -t tank-battle-server .
docker run --rm -p 2567:2567 -e PORT=2567 tank-battle-server
```

The process listens on the configured PORT (default 2567) and accepts WebSocket connections. For public internet play, deploy this container to a host that supports persistent WebSocket connections and configure TLS at the hosting edge.

## Configure the Android client

1. Deploy the container and obtain the public hostname.
2. Ensure the hosting provider forwards WebSocket traffic to the container port.
3. Use a secure WebSocket URL such as wss://your-game-server.example in the in-game Server URL field.
4. Create a unique room ID and connect the clients.
5. For solo play, mark READY and press START; the server fills vacant seats with AI opponents.

## Important limitations before public launch

- This is a prototype in-memory room server. Restarting the process clears active matches.
- No authentication, matchmaking, database persistence, account system, moderation or production anti-cheat exists.
- Configure provider-level connection limits, TLS, monitoring, backups and abuse protection before exposing it publicly.
- The server exposes GET /health for provider health checks. Also verify WebSocket upgrades and run a real two-device test.
- Do not expose secrets in the Android app. Server-side secrets must be configured in the hosting provider's environment settings.
