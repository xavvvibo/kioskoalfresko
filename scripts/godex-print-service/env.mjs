import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const serviceDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(serviceDir, "../..");

export async function loadEnvFile(filePath, { override = false } = {}) {
  const content = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!content) return false;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^"|"$/g, "");
    if (override || !process.env[key]) process.env[key] = value;
  }

  return true;
}

export async function loadGodexEnv() {
  const loaded = [];
  const candidates = [...new Set([
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.local"),
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), ".env.local"),
  ])];

  for (const filePath of candidates) {
    if (await loadEnvFile(filePath)) loaded.push(filePath);
  }
  return loaded;
}

export async function packageVersion() {
  const content = await fs.readFile(path.join(repoRoot, "package.json"), "utf8").catch(() => "");
  if (!content) return "unknown";
  return JSON.parse(content).version || "unknown";
}
