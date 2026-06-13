import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts/sync-qiongli-releases.mjs");
const scriptUrl = pathToFileURL(scriptPath).href;

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function createFixture() {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "qiongli-sync-"));

  await writeJson(path.join(fixtureRoot, "marketplace.json"), {
    name: "skillsplace",
    displayName: "Skillsplace Marketplace",
    version: "0.1.0",
    description: "Fixture marketplace.",
    packages: [
      {
        name: "Qiongli",
        slug: "qiongli",
        version: "0.1.0",
        description: "Old Qiongli entry.",
        manifest: "https://example.com/old.tar.gz",
        platforms: {
          codex: {
            type: "plugin",
            path: "https://example.com/old.tar.gz"
          }
        }
      },
      {
        name: "Dev Tools",
        slug: "dev-tools",
        version: "0.1.0",
        description: "Developer tools.",
        manifest: "https://github.com/jxpeng98/skills/tree/main/plugins/dev-tools/.codex-plugin/plugin.json",
        platforms: {
          codex: {
            type: "plugin",
            path: "https://github.com/jxpeng98/skills/tree/main/plugins/dev-tools"
          }
        }
      }
    ]
  });

  await writeJson(path.join(fixtureRoot, ".agents/plugins/marketplace.json"), {
    name: "skillsplace",
    interface: {
      displayName: "Skillsplace Marketplace"
    },
    plugins: [
      {
        name: "qiongli",
        source: {
          source: "url",
          url: "https://example.com/old.tar.gz"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Education"
      },
      {
        name: "dev-tools",
        source: {
          source: "git-subdir",
          url: "https://github.com/jxpeng98/skills.git",
          path: "./plugins/dev-tools",
          ref: "main"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Developer Tools"
      }
    ]
  });

  await writeJson(path.join(fixtureRoot, ".claude-plugin/marketplace.json"), {
    name: "skillsplace",
    owner: {
      name: "jxpeng98"
    },
    description: "Fixture marketplace.",
    version: "0.1.0",
    plugins: [
      {
        name: "qiongli",
        source: {
          source: "url",
          url: "https://example.com/old.tar.gz"
        },
        description: "Old Qiongli entry.",
        version: "0.1.0"
      },
      {
        name: "dev-tools",
        source: {
          source: "git-subdir",
          url: "https://github.com/jxpeng98/skills.git",
          path: "plugins/dev-tools",
          ref: "main"
        },
        description: "Developer tools.",
        version: "0.1.0"
      }
    ]
  });

  await writeJson(path.join(fixtureRoot, ".antigravity/catalog.json"), {
    name: "skillsplace",
    displayName: "Skillsplace Antigravity Catalog",
    version: "0.1.0",
    description: "Fixture Antigravity catalog.",
    plugins: [
      {
        name: "qiongli",
        version: "0.1.0",
        description: "Old Qiongli entry.",
        source: {
          source: "git-subdir",
          url: "https://github.com/jxpeng98/qiongli.git",
          path: "plugins/qiongli",
          ref: "v0.1.0"
        },
        plugin: {
          status: "pending-native-manifest",
          requiredRootFile: "plugin.json",
          workspaceInstallPath: ".agents/plugins/qiongli",
          globalInstallPath: "~/.gemini/config/plugins/qiongli"
        },
        extension: {
          status: "not-published",
          registry: "open-vsx",
          extensionId: null
        }
      }
    ]
  });

  return fixtureRoot;
}

function release(tagName, prerelease, assetSlugs, platforms = ["codex", "claude"]) {
  const version = tagName.replace(/^v/, "");
  return {
    tag_name: tagName,
    draft: false,
    prerelease,
    published_at: "2026-06-01T00:00:00Z",
    assets: assetSlugs.flatMap((slug) =>
      platforms.map((platform) => ({
        name: `${slug}-${platform}-plugin-v${version}.tar.gz`,
        browser_download_url: `https://github.com/jxpeng98/qiongli/releases/download/${tagName}/${slug}-${platform}-plugin-v${version}.tar.gz`
      }))
    )
  };
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}

test("selectLatestQiongliReleases separates latest stable and prerelease by semver", async () => {
  const { selectLatestQiongliReleases } = await import(scriptUrl);
  const selected = selectLatestQiongliReleases([
    release("v1.4.0-beta.0", true, ["qiongli-next"], ["claude"]),
    release("v0.19.0", false, ["qiongli"]),
    { ...release("v9.0.0", false, ["qiongli"]), draft: true },
    release("v0.20.0", false, ["qiongli"], ["codex", "claude"]),
    release("v1.4.0-beta.1", true, ["qiongli-next"], ["codex", "claude"]),
    release("v1.4.0-beta.2", true, ["qiongli"])
  ]);

  assert.equal(selected.stable.tag_name, "v0.20.0");
  assert.equal(selected.prerelease.tag_name, "v1.4.0-beta.1");
});

test("selectLatestQiongliReleases requires prerelease Codex and Claude plugin assets", async () => {
  const { selectLatestQiongliReleases } = await import(scriptUrl);
  const selected = selectLatestQiongliReleases([
    release("v1.3.0", false, ["qiongli"], ["codex", "claude"]),
    release("v1.4.0-beta.1", true, ["qiongli-next"], ["claude"]),
    release("v1.4.0-beta.2", true, ["qiongli-next"], ["codex", "claude"]),
    release("v1.4.0-beta.3", true, ["qiongli-next"], ["claude"])
  ]);

  assert.equal(selected.prerelease.tag_name, "v1.4.0-beta.2");
});

test("syncQiongliReleases rewrites qiongli catalogs from release assets", async () => {
  const { syncQiongliReleases } = await import(scriptUrl);
  const fixtureRoot = await createFixture();

  await syncQiongliReleases({
    root: fixtureRoot,
    releases: [
      release("v1.3.0", false, ["qiongli", "qiongli-core", "qiongli-political-economy"], ["codex", "claude"]),
      release("v1.4.0-beta.1", true, ["qiongli-next"])
    ]
  });

  const marketplace = await readJson(path.join(fixtureRoot, "marketplace.json"));
  const codex = await readJson(path.join(fixtureRoot, ".agents/plugins/marketplace.json"));
  const claude = await readJson(path.join(fixtureRoot, ".claude-plugin/marketplace.json"));
  const antigravity = await readJson(path.join(fixtureRoot, ".antigravity/catalog.json"));

  assert.equal(bySlug(marketplace.packages, "qiongli").version, "1.3.0");
  assert.equal(bySlug(marketplace.packages, "qiongli-next").version, "1.4.0-beta.1");
  assert.equal(
    bySlug(marketplace.packages, "qiongli-next").manifest,
    "https://github.com/jxpeng98/qiongli/releases/download/v1.4.0-beta.1/qiongli-next-codex-plugin-v1.4.0-beta.1.tar.gz"
  );
  assert.deepEqual(bySlug(marketplace.packages, "qiongli-next").platforms.codex, {
    type: "plugin",
    path: "https://github.com/jxpeng98/qiongli/releases/download/v1.4.0-beta.1/qiongli-next-codex-plugin-v1.4.0-beta.1.tar.gz",
    marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
  });
  assert.equal(
    bySlug(marketplace.packages, "qiongli-next").platforms.claude.path,
    "https://github.com/jxpeng98/qiongli/releases/download/v1.4.0-beta.1/qiongli-next-claude-plugin-v1.4.0-beta.1.tar.gz"
  );
  assert.equal(bySlug(marketplace.packages, "qiongli-core").version, "1.3.0");
  assert.equal(bySlug(marketplace.packages, "qiongli-political-economy").version, "1.3.0");
  assert.equal(bySlug(marketplace.packages, "dev-tools").version, "0.1.0");

  assert.deepEqual(bySlug(codex.plugins, "qiongli").source, {
    source: "url",
    url: "https://github.com/jxpeng98/qiongli/releases/download/v1.3.0/qiongli-codex-plugin-v1.3.0.tar.gz"
  });
  assert.deepEqual(bySlug(codex.plugins, "qiongli-next").source, {
    source: "url",
    url: "https://github.com/jxpeng98/qiongli/releases/download/v1.4.0-beta.1/qiongli-next-codex-plugin-v1.4.0-beta.1.tar.gz"
  });
  assert.equal(bySlug(codex.plugins, "qiongli-core"), undefined);
  assert.equal(bySlug(marketplace.packages, "qiongli-core").platforms.codex, undefined);
  assert.equal(bySlug(claude.plugins, "qiongli-next").version, "1.4.0-beta.1");
  assert.equal(
    bySlug(claude.plugins, "qiongli-next").source.url,
    "https://github.com/jxpeng98/qiongli/releases/download/v1.4.0-beta.1/qiongli-next-claude-plugin-v1.4.0-beta.1.tar.gz"
  );
  assert.equal(bySlug(antigravity.plugins, "qiongli").source.ref, "v1.3.0");
});

test("syncQiongliReleases keeps Antigravity on the stable source path for 1.x releases", async () => {
  const { syncQiongliReleases } = await import(scriptUrl);
  const fixtureRoot = await createFixture();

  await syncQiongliReleases({
    root: fixtureRoot,
    releases: [
      release("v1.2.0", false, ["qiongli"], ["codex", "claude"]),
      release("v1.4.0-beta.1", true, ["qiongli-next"])
    ]
  });

  const marketplace = await readJson(path.join(fixtureRoot, "marketplace.json"));
  const codex = await readJson(path.join(fixtureRoot, ".agents/plugins/marketplace.json"));
  const antigravity = await readJson(path.join(fixtureRoot, ".antigravity/catalog.json"));

  assert.equal(
    bySlug(marketplace.packages, "qiongli").platforms.codex.path,
    "https://github.com/jxpeng98/qiongli/releases/download/v1.2.0/qiongli-codex-plugin-v1.2.0.tar.gz"
  );
  assert.equal(
    bySlug(codex.plugins, "qiongli").source.url,
    "https://github.com/jxpeng98/qiongli/releases/download/v1.2.0/qiongli-codex-plugin-v1.2.0.tar.gz"
  );
  assert.equal(bySlug(antigravity.plugins, "qiongli").source.path, "packages/qiongli-plugin");
});
