# Auto-Sync Skills Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow in `jxpeng98/skillsplace` that scans `jxpeng98/skills`, updates marketplace catalogs for new or changed plugins, validates the result, and opens a pull request.

**Architecture:** `jxpeng98/skills` remains the source repository for plugin and skill content. `jxpeng98/skillsplace` remains the catalog repository and owns a deterministic sync script that reads metadata files from `skills/plugins/*/skillsplace.json`, updates all platform catalogs, then lets GitHub Actions open a reviewable PR. Manual marketplace entries such as Qiongli remain supported because the sync script only manages entries whose source repository is `https://github.com/jxpeng98/skills`.

**Tech Stack:** Node.js ESM scripts, `node:test`, existing `npm run validate`, GitHub Actions, `actions/checkout`, `peter-evans/create-pull-request`.

---

## File Structure

Files in `jxpeng98/skillsplace`:

- Create: `scripts/sync-skills-repo.mjs`
  - Scans a local checkout of `jxpeng98/skills`.
  - Reads each `plugins/<slug>/skillsplace.json`.
  - Rebuilds all marketplace entries managed by the `skills` repo.
  - Preserves existing entries from other repositories and release artifacts.

- Create: `tests/sync-skills-repo.test.mjs`
  - Builds temporary `skillsplace` and `skills` fixtures.
  - Runs the sync script against fixtures.
  - Verifies new plugins are inserted into neutral, Codex, Claude, and Antigravity catalogs.
  - Verifies removed plugins from `skills` are removed from generated catalog entries.
  - Verifies invalid plugin metadata fails before writing catalog files.

- Modify: `tests/qiongli-entry.test.mjs`
  - Stop depending on fixed total package counts or exact full ordering for generated `skills` entries.
  - Keep exact assertions for Qiongli and release artifact packages.
  - Add focused assertions for `skills`-managed entries if needed.

- Modify: `tests/marketplace-only.test.mjs`
  - Stop asserting fixed package counts.
  - Keep assertions that `packages/`, `plugins/`, `.claude/skills`, and `.antigravity/plugins` stay empty.

- Create: `.github/workflows/sync-skills-marketplace.yml`
  - Runs manually and on a schedule.
  - Checks out `skillsplace` and `skills`.
  - Runs the sync script and `npm run validate`.
  - Creates a PR only when catalog files changed.

- Modify: `package.json`
  - Add `sync:skills` script for local use.

Files in `jxpeng98/skills`:

- Add or keep: `plugins/<plugin-name>/skillsplace.json`
  - One metadata file per publishable plugin.
  - This is the source of truth for marketplace fields that cannot be safely inferred.

---

## Metadata Contract For `jxpeng98/skills`

Each publishable plugin in `jxpeng98/skills` should include this file:

```text
plugins/<plugin-name>/skillsplace.json
```

Example for `plugins/productivity/skillsplace.json`:

```json
{
  "name": "Productivity",
  "slug": "productivity",
  "version": "0.1.0",
  "description": "Productivity skills for planning, critique, decisions, commits, and pull requests.",
  "manifest": ".codex-plugin/plugin.json",
  "category": {
    "codex": "Productivity",
    "claude": "productivity"
  },
  "tags": [
    "productivity",
    "planning",
    "review"
  ],
  "author": {
    "name": "Jiaxin Peng"
  },
  "homepage": "https://github.com/jxpeng98/skills",
  "repository": "https://github.com/jxpeng98/skills",
  "license": "MIT",
  "platforms": {
    "codex": true,
    "claude": true,
    "antigravity": {
      "status": "ready",
      "requiredRootFile": "plugin.json"
    }
  }
}
```

Validation rules:

- `slug` must match the plugin directory name.
- `slug` must be lowercase kebab-case.
- `version` must be semver-compatible.
- `name`, `description`, `manifest`, `category.codex`, and `category.claude` are required.
- `platforms.codex` and `platforms.claude` default to false unless explicitly true.
- `platforms.antigravity` is omitted unless the plugin should appear in `.antigravity/catalog.json`.
- `tags` defaults to an empty array.
- `author`, `homepage`, `repository`, and `license` default to the values shown above if omitted.

---

### Task 1: Add Fixture-Driven Tests For The Sync Script

**Files:**

- Create: `tests/sync-skills-repo.test.mjs`

- [ ] **Step 1: Create the test file with fixture helpers**

Create `tests/sync-skills-repo.test.mjs` with this starting content:

