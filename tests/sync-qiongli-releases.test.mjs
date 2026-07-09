import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts/sync-qiongli-releases.mjs");
const scriptUrl = pathToFileURL(scriptPath).href;
const qiongliRepo = "https://github.com/jxpeng98/qiongli";
const qiongliGitUrl = "https://github.com/jxpeng98/qiongli.git";

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

  await writeFile(
    path.join(fixtureRoot, "README.md"),
    [
      "# Skillsplace Marketplace",
      "",
      "The current marketplace entries are:",
      "",
      "| Package | Version | Source | Platforms | Description |",
      "| --- | --- | --- | --- | --- |",
      "| `qiongli` | `0.1.0` | [`qiongli` release](https://example.com/old) | Codex | Old Qiongli entry. |",
      "| `qiongli-next` | `0.2.0-beta.1` | [`qiongli` pre-release](https://example.com/old-beta) | Codex | Old prerelease entry. |",
      "| `dev-tools` | `0.1.0` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code | Developer tools. |",
      "",
      "Other docs stay untouched.",
      ""
    ].join("\n")
  );

  return fixtureRoot;
}

function release(
  tagName,
  prerelease,
  assetSlugs,
  platforms = ["codex", "claude"],
  desktopSlugs = assetSlugs.filter((slug) => slug === "qiongli" || slug === "qiongli-next")
) {
  const version = tagName.replace(/^v/, "");
  return {
    tag_name: tagName,
    draft: false,
    prerelease,
    published_at: "2026-06-01T00:00:00Z",
    assets: [
      ...assetSlugs.flatMap((slug) =>
        platforms.map((platform) => ({
          name: `${slug}-${platform}-plugin-v${version}.tar.gz`,
          browser_download_url: `https://github.com/jxpeng98/qiongli/releases/download/${tagName}/${slug}-${platform}-plugin-v${version}.tar.gz`
        }))
      ),
      ...desktopSlugs.map((slug) => ({
        name: `${slug}-claude-desktop-plugin-v${version}.zip`,
        browser_download_url: desktopPluginAsset(slug, version)
      }))
    ]
  };
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}

function codexDistRef(version) {
  return `codex/v${version}`;
}

function claudeDistRef(version) {
  return `claude/v${version}`;
}

function codexDistPath(slug) {
  return `plugins/${slug}`;
}

function codexDistUrl(slug, version) {
  return `${qiongliRepo}/tree/${codexDistRef(version)}/${codexDistPath(slug)}`;
}

function claudeDistUrl(slug, version) {
  return `${qiongliRepo}/tree/${claudeDistRef(version)}/${codexDistPath(slug)}`;
}

function codexDistManifest(slug, version) {
  return `${codexDistUrl(slug, version)}/.codex-plugin/plugin.json`;
}

function desktopPluginAsset(slug, version) {
  return `${qiongliRepo}/releases/download/v${version}/${slug}-claude-desktop-plugin-v${version}.zip`;
}

function codexDistSource(slug, version) {
  return {
    source: "git-subdir",
    url: qiongliGitUrl,
    path: `./${codexDistPath(slug)}`,
    ref: codexDistRef(version)
  };
}

function claudeDistSource(slug, version) {
  return {
    source: "git-subdir",
    url: qiongliGitUrl,
    path: codexDistPath(slug),
    ref: codexDistRef(version)
  };
}

