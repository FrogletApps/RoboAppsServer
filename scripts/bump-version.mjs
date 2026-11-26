import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Computes the next unpadded CalVer+build version (e.g., "2026.11.26+1", "2027.1.5+1").
 * - If currentVersion matches today's local date (`YYYY.M.D+N`), increments N to N + 1.
 * - Otherwise returns `YYYY.M.D+1`.
 */
export function computeNextVersion(currentVersion, now = new Date()) {
  const datePart = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
  const cleanCurrent = typeof currentVersion === "string" ? currentVersion.trim().replace(/^v/i, "") : "";
  const match = cleanCurrent.match(/^(\d{4}\.(?:[1-9]|1[0-2])\.(?:[1-9]|[12]\d|3[01]))\+([1-9]\d*)$/);

  if (match && match[1] === datePart) {
    const nextBuild = Number.parseInt(match[2], 10) + 1;
    return `${datePart}+${nextBuild}`;
  }

  return `${datePart}+1`;
}

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function writeJsonPreservingEol(filePath, data, originalText) {
  const eol = detectEol(originalText);
  const trailingNewline = originalText.endsWith("\n") ? eol : "";
  const formatted = JSON.stringify(data, null, 2).replace(/\n/g, eol) + trailingNewline;
  writeFileSync(filePath, formatted, "utf8");
}

export function bumpVersionFiles(rootDir, now = new Date()) {
  const pkgPath = path.join(rootDir, "package.json");
  const pkgRaw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(pkgRaw);

  const previousVersion = pkg.version;
  const nextVersion = computeNextVersion(previousVersion, now);
  const serverVersion = `v${nextVersion}`;

  pkg.version = nextVersion;
  writeJsonPreservingEol(pkgPath, pkg, pkgRaw);

  const lockPath = path.join(rootDir, "package-lock.json");
  if (existsSync(lockPath)) {
    const lockRaw = readFileSync(lockPath, "utf8");
    const lock = JSON.parse(lockRaw);
    lock.version = nextVersion;
    if (lock.packages && lock.packages[""]) {
      lock.packages[""].version = nextVersion;
    }
    writeJsonPreservingEol(lockPath, lock, lockRaw);
  }

  const versionTsPath = path.join(rootDir, "src", "core", "version.ts");
  const versionTsRaw = readFileSync(versionTsPath, "utf8");
  const updatedVersionTs = versionTsRaw.replace(
    /export const SERVER_VERSION = "[^"]+";/,
    `export const SERVER_VERSION = "${serverVersion}";`
  );
  if (updatedVersionTs === versionTsRaw && !versionTsRaw.includes(`SERVER_VERSION = "${serverVersion}"`)) {
    throw new Error(`Could not locate SERVER_VERSION declaration in ${versionTsPath}`);
  }
  writeFileSync(versionTsPath, updatedVersionTs, "utf8");

  return { previousVersion, nextVersion, serverVersion };
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, "..");
  const { previousVersion, nextVersion, serverVersion } = bumpVersionFiles(rootDir);
  console.log(`Bumped version: ${previousVersion} -> ${nextVersion} (${serverVersion})`);
}