```js
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syncScript = path.join(root, "scripts/sync-skills-repo.mjs");
const validateScript = path.join(root, "scripts/validate.mjs");

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function createSkillsplaceFixture(name) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), `${name}-skillsplace-`));
  await mkdir(path.join(fixtureRoot, ".agents/plugins"), { recursive: true });
  await mkdir(path.join(fixtureRoot, ".claude-plugin"), { recursive: true });
  await mkdir(path.join(fixtureRoot, ".antigravity"), { recursive: true });

  await writeJson(path.join(fixtureRoot, "marketplace.json"), {
    name: "skillsplace",
    displayName: "Skillsplace Marketplace",
    version: "0.1.0",
    description: "Fixture marketplace.",
    packages: [
      {
        name: "Qiongli",
        slug: "qiongli",
        version: "0.13.0",
        description: "Academic paper workflows.",
        manifest: "https://github.com/jxpeng98/qiongli/blob/main/pyproject.toml",
        platforms: {
          codex: {
            type: "plugin",
            path: "https://github.com/jxpeng98/qiongli/tree/main/plugins/qiongli"
          },
          claude: {
            type: "plugin",
            path: "https://github.com/jxpeng98/qiongli/tree/main/plugins/qiongli"
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
          source: "git-subdir",
          url: "https://github.com/jxpeng98/qiongli.git",
          path: "./plugins/qiongli",
          ref: "main"
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL"
        },
        category: "Education"
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
          source: "git-subdir",
          url: "https://github.com/jxpeng98/qiongli.git",
          path: "plugins/qiongli",
          ref: "main"
        },
        description: "Academic paper workflows.",
        version: "0.13.0"
      }
    ]
  });

  await writeJson(path.join(fixtureRoot, ".antigravity/catalog.json"), {
    name: "skillsplace",
    displayName: "Skillsplace Antigravity Catalog",
    version: "0.1.0",
    description: "Fixture Antigravity catalog.",
    plugins: []
  });

  return fixtureRoot;
}

async function createSkillsFixture(name, plugins) {
  const skillsRoot = await mkdtemp(path.join(tmpdir(), `${name}-skills-`));
  for (const plugin of plugins) {
    const pluginRoot = path.join(skillsRoot, "plugins", plugin.slug);
    await mkdir(path.join(pluginRoot, ".codex-plugin"), { recursive: true });
    await mkdir(path.join(pluginRoot, ".claude-plugin"), { recursive: true });
    await writeJson(path.join(pluginRoot, "skillsplace.json"), plugin);
    await writeJson(path.join(pluginRoot, ".codex-plugin/plugin.json"), {
      name: plugin.slug,
      version: plugin.version,
      description: plugin.description,
      skills: "skills"
    });
  }
  return skillsRoot;
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}
```

- [ ] **Step 2: Add test for inserting a new plugin**

Append this test:

```js
test("sync inserts skills repo plugins into every requested catalog", async () => {
  const targetRoot = await createSkillsplaceFixture("insert");
  const sourceRoot = await createSkillsFixture("insert", [
    {
      name: "Productivity",
      slug: "productivity",
      version: "0.1.0",
      description: "Productivity skills for planning, critique, decisions, commits, and pull requests.",
      manifest: ".codex-plugin/plugin.json",
      category: {
        codex: "Productivity",
        claude: "productivity"
      },
      tags: ["productivity", "planning", "review"],
      platforms: {
        codex: true,
        claude: true,
        antigravity: {
          status: "ready",
          requiredRootFile: "plugin.json"
        }
      }
    }
  ]);

  await execFileAsync(process.execPath, [
    syncScript,
    "--source-root",
    sourceRoot,
    "--target-root",
    targetRoot
  ]);

  const marketplace = await readJson(path.join(targetRoot, "marketplace.json"));
  const codex = await readJson(path.join(targetRoot, ".agents/plugins/marketplace.json"));
  const claude = await readJson(path.join(targetRoot, ".claude-plugin/marketplace.json"));
  const antigravity = await readJson(path.join(targetRoot, ".antigravity/catalog.json"));

  assert.equal(bySlug(marketplace.packages, "qiongli").name, "Qiongli");
  assert.deepEqual(bySlug(marketplace.packages, "productivity"), {
    name: "Productivity",
    slug: "productivity",
    version: "0.1.0",
    description: "Productivity skills for planning, critique, decisions, commits, and pull requests.",
    manifest: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity/.codex-plugin/plugin.json",
    platforms: {
      codex: {
        type: "plugin",
        path: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity",
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
      },
      claude: {
        type: "plugin",
        path: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity",
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
      },
      antigravity: {
        type: "plugin",
        path: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity",
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.antigravity/catalog.json"
      }
    }
  });

  assert.deepEqual(bySlug(codex.plugins, "productivity"), {
    name: "productivity",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/skills.git",
      path: "./plugins/productivity",
      ref: "main"
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Productivity"
  });

  assert.deepEqual(bySlug(claude.plugins, "productivity"), {
    name: "productivity",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/skills.git",
      path: "plugins/productivity",
      ref: "main"
    },
    description: "Productivity skills for planning, critique, decisions, commits, and pull requests.",
    version: "0.1.0",
    author: {
      name: "Jiaxin Peng"
    },
    homepage: "https://github.com/jxpeng98/skills",
    repository: "https://github.com/jxpeng98/skills",
    license: "MIT",
    category: "productivity",
    tags: ["productivity", "planning", "review"]
  });

  assert.deepEqual(bySlug(antigravity.plugins, "productivity"), {
    name: "productivity",
    version: "0.1.0",
    description: "Productivity skills for planning, critique, decisions, commits, and pull requests.",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/skills.git",
      path: "plugins/productivity",
      ref: "main"
    },
    plugin: {
      status: "ready",
      requiredRootFile: "plugin.json",
      workspaceInstallPath: ".agents/plugins/productivity",
      globalInstallPath: "~/.gemini/config/plugins/productivity"
    },
    extension: {
      status: "not-published",
      registry: "open-vsx",
      extensionId: null
    }
  });

  const validateResult = await execFileAsync(process.execPath, [validateScript, "--root", targetRoot]);
  assert.match(validateResult.stdout, /Marketplace validation passed/);
});
```

- [ ] **Step 3: Add test for removing stale skills-managed entries**

Append this test:

```js
test("sync removes stale entries previously managed from the skills repo", async () => {
  const targetRoot = await createSkillsplaceFixture("remove-stale");
  const sourceRoot = await createSkillsFixture("remove-stale", []);

  const marketplacePath = path.join(targetRoot, "marketplace.json");
  const codexPath = path.join(targetRoot, ".agents/plugins/marketplace.json");
  const claudePath = path.join(targetRoot, ".claude-plugin/marketplace.json");

  const marketplace = await readJson(marketplacePath);
  marketplace.packages.push({
    name: "Stale Plugin",
    slug: "stale-plugin",
    version: "0.1.0",
    description: "A stale generated plugin.",
    manifest: "https://github.com/jxpeng98/skills/tree/main/plugins/stale-plugin/.codex-plugin/plugin.json",
    platforms: {
      codex: {
        type: "plugin",
        path: "https://github.com/jxpeng98/skills/tree/main/plugins/stale-plugin"
      }
    }
  });
  await writeJson(marketplacePath, marketplace);

  const codex = await readJson(codexPath);
  codex.plugins.push({
    name: "stale-plugin",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/skills.git",
      path: "./plugins/stale-plugin",
      ref: "main"
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Productivity"
  });
  await writeJson(codexPath, codex);

  const claude = await readJson(claudePath);
  claude.plugins.push({
    name: "stale-plugin",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/skills.git",
      path: "plugins/stale-plugin",
      ref: "main"
    },
    description: "A stale generated plugin."
  });
  await writeJson(claudePath, claude);

  await execFileAsync(process.execPath, [
    syncScript,
    "--source-root",
    sourceRoot,
    "--target-root",
    targetRoot
  ]);

  const updatedMarketplace = await readJson(marketplacePath);
  const updatedCodex = await readJson(codexPath);
  const updatedClaude = await readJson(claudePath);

  assert.equal(bySlug(updatedMarketplace.packages, "qiongli").name, "Qiongli");
  assert.equal(bySlug(updatedMarketplace.packages, "stale-plugin"), undefined);
  assert.equal(bySlug(updatedCodex.plugins, "stale-plugin"), undefined);
  assert.equal(bySlug(updatedClaude.plugins, "stale-plugin"), undefined);
});
```

- [ ] **Step 4: Add test for invalid metadata**

Append this test:

```js
test("sync rejects invalid plugin metadata before writing catalogs", async () => {
  const targetRoot = await createSkillsplaceFixture("invalid");
  const sourceRoot = await createSkillsFixture("invalid", [
    {
      name: "Invalid Plugin",
      slug: "Invalid Plugin",
      version: "0.1",
      description: "Invalid plugin metadata.",
      manifest: ".codex-plugin/plugin.json",
      category: {
        codex: "Productivity",
        claude: "productivity"
      },
      platforms: {
        codex: true
      }
    }
  ]);

  await assert.rejects(
    execFileAsync(process.execPath, [
      syncScript,
      "--source-root",
      sourceRoot,
      "--target-root",
      targetRoot
    ]),
    /slug must match plugin directory name/
  );
});
```

- [ ] **Step 5: Run the new tests and verify they fail**

Run:

```bash
node --test tests/sync-skills-repo.test.mjs
```

Expected: FAIL because `scripts/sync-skills-repo.mjs` does not exist.

- [ ] **Step 6: Commit the failing tests**

```bash
git add tests/sync-skills-repo.test.mjs
git commit -m "test: add skills marketplace sync coverage"
```

---

### Task 2: Implement The Sync Script

**Files:**

- Create: `scripts/sync-skills-repo.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the sync script**

Create `scripts/sync-skills-repo.mjs` with these responsibilities:

```js
#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const defaultTargetRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const targetRoot = path.resolve(args["target-root"] || defaultTargetRoot);
const sourceRoot = path.resolve(args["source-root"] || process.env.SKILLS_REPO_ROOT || "../skills");
const owner = args.owner || "jxpeng98";
const repo = args.repo || "skills";
const ref = args.ref || "main";
const repoUrl = `https://github.com/${owner}/${repo}.git`;
const treeUrl = `https://github.com/${owner}/${repo}/tree/${ref}`;
const marketplaceBaseUrl = "https://github.com/jxpeng98/skillsplace/blob/main";

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assertKebab(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new Error(`${label} must be kebab-case and at most 64 characters`);
  }
}

