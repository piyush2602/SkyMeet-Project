# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository state
- The repo now contains:
  - `README.md` and `WARP.md` at the root.
  - `server/`: Node.js backend using Express + Socket.IO for signaling and static file serving.
  - `client/`: static HTML/CSS/JS front-end implementing a Zoom-like meeting UI and WebRTC logic.
- Backend configuration lives in `server/package.json`.
- There is **no dedicated test or lint setup yet**; no scripts beyond `start`/`dev` are defined.

## Common commands
All commands assume your working directory is the repo root.

### Install and run the backend server
```bash
cd server
npm install
```

- Start in development mode (with `nodemon` auto-reload):
  ```bash
  cd server
  npm run dev
  ```

- Start in simple production mode:
  ```bash
  cd server
  npm start
  ```

The server listens on `http://localhost:3000` and serves the client from `client/`.

### Run the full app locally
1. Start the server (see above).
2. Open `http://localhost:3000/` in a browser.
3. In multiple browser windows/devices:
   - Enter a display name.
   - Either click **Create New Room** (which generates a random room ID) or type a room ID and click **Join Room**.
   - Share the room ID with others so they can join the same room.

### Build, lint, and tests
- There are currently **no build, lint, or test scripts** defined.
- When you add them, place scripts in `server/package.json` (and, if you introduce a front-end build, in a front-end `package.json`) and prefer using those scripts rather than invoking tools directly.
- To discover future scripts, inspect the `scripts` section of the relevant `package.json`.

## Current architecture
SkyMeet is a **full-stack video conferencing web application** with a Zoom-like, light UI, implemented as:

- **Backend server (`server/index.js`)**
  - Tech: Node.js, Express, Socket.IO.
  - Responsibilities:
    - Serves static front-end assets from `../client`.
    - Exposes `GET /api/health` as a simple health endpoint.
    - Maintains in-memory room and client state:
      - `rooms: Map<roomId, Set<socketId>>`.
      - `clients: Map<socketId, { roomId, name }>`.
    - Handles Socket.IO events:
      - `connection` – track new clients.
      - `join-room` – join a room, update maps, send `existing-users` to the new client, broadcast `user-joined` to others.
      - `signal` – relay WebRTC signaling messages (`offer`, `answer`, `ice-candidate`) between peers.
      - `disconnect` – clean up client/room state and broadcast `user-left` to remaining participants.
    - Uses permissive CORS and runs on `PORT` (default `3000`).

- **Front-end client (`client/`)**
  - Tech: static HTML/CSS/vanilla JS, Socket.IO client, WebRTC.
  - Files:
    - `index.html` – layout with:
      - Auth/join panel: display name, room ID, **Create New Room** / **Join Room** buttons.
      - Meeting panel: video grid, room label, mic/camera controls.
      - Includes Socket.IO client from CDN and `app.js`.
    - `style.css` – light, white/blue theme with responsive layout and video tiles.
    - `app.js` – client logic:
      - Obtains local media via `getUserMedia` and renders a local video tile.
      - Connects to Socket.IO (same origin) and emits `join-room` with `{ roomId, name }`.
      - On `existing-users`, creates a `RTCPeerConnection` per existing peer, adds local tracks, and negotiates offers.
      - On `signal`, handles `offer` / `answer` / `ice-candidate` to establish WebRTC peer connections.
      - On `user-left`, closes and removes the corresponding peer tile.
      - Uses STUN server `stun:stun.l.google.com:19302` and a full-mesh topology (each participant connects to all others).
      - Provides mic and camera toggles by enabling/disabling local audio/video tracks.

## Notes for future Warp agents
- Re-scan the repo (e.g. via file search or `Get-ChildItem`/`ls`) before making changes; this file may not describe newly added services or tooling.
- Prefer using the existing server entry point (`server/index.js`) and static client under `client/` unless a new structure has been introduced.
- When adding tests, linting, or additional services (e.g. auth, persistence, TURN/STUN configuration), surface them through explicit scripts in the appropriate `package.json` and update this WARP.md with any new common commands or architectural components.
