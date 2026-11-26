import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSyncApp } from "../src/core/app.js";
import { DEFAULT_SERVER_NAME, resolveServerName, SERVER_VERSION } from "../src/core/version.js";
// @ts-expect-error ESM script module without declaration file
import { bumpVersionFiles, computeNextVersion } from "../scripts/bump-version.mjs";
import type {
  EventRecord,
  IncidentNoteRecord,
  ShareParticipant,
  ShareSessionRecord,
  StorageAdapter,
} from "../src/core/types.js";

class DummyStorageAdapter implements StorageAdapter {
  async init(): Promise<void> {}
  async getEvent(): Promise<EventRecord | null> { return null; }
  async saveEvent(): Promise<void> {}
  async getNotesSince(): Promise<IncidentNoteRecord[]> { return []; }
  async applyNoteChanges(): Promise<{ latestVersion: number }> { return { latestVersion: 0 }; }
  async createShareSession(s: ShareSessionRecord): Promise<ShareSessionRecord> { return s; }
  async getShareSession(): Promise<ShareSessionRecord | null> { return null; }
  async getActiveSharesForSku(): Promise<ShareSessionRecord[]> { return []; }
  async addParticipant(_shareId: string, _participant: ShareParticipant): Promise<ShareSessionRecord | null> { return null; }
  async updateParticipantName(): Promise<ShareSessionRecord[]> { return []; }
  async removeParticipant(): Promise<{ session: ShareSessionRecord | null; deleted: boolean }> {
    return { session: null, deleted: false };
  }
  async deleteShareSession(): Promise<void> {}
  async purgeSkuNotes(): Promise<void> {}
}

