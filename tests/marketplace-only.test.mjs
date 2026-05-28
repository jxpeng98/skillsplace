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

test("repository starts as a marketplace-only catalog", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
  const antigravityCatalog = await readJson(".antigravity/catalog.json");

  assert.equal(marketplace.packages.length, 5);
  assert.equal(codexMarketplace.plugins.length, 5);
  assert.equal(claudeMarketplace.plugins.length, 5);
  assert.equal(antigravityCatalog.plugins.length, 5);
  assert.deepEqual(await directoryEntries("packages"), []);
  assert.deepEqual(await directoryEntries("plugins"), []);
  assert.deepEqual(await directoryEntries(".claude/skills"), []);
  assert.deepEqual(await directoryEntries(".antigravity/plugins"), []);
});
