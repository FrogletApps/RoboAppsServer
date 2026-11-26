# RoboApps Server

Universal sync and API server for **RoboRef** and the **RoboApps** ecosystem, built with **TypeScript** and **Hono**. Designed to run seamlessly both as a **Cloudflare Worker** (cloud sync backed by D1) and as a **Node.js / Raspberry Pi venue server** (local LAN offline sync backed by SQLite).

## Architecture

- **Framework**: [Hono](https://hono.dev) + TypeScript
- **Cloudflare Runtime** (`src/index.cf.ts`): Cloudflare Workers + Cloudflare D1 (`src/adapters/cloudflare-d1.ts`)
- **Node.js / Venue Runtime** (`src/index.node.ts`): `@hono/node-server` + local SQLite (`src/adapters/local-sqlite.ts`), containerized via `Dockerfile.rpi`
- **API Routes** (`src/core/app.ts`):
  - `GET /api/health` — Server health check, name, version info, & LAN discovery
  - `GET /api/version` — Server name and version info (`server`, `version`, using unpadded `vYYYY.M.D+N` format synced with `package.json` via `npm run bump`), also exposed on all responses via the `X-Server-Version` header; `server` defaults to `"RoboApps Server"` and can be overridden via the `SERVER_NAME` environment variable
  - `GET /api/vexevents/*` — Cached proxy for VEX Events API v2
  - `GET /api/sync/pull`, `POST /api/sync/push` — Delta incident note synchronization
  - `GET /api/share/*`, `POST /api/share/*` — Tournament share session management

## Getting Started

```bash
npm install
```

### Run Locally (Node.js / LAN Venue Server)
```bash
npm run dev:node
```

### Run Locally (Cloudflare Worker / Wrangler)
```bash
npm run dev:cf
```

### Build & Test
```bash
# Typecheck, run tests, and compile Node.js bundle
./scripts/build.ps1   # Windows (PowerShell)
./scripts/build.sh    # Linux / macOS
```

### Bumping the Version
```bash
# Sets today's unpadded date (YYYY.M.D+1) or increments +N if already today
# Updates package.json, package-lock.json, and src/core/version.ts together
npm run bump
```

## Deploying to Cloudflare Workers

Configured in `wrangler.toml` with path-based API routes (`test.roboref.app/api/*`, `test.robovolunteers.link/api/*`, `roboref.app/api/*`, and `robovolunteers.link/api/*`):

```bash
# Deploy to Test environment (roboapps-server-test)
./scripts/deploy.ps1 test
# or: npm run deploy:cf:test

# Deploy to Live environment (roboapps-server)
./scripts/deploy.ps1 live
# or: npm run deploy:cf:live
```

### Required Worker Secrets
Before first deployment to a new Worker, configure your VEX Events API token secret:
```bash
npx wrangler secret put VEX_EVENTS_TOKEN --env test
npx wrangler secret put VEX_EVENTS_TOKEN --env live
```