describe("Server Version Endpoints, Name Override & Headers", () => {
  it("keeps SERVER_VERSION synced with package.json in unpadded RoboRef format (vYYYY.M.D+N)", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version: string;
    };

    assert.strictEqual(SERVER_VERSION, `v${pkg.version}`);
    assert.match(SERVER_VERSION, /^v\d{4}\.(?:[1-9]|1[0-2])\.(?:[1-9]|[12]\d|3[01])\+[1-9]\d*$/);
  });

  it("computeNextVersion sets unpadded YYYY.M.D+1 on new date and increments +N on same date", () => {
    const jan5 = new Date(2027, 0, 5); // January 5, 2027 (single-digit month & day)
    assert.strictEqual(computeNextVersion("1.0.0", jan5), "2027.1.5+1");
    assert.strictEqual(computeNextVersion("2027.1.4+3", jan5), "2027.1.5+1");
    assert.strictEqual(computeNextVersion("2027.1.5+1", jan5), "2027.1.5+2");
    assert.strictEqual(computeNextVersion("2027.1.5+9", jan5), "2027.1.5+10");
    assert.strictEqual(computeNextVersion("v2027.1.5+2", jan5), "2027.1.5+3");

    const nov26 = new Date(2026, 10, 26); // November 26, 2026
    assert.strictEqual(computeNextVersion("2026.11.26+1", nov26), "2026.11.26+2");
  });

  it("bumpVersionFiles updates package.json, package-lock.json, and src/core/version.ts together", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "roboapps-bump-"));
    try {
      mkdirSync(path.join(tempRoot, "src", "core"), { recursive: true });
      writeFileSync(
        path.join(tempRoot, "package.json"),
        JSON.stringify({ name: "roboapps-server", version: "2026.11.26+1" }, null, 2) + "\n",
        "utf8"
      );
      writeFileSync(
        path.join(tempRoot, "package-lock.json"),
        JSON.stringify(
          {
            name: "roboapps-server",
            version: "2026.11.26+1",
            packages: { "": { name: "roboapps-server", version: "2026.11.26+1" } },
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
      writeFileSync(
        path.join(tempRoot, "src", "core", "version.ts"),
        'export const DEFAULT_SERVER_NAME = "RoboApps Server";\nexport const SERVER_VERSION = "v2026.11.26+1";\n',
        "utf8"
      );

      const nov26 = new Date(2026, 10, 26);
      const res1 = bumpVersionFiles(tempRoot, nov26);
      assert.deepStrictEqual(res1, {
        previousVersion: "2026.11.26+1",
        nextVersion: "2026.11.26+2",
        serverVersion: "v2026.11.26+2",
      });

      const pkg1 = JSON.parse(readFileSync(path.join(tempRoot, "package.json"), "utf8"));
      const lock1 = JSON.parse(readFileSync(path.join(tempRoot, "package-lock.json"), "utf8"));
      const ts1 = readFileSync(path.join(tempRoot, "src", "core", "version.ts"), "utf8");
      assert.strictEqual(pkg1.version, "2026.11.26+2");
      assert.strictEqual(lock1.version, "2026.11.26+2");
      assert.strictEqual(lock1.packages[""].version, "2026.11.26+2");
      assert.ok(ts1.includes('export const SERVER_VERSION = "v2026.11.26+2";'));

      const jan5 = new Date(2027, 0, 5);
      const res2 = bumpVersionFiles(tempRoot, jan5);
      assert.deepStrictEqual(res2, {
        previousVersion: "2026.11.26+2",
        nextVersion: "2027.1.5+1",
        serverVersion: "v2027.1.5+1",
      });
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolveServerName returns default when unset or blank and trims overrides", () => {
    assert.strictEqual(resolveServerName(), DEFAULT_SERVER_NAME);
    assert.strictEqual(resolveServerName(""), DEFAULT_SERVER_NAME);
    assert.strictEqual(resolveServerName("   "), DEFAULT_SERVER_NAME);
    assert.strictEqual(resolveServerName("  RoboApps Server (Test)  "), "RoboApps Server (Test)");
  });

  it("GET /api/version returns default server name, version, no-store cache control, and X-Server-Version header", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const res = await app.request("/api/version");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("X-Server-Version"), SERVER_VERSION);
    assert.strictEqual(res.headers.get("Cache-Control"), "no-store");

    const json = await res.json();
    assert.deepStrictEqual(json, {
      server: DEFAULT_SERVER_NAME,
      version: SERVER_VERSION,
    });
  });

  it("GET /api/health includes default server name, version in JSON body, and X-Server-Version header", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const res = await app.request("/api/health");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("X-Server-Version"), SERVER_VERSION);

    const json = (await res.json()) as {
      status: string;
      server: string;
      version: string;
      timestamp: number;
    };
    assert.strictEqual(json.status, "ok");
    assert.strictEqual(json.server, DEFAULT_SERVER_NAME);
    assert.strictEqual(json.version, SERVER_VERSION);
    assert.strictEqual(typeof json.timestamp, "number");
  });

  it("overrides server name from Cloudflare Worker env binding SERVER_NAME", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const env = { SERVER_NAME: "RoboApps Server (Test)" };

    const versionRes = await app.request("/api/version", {}, env);
    assert.strictEqual(versionRes.status, 200);
    assert.deepStrictEqual(await versionRes.json(), {
      server: "RoboApps Server (Test)",
      version: SERVER_VERSION,
    });

    const healthRes = await app.request("/api/health", {}, env);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as { server: string; version: string };
    assert.strictEqual(healthJson.server, "RoboApps Server (Test)");
    assert.strictEqual(healthJson.version, SERVER_VERSION);
  });

  it("overrides server name from process.env.SERVER_NAME and prefers Worker binding when both are set", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const previous = process.env.SERVER_NAME;
    process.env.SERVER_NAME = "Venue LAN Server";
    try {
      const nodeRes = await app.request("/api/version");
      assert.deepStrictEqual(await nodeRes.json(), {
        server: "Venue LAN Server",
        version: SERVER_VERSION,
      });

      const workerRes = await app.request("/api/version", {}, { SERVER_NAME: "RoboApps Server (Test)" });
      assert.deepStrictEqual(await workerRes.json(), {
        server: "RoboApps Server (Test)",
        version: SERVER_VERSION,
      });
    } finally {
      if (previous === undefined) {
        delete process.env.SERVER_NAME;
      } else {
        process.env.SERVER_NAME = previous;
      }
    }
  });

  it("falls back to default server name when SERVER_NAME env binding is blank", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const res = await app.request("/api/version", {}, { SERVER_NAME: "   " });

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(await res.json(), {
      server: DEFAULT_SERVER_NAME,
      version: SERVER_VERSION,
    });
  });

  it("exposes X-Server-Version via CORS for RoboRef and RoboVolunteers origins", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const origins = [
      "https://roboref.app",
      "https://test.roboref.app",
      "https://robovolunteers.link",
      "https://test.robovolunteers.link",
    ];

    for (const origin of origins) {
      const res = await app.request("/api/version", {
        headers: { Origin: origin },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get("Access-Control-Allow-Origin"), origin);
      assert.ok(
        res.headers.get("Access-Control-Expose-Headers")?.includes("X-Server-Version"),
        `Expected Access-Control-Expose-Headers to include X-Server-Version for ${origin}`
      );
      assert.strictEqual(res.headers.get("X-Server-Version"), SERVER_VERSION);
    }
  });

  it("includes X-Server-Version header on other API endpoints", async () => {
    const app = createSyncApp(new DummyStorageAdapter());
    const res = await app.request("/api/sync/pull?sku=RE-V5RC-26-0001");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("X-Server-Version"), SERVER_VERSION);
  });
});