function assertSemver(value, label) {
  if (typeof value !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error(`${label} must be semver-like, for example 0.1.0`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function normalizePluginMetadata(pluginDirName, metadata) {
  assertKebab(pluginDirName, "plugin directory name");
  assertString(metadata.name, `${pluginDirName}.name`);
  assertKebab(metadata.slug, `${pluginDirName}.slug`);
  if (metadata.slug !== pluginDirName) {
    throw new Error(`${pluginDirName}.slug must match plugin directory name`);
  }
  assertSemver(metadata.version, `${pluginDirName}.version`);
  assertString(metadata.description, `${pluginDirName}.description`);
  assertString(metadata.manifest, `${pluginDirName}.manifest`);
  assertString(metadata.category?.codex, `${pluginDirName}.category.codex`);
  assertString(metadata.category?.claude, `${pluginDirName}.category.claude`);

  return {
    name: metadata.name,
    slug: metadata.slug,
    version: metadata.version,
    description: metadata.description,
    manifest: metadata.manifest.replace(/^\.\//, ""),
    category: {
      codex: metadata.category.codex,
      claude: metadata.category.claude
    },
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    author: metadata.author || { name: "Jiaxin Peng" },
    homepage: metadata.homepage || `https://github.com/${owner}/${repo}`,
    repository: metadata.repository || `https://github.com/${owner}/${repo}`,
    license: metadata.license || "MIT",
    platforms: metadata.platforms || {}
  };
}

async function scanSkillsPlugins() {
  const pluginsRoot = path.join(sourceRoot, "plugins");
  if (!existsSync(pluginsRoot)) {
    throw new Error(`Skills plugins directory does not exist: ${pluginsRoot}`);
  }

  const entries = [];
  for (const dirent of await readdir(pluginsRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const metadataPath = path.join(pluginsRoot, dirent.name, "skillsplace.json");
    if (!existsSync(metadataPath)) {
      continue;
    }
    const metadata = normalizePluginMetadata(dirent.name, await readJson(metadataPath));
    entries.push(metadata);
  }

  return entries.sort((left, right) => left.slug.localeCompare(right.slug));
}

function pluginTreePath(slug) {
  return `${treeUrl}/plugins/${slug}`;
}

function manifestTreePath(plugin) {
  return `${pluginTreePath(plugin.slug)}/${plugin.manifest}`;
}

function isSkillsNeutralPackage(entry) {
  return typeof entry?.manifest === "string" && entry.manifest.startsWith(`https://github.com/${owner}/${repo}/`);
}

function isSkillsCodexPlugin(entry) {
  return entry?.source?.source === "git-subdir" && entry.source.url === repoUrl;
}

function isSkillsClaudePlugin(entry) {
  return entry?.source?.source === "git-subdir" && entry.source.url === repoUrl;
}

function isSkillsAntigravityPlugin(entry) {
  return entry?.source?.source === "git-subdir" && entry.source.url === repoUrl;
}

function buildNeutralPackage(plugin) {
  const platforms = {};
  if (plugin.platforms.codex === true) {
    platforms.codex = {
      type: "plugin",
      path: pluginTreePath(plugin.slug),
      marketplace: `${marketplaceBaseUrl}/.agents/plugins/marketplace.json`
    };
  }
  if (plugin.platforms.claude === true) {
    platforms.claude = {
      type: "plugin",
      path: pluginTreePath(plugin.slug),
      marketplace: `${marketplaceBaseUrl}/.claude-plugin/marketplace.json`
    };
  }
  if (plugin.platforms.antigravity) {
    platforms.antigravity = {
      type: "plugin",
      path: pluginTreePath(plugin.slug),
      marketplace: `${marketplaceBaseUrl}/.antigravity/catalog.json`
    };
  }

  return {
    name: plugin.name,
    slug: plugin.slug,
    version: plugin.version,
    description: plugin.description,
    manifest: manifestTreePath(plugin),
    platforms
  };
}

function buildCodexPlugin(plugin) {
  return {
    name: plugin.slug,
    source: {
      source: "git-subdir",
      url: repoUrl,
      path: `./plugins/${plugin.slug}`,
      ref
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: plugin.category.codex
  };
}

function buildClaudePlugin(plugin) {
  return {
    name: plugin.slug,
    source: {
      source: "git-subdir",
      url: repoUrl,
      path: `plugins/${plugin.slug}`,
      ref
    },
    description: plugin.description,
    version: plugin.version,
    author: plugin.author,
    homepage: plugin.homepage,
    repository: plugin.repository,
    license: plugin.license,
    category: plugin.category.claude,
    tags: plugin.tags
  };
}

function buildAntigravityPlugin(plugin) {
  const antigravity = plugin.platforms.antigravity;
  return {
    name: plugin.slug,
    version: plugin.version,
    description: plugin.description,
    source: {
      source: "git-subdir",
      url: repoUrl,
      path: `plugins/${plugin.slug}`,
      ref
    },
    plugin: {
      status: antigravity.status || "pending-native-manifest",
      requiredRootFile: antigravity.requiredRootFile || "plugin.json",
      workspaceInstallPath: `.agents/plugins/${plugin.slug}`,
      globalInstallPath: `~/.gemini/config/plugins/${plugin.slug}`
    },
    extension: {
      status: antigravity.extension?.status || "not-published",
      registry: antigravity.extension?.registry || "open-vsx",
      extensionId: antigravity.extension?.extensionId ?? null
    }
  };
}

function replaceManagedEntries(existingEntries, managedEntries, predicate) {
  return [...existingEntries.filter((entry) => !predicate(entry)), ...managedEntries];
}

async function main() {
  const plugins = await scanSkillsPlugins();

  const marketplacePath = path.join(targetRoot, "marketplace.json");
  const codexPath = path.join(targetRoot, ".agents/plugins/marketplace.json");
  const claudePath = path.join(targetRoot, ".claude-plugin/marketplace.json");
  const antigravityPath = path.join(targetRoot, ".antigravity/catalog.json");

  const marketplace = await readJson(marketplacePath);
  const codex = await readJson(codexPath);
  const claude = await readJson(claudePath);
  const antigravity = existsSync(antigravityPath) ? await readJson(antigravityPath) : null;

  marketplace.packages = replaceManagedEntries(
    marketplace.packages,
    plugins.map(buildNeutralPackage),
    isSkillsNeutralPackage
  );

  codex.plugins = replaceManagedEntries(
    codex.plugins,
    plugins.filter((plugin) => plugin.platforms.codex === true).map(buildCodexPlugin),
    isSkillsCodexPlugin
  );

  claude.plugins = replaceManagedEntries(
    claude.plugins,
    plugins.filter((plugin) => plugin.platforms.claude === true).map(buildClaudePlugin),
    isSkillsClaudePlugin
  );

  if (antigravity) {
    antigravity.plugins = replaceManagedEntries(
      antigravity.plugins,
      plugins.filter((plugin) => plugin.platforms.antigravity).map(buildAntigravityPlugin),
      isSkillsAntigravityPlugin
    );
  }

  await writeJson(marketplacePath, marketplace);
  await writeJson(codexPath, codex);
  await writeJson(claudePath, claude);
  if (antigravity) {
    await writeJson(antigravityPath, antigravity);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Step 2: Add a local npm script**

Modify `package.json`:

```json
{
  "scripts": {
    "test": "node --test",
    "validate": "node scripts/validate.mjs && node --test",
    "sync:skills": "node scripts/sync-skills-repo.mjs --source-root ../skills --target-root ."
  }
}
```

Keep the existing `name`, `version`, `private`, `type`, `description`, `license`, and `engines` fields unchanged.

- [ ] **Step 3: Run the focused tests**

Run:

```bash
node --test tests/sync-skills-repo.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Run the full validation suite**

Run:

```bash
npm run validate
```

Expected: `Marketplace validation passed.` and all `node --test` tests pass.

- [ ] **Step 5: Commit the implementation**

```bash
git add scripts/sync-skills-repo.mjs package.json tests/sync-skills-repo.test.mjs
git commit -m "feat: add skills repository marketplace sync"
```

---

### Task 3: Make Existing Tests Compatible With Generated Skills Entries

**Files:**

- Modify: `tests/marketplace-only.test.mjs`
- Modify: `tests/qiongli-entry.test.mjs`

- [ ] **Step 1: Remove fixed count assertions from `tests/marketplace-only.test.mjs`**

Replace:

```js
  assert.equal(marketplace.packages.length, 11);
  assert.equal(codexMarketplace.plugins.length, 11);
  assert.equal(claudeMarketplace.plugins.length, 11);
  assert.equal(antigravityCatalog.plugins.length, 5);
```

with:

```js
  assert.ok(marketplace.packages.length >= 1);
  assert.equal(codexMarketplace.plugins.length, marketplace.packages.filter((entry) => entry.platforms.codex).length);
  assert.equal(claudeMarketplace.plugins.length, marketplace.packages.filter((entry) => entry.platforms.claude).length);
  assert.equal(
    antigravityCatalog.plugins.length,
    marketplace.packages.filter((entry) => entry.platforms.antigravity).length
  );
```

- [ ] **Step 2: Relax full-order assertions in `tests/qiongli-entry.test.mjs`**

Keep the exact `bySlug(..., "qiongli")` and subject package assertions. Replace the strict full-array checks:

```js
  assert.deepEqual(marketplace.packages.map((entry) => entry.slug), expectedMarketplaceSlugs);
  assert.deepEqual(codexMarketplace.plugins.map((entry) => entry.name), expectedMarketplaceSlugs);
  assert.deepEqual(claudeMarketplace.plugins.map((entry) => entry.name), expectedMarketplaceSlugs);
  assert.deepEqual(antigravityCatalog.plugins.map((entry) => entry.name), expectedAntigravitySlugs);
```

with:

```js
  for (const slug of expectedMarketplaceSlugs) {
    assert.ok(bySlug(marketplace.packages, slug), `expected marketplace slug ${slug}`);
    assert.ok(bySlug(codexMarketplace.plugins, slug), `expected Codex plugin ${slug}`);
    assert.ok(bySlug(claudeMarketplace.plugins, slug), `expected Claude plugin ${slug}`);
  }

  for (const slug of expectedAntigravitySlugs) {
    assert.ok(bySlug(antigravityCatalog.plugins, slug), `expected Antigravity plugin ${slug}`);
  }
```

- [ ] **Step 3: Run affected tests**

Run:

```bash
node --test tests/marketplace-only.test.mjs tests/qiongli-entry.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Run full validation**

Run:

```bash
npm run validate
```

Expected: `Marketplace validation passed.` and all tests pass.

- [ ] **Step 5: Commit test updates**

```bash
git add tests/marketplace-only.test.mjs tests/qiongli-entry.test.mjs
git commit -m "test: relax marketplace assertions for generated entries"
```

---

### Task 4: Add The GitHub Actions Workflow

**Files:**

- Create: `.github/workflows/sync-skills-marketplace.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/sync-skills-marketplace.yml`:

```yaml
name: Sync Skills Marketplace

on:
  workflow_dispatch:
  schedule:
    - cron: "17 3 * * *"

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    name: Scan skills repo and open catalog PR
    runs-on: ubuntu-latest
    steps:
      - name: Check out skillsplace
        uses: actions/checkout@v4
        with:
          path: skillsplace

      - name: Check out skills source repository
        uses: actions/checkout@v4
        with:
          repository: jxpeng98/skills
          path: skills
          token: ${{ secrets.SKILLS_REPO_TOKEN || github.token }}

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Sync generated marketplace entries
        working-directory: skillsplace
        run: npm run sync:skills -- --source-root ../skills --target-root .

      - name: Validate marketplace
        working-directory: skillsplace
        run: npm run validate

      - name: Create pull request
        uses: peter-evans/create-pull-request@v6
        with:
          path: skillsplace
          branch: chore/sync-skills-marketplace
          delete-branch: true
          title: "chore: sync skills marketplace entries"
          commit-message: "chore: sync skills marketplace entries"
          body: |
            ## Summary

            - Syncs marketplace entries from `jxpeng98/skills`.
            - Updates generated Codex, Claude Code, and Antigravity catalog entries.
            - Runs `npm run validate` before opening this PR.

            ## Source

            This PR was generated by `.github/workflows/sync-skills-marketplace.yml`.
          labels: |
            automation
            marketplace
```

- [ ] **Step 2: Check workflow syntax locally**

Run:

```bash
git diff --check .github/workflows/sync-skills-marketplace.yml
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit workflow**

```bash
git add .github/workflows/sync-skills-marketplace.yml
git commit -m "ci: add skills marketplace sync workflow"
```

---

### Task 5: Update `jxpeng98/skills` Plugin Metadata

**Files in `jxpeng98/skills`:**

- Create or update: `plugins/productivity/skillsplace.json`
- Create or update: `plugins/dev-tools/skillsplace.json`
- Create or update: `plugins/writing-tools/skillsplace.json`
- Create or update: `plugins/presentation-tools/skillsplace.json`

- [ ] **Step 1: Add `productivity` metadata**

Create `plugins/productivity/skillsplace.json`:

```json
{
  "name": "Productivity",
  "slug": "productivity",
  "version": "0.1.0",
  "description": "Productivity skills for planning, critique, decisions, commits, and pull requests.",
  "manifest": ".codex-plugin/plugin.json",
  "category": {
    "codex": "Productivity",
    "claude": "productivity"
  },
  "tags": [
    "productivity",
    "planning",
    "review"
  ],
  "platforms": {
    "codex": true,
    "claude": true,
    "antigravity": {
      "status": "ready",
      "requiredRootFile": "plugin.json"
    }
  }
}
```

- [ ] **Step 2: Add `dev-tools` metadata**

Create `plugins/dev-tools/skillsplace.json`:

```json
{
  "name": "Dev Tools",
  "slug": "dev-tools",
  "version": "0.1.0",
  "description": "Developer skills for repository boundaries, validation, and release readiness.",
  "manifest": ".codex-plugin/plugin.json",
  "category": {
    "codex": "Developer Tools",
    "claude": "developer-tools"
  },
  "tags": [
    "development",
    "repository",
    "release"
  ],
  "platforms": {
    "codex": true,
    "claude": true,
    "antigravity": {
      "status": "ready",
      "requiredRootFile": "plugin.json"
    }
  }
}
```

- [ ] **Step 3: Add `writing-tools` metadata**

Create `plugins/writing-tools/skillsplace.json`:

```json
{
  "name": "Writing Tools",
  "slug": "writing-tools",
  "version": "0.1.0",
  "description": "Writing skills for clarity, tone, summarization, and reusable text transformation.",
  "manifest": ".codex-plugin/plugin.json",
  "category": {
    "codex": "Writing",
    "claude": "writing"
  },
  "tags": [
    "writing",
    "editing",
    "summarization"
  ],
  "platforms": {
    "codex": true,
    "claude": true,
    "antigravity": {
      "status": "ready",
      "requiredRootFile": "plugin.json"
    }
  }
}
```

- [ ] **Step 4: Add `presentation-tools` metadata**

Create `plugins/presentation-tools/skillsplace.json`:

```json
{
  "name": "Presentation Tools",
  "slug": "presentation-tools",
  "version": "0.1.0",
  "description": "Presentation skills for creating engineering and project slides with Slidev.",
  "manifest": ".codex-plugin/plugin.json",
  "category": {
    "codex": "Productivity",
    "claude": "presentations"
  },
  "tags": [
    "presentations",
    "slidev",
    "slides"
  ],
  "platforms": {
    "codex": true,
    "claude": true,
    "antigravity": {
      "status": "ready",
      "requiredRootFile": "plugin.json"
    }
  }
}
```

- [ ] **Step 5: Commit skills metadata**

Run from `jxpeng98/skills`:

```bash
git add plugins/productivity/skillsplace.json plugins/dev-tools/skillsplace.json plugins/writing-tools/skillsplace.json plugins/presentation-tools/skillsplace.json
git commit -m "chore: add skillsplace plugin metadata"
git push
```

Expected: `jxpeng98/skills` main branch contains metadata files for every publishable plugin.

---

### Task 6: Run End-To-End Local Sync

**Files:**

- Modify: generated catalog files in `jxpeng98/skillsplace` only if current entries differ from generated output.

- [ ] **Step 1: Run the local sync**

Run from `jxpeng98/skillsplace`:

```bash
npm run sync:skills -- --source-root ../skills --target-root .
```

Expected: generated entries for `productivity`, `dev-tools`, `writing-tools`, and `presentation-tools` match the metadata in `jxpeng98/skills`.

- [ ] **Step 2: Inspect the diff**

Run:

```bash
git diff -- marketplace.json .agents/plugins/marketplace.json .claude-plugin/marketplace.json .antigravity/catalog.json
```

Expected:

- Existing Qiongli entries remain untouched.
- Entries sourced from `https://github.com/jxpeng98/skills.git` match the generated format.
- No local absolute paths appear.
- No skill source code is added to `skillsplace`.

- [ ] **Step 3: Run validation**

Run:

```bash
npm run validate
```

Expected: `Marketplace validation passed.` and all tests pass.

- [ ] **Step 4: Commit catalog normalization if needed**

If Step 2 produced catalog changes, commit them:

```bash
git add marketplace.json .agents/plugins/marketplace.json .claude-plugin/marketplace.json .antigravity/catalog.json
git commit -m "chore: normalize skills marketplace entries"
```

If Step 2 produced no changes, do not create a commit.

---

### Task 7: Verify The Workflow In GitHub

**Files:**

- No code changes expected.

- [ ] **Step 1: Push the `skillsplace` branch**

Run:

```bash
git push
```

Expected: the branch containing Tasks 1-4 and Task 6 changes is available on GitHub.

- [ ] **Step 2: Run the workflow manually**

In GitHub Actions, run:

```text
Sync Skills Marketplace
```

Expected:

- `Check out skillsplace` succeeds.
- `Check out skills source repository` succeeds.
- `Sync generated marketplace entries` succeeds.
- `Validate marketplace` succeeds.
- `Create pull request` either opens a PR or reports no changes.

- [ ] **Step 3: If checkout of `jxpeng98/skills` fails**

If `jxpeng98/skills` is private, add a repository secret in `skillsplace`:

```text
SKILLS_REPO_TOKEN
```

The token must have read access to `jxpeng98/skills` and write access to create branches/PRs in `jxpeng98/skillsplace` only if `GITHUB_TOKEN` cannot create PRs under the repository settings.

- [ ] **Step 4: Confirm PR behavior**

Expected PR title:

```text
chore: sync skills marketplace entries
```

Expected branch:

```text
chore/sync-skills-marketplace
```

Expected validation:

- The PR runs the existing `Validate Marketplace` workflow.
- The PR diff changes only catalog files when plugin metadata changed.

---

## Self-Review

Spec coverage:

- Scans `jxpeng98/skills`: Task 2.
- Uses plugin-local metadata instead of unsafe inference: Task 5.
- Updates all marketplace catalog layers: Task 2 and Task 6.
- Opens PR automatically: Task 4 and Task 7.
- Preserves repository boundaries: File Structure, Task 6 diff inspection.
- Handles private repository access: Task 7.
- Keeps `npm run validate` as the verification gate: Tasks 2, 3, 4, 6, and 7.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps remain.
- Every file creation task includes concrete content or exact behavior.
- Every validation step includes a command and expected result.

Type consistency:

- Metadata fields are consistent across fixture tests and sync implementation.
- Generated source paths match the existing marketplace validator requirements.
- `git-subdir` paths use `./plugins/<slug>` for Codex and `plugins/<slug>` for Claude and Antigravity.