function nextClaudeDistSource(slug, version) {
  return {
    source: "git-subdir",
    url: qiongliGitUrl,
    path: codexDistPath(slug),
    ref: claudeDistRef(version)
  };
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
    codexDistManifest("qiongli-next", "1.4.0-beta.1")
  );
  assert.deepEqual(bySlug(marketplace.packages, "qiongli-next").platforms.codex, {
    type: "plugin",
    path: codexDistUrl("qiongli-next", "1.4.0-beta.1"),
    marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
  });
  assert.deepEqual(bySlug(marketplace.packages, "qiongli").platforms["claude-desktop"], {
    type: "plugin",
    path: desktopPluginAsset("qiongli", "1.3.0"),
    marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/marketplace.json"
  });
  assert.deepEqual(bySlug(marketplace.packages, "qiongli-next").platforms["claude-desktop"], {
    type: "plugin",
    path: desktopPluginAsset("qiongli-next", "1.4.0-beta.1"),
    marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/marketplace.json"
  });
  assert.equal(bySlug(marketplace.packages, "qiongli").platforms.claude.path, codexDistUrl("qiongli", "1.3.0"));
  assert.equal(
    bySlug(marketplace.packages, "qiongli-next").platforms.claude.path,
    claudeDistUrl("qiongli-next", "1.4.0-beta.1")
  );
  assert.equal(bySlug(marketplace.packages, "qiongli-core").version, "1.3.0");
  assert.equal(bySlug(marketplace.packages, "qiongli-political-economy").version, "1.3.0");
  assert.equal(bySlug(marketplace.packages, "dev-tools").version, "0.1.0");

  assert.deepEqual(bySlug(codex.plugins, "qiongli").source, codexDistSource("qiongli", "1.3.0"));
  assert.deepEqual(bySlug(codex.plugins, "qiongli-next").source, codexDistSource("qiongli-next", "1.4.0-beta.1"));
  assert.equal(bySlug(codex.plugins, "qiongli-core"), undefined);
  assert.equal(bySlug(marketplace.packages, "qiongli-core").platforms.codex, undefined);
  assert.deepEqual(bySlug(claude.plugins, "qiongli").source, claudeDistSource("qiongli", "1.3.0"));
  assert.equal(bySlug(claude.plugins, "qiongli-next").version, "1.4.0-beta.1");
  assert.deepEqual(bySlug(claude.plugins, "qiongli-next").source, nextClaudeDistSource("qiongli-next", "1.4.0-beta.1"));
  assert.equal(bySlug(antigravity.plugins, "qiongli").source.ref, "v1.3.0");

  const readme = await readFile(path.join(fixtureRoot, "README.md"), "utf8");
  assert.match(
    readme,
    /\| `qiongli` \| `1\.3\.0` \| \[`qiongli` release\]\(https:\/\/github\.com\/jxpeng98\/qiongli\/releases\/tag\/v1\.3\.0\) \| Codex, Claude Code, Claude Desktop, Antigravity \| Academic paper workflows/
  );
  assert.match(
    readme,
    /\| `qiongli-next` \| `1\.4\.0-beta\.1` \| \[`qiongli` pre-release\]\(https:\/\/github\.com\/jxpeng98\/qiongli\/releases\/tag\/v1\.4\.0-beta\.1\) \| Codex, Claude Code, Claude Desktop \| Pre-release Qiongli channel/
  );
  assert.match(readme, /\| `qiongli-political-economy` \| `1\.3\.0` /);
  assert.match(readme, /\| `dev-tools` \| `0\.1\.0` /);
});

test("syncQiongliReleases requires Claude Desktop plugin assets for Qiongli channels", async () => {
  const { syncQiongliReleases } = await import(scriptUrl);
  const fixtureRoot = await createFixture();

  await assert.rejects(
    syncQiongliReleases({
      root: fixtureRoot,
      releases: [
        release("v1.3.0", false, ["qiongli"], ["codex", "claude"], []),
        release("v1.4.0-beta.1", true, ["qiongli-next"])
      ]
    }),
    /v1\.3\.0 is missing the qiongli Claude Desktop plugin asset/
  );

  await assert.rejects(
    syncQiongliReleases({
      root: fixtureRoot,
      releases: [
        release("v1.3.0", false, ["qiongli"]),
        release("v1.4.0-beta.1", true, ["qiongli-next"], ["codex", "claude"], [])
      ]
    }),
    /v1\.4\.0-beta\.1 is missing the qiongli-next Claude Desktop plugin asset/
  );
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
    codexDistUrl("qiongli", "1.2.0")
  );
  assert.deepEqual(bySlug(codex.plugins, "qiongli").source, codexDistSource("qiongli", "1.2.0"));
  assert.equal(bySlug(antigravity.plugins, "qiongli").source.path, "packages/qiongli-plugin");
});
