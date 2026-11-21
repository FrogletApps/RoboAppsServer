# RoboApps Server AI Agent Guidelines & Context (`AGENTS.md`)

Welcome! This file (`AGENTS.md`) contains primary guidelines and context for AI coding agents working on the **RoboApps Server** codebase.

---

## 1. Project Overview

**RoboApps Server** is the universal sync and API backend for RoboRef and related RoboApps tools. It runs both as a **Cloudflare Worker** (cloud sync using D1) and as a **Node.js / Raspberry Pi local server** (LAN offline sync at tournament venues using SQLite).

### Tech Stack & Architecture
- **Core (`src/core/`)**: Hono REST API routes, CORS validation, VEX Events API v2 proxy, delta sync, and share session endpoints.
- **Storage Adapters (`src/adapters/`)**: `cloudflare-d1.ts` (Cloudflare D1) and `local-sqlite.ts` (Node.js SQLite).
- **Entry Points**: `src/index.cf.ts` (Cloudflare Workers) and `src/index.node.ts` (Node.js / Docker).

---

## 2. Crucial Guidelines for AI Agents

### A. Offline-First & Dual-Runtime Compatibility
- Keep `src/core/` runtime-agnostic so all endpoints work identically on both Cloudflare Workers and Node.js (Raspberry Pi / LAN venues).
- Do not introduce Node-only dependencies into `src/core/` or `src/index.cf.ts`.

### B. Environment & Deployment Guardrails
- **Test Environment Only**: AI agents may build, test, and deploy ONLY to the **Test** environment (e.g. `npm run deploy:cf:test`, `npx wrangler deploy --env test`, or `./scripts/deploy.ps1 test`).
- **Live / Production Protection**: AI agents are strictly **PROHIBITED** from executing production deployment commands (e.g. `npm run deploy:cf:live`, `npx wrangler deploy --env live`, or `./scripts/deploy.ps1 live`) or modifying live production infrastructure directly. Production deployments must be executed manually by the maintainer.

---

## 3. Key Development Commands

```bash
npm install
npm run typecheck      # TypeScript typecheck
npm test               # Run test suite
npm run build:node     # Compile Node.js output to dist/
npm run dev:node       # Run local Node.js server
npm run dev:cf         # Run Cloudflare Worker locally (wrangler)
npm run deploy:cf:test # Deploy to test environment (Test Only)
```
