import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function directoryEntries(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }
  return readdir(absolutePath);
}

test("repository keeps only marketplace catalogs without vendored plugin sources", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
  const antigravityCatalog = await readJson(".antigravity/catalog.json");
  const hermesCatalog = await readJson(".hermes/marketplace.json");
  const hermesPackages = new Set(hermesCatalog.skills.map((entry) => entry.package));

  assert.ok(marketplace.packages.length >= 1);
  assert.equal(codexMarketplace.plugins.length, marketplace.packages.filter((entry) => entry.platforms.codex).length);
  assert.equal(claudeMarketplace.plugins.length, marketplace.packages.filter((entry) => entry.platforms.claude).length);
  assert.equal(
    antigravityCatalog.plugins.length,
    marketplace.packages.filter((entry) => entry.platforms.antigravity).length
  );
  assert.equal(hermesPackages.size, marketplace.packages.filter((entry) => entry.platforms.hermes).length);
  assert.deepEqual(await directoryEntries("packages"), []);
  assert.deepEqual(await directoryEntries("plugins"), []);
  assert.deepEqual(await directoryEntries(".claude/skills"), []);
  assert.deepEqual(await directoryEntries(".antigravity/plugins"), []);
  assert.deepEqual(await directoryEntries(".hermes/skills"), []);
});
