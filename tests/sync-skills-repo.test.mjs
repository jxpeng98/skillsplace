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
  await mkdir(path.join(fixtureRoot, ".hermes"), { recursive: true });

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
      },
      {
        name: "Productivity",
        slug: "productivity",
        version: "0.0.1",
        description: "Old productivity metadata.",
        manifest: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity/.codex-plugin/plugin.json",
        platforms: {
          codex: {
            type: "plugin",
            path: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity"
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
  await writeJson(path.join(fixtureRoot, ".hermes/marketplace.json"), {
    name: "skillsplace",
    displayName: "Skillsplace Hermes Skills Catalog",
    version: "0.1.0",
    description: "Fixture Hermes catalog.",
    skills: []
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
      "| `qiongli` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | Academic paper workflows. |",
      "| `productivity` | `0.0.1` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex | Old productivity metadata. |",
      "",
      "Other docs stay untouched.",
      ""
    ].join("\n")
  );

  return fixtureRoot;
}

async function createSkillsFixture(name, plugins) {
  const skillsRoot = await mkdtemp(path.join(tmpdir(), `${name}-skills-`));
  await mkdir(path.join(skillsRoot, "plugins"), { recursive: true });
  for (const plugin of plugins) {
    const directoryName = plugin.directoryName ?? plugin.slug;
    const pluginRoot = path.join(skillsRoot, "plugins", directoryName);
    await mkdir(path.join(pluginRoot, ".codex-plugin"), { recursive: true });
    await mkdir(path.join(pluginRoot, ".claude-plugin"), { recursive: true });
    const { directoryName: _directoryName, skills = [], ...metadata } = plugin;
    await writeJson(path.join(pluginRoot, "skillsplace.json"), metadata);
    await writeJson(path.join(pluginRoot, ".codex-plugin/plugin.json"), {
      name: plugin.slug,
      version: plugin.version,
      description: plugin.description,
      skills: "skills"
    });
    for (const skill of skills) {
      await mkdir(path.join(pluginRoot, "skills", skill.slug), { recursive: true });
      await writeFile(
        path.join(pluginRoot, "skills", skill.slug, "SKILL.md"),
        [
          "---",
          `name: ${skill.slug}`,
          `description: ${skill.description}`,
          "---",
          "",
          `# ${skill.title ?? skill.slug}`,
          ""
        ].join("\n")
      );
    }
  }
  return skillsRoot;
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}

function isMissingSyncScript(error) {
  return error?.code === 1 && error?.stderr?.includes(`Cannot find module '${syncScript}'`);
}

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
      },
      skills: [
        {
          slug: "commit-message",
          title: "Commit Message",
          description: "Use when the user asks for a Git commit message."
        }
      ]
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
  const hermes = await readJson(path.join(targetRoot, ".hermes/marketplace.json"));
  const readme = await readFile(path.join(targetRoot, "README.md"), "utf8");

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
      },
      hermes: {
        type: "adapter",
        path: "https://github.com/jxpeng98/skills/tree/main/plugins/productivity/skills",
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.hermes/marketplace.json"
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

  assert.deepEqual(bySlug(hermes.skills, "commit-message"), {
    name: "commit-message",
    package: "productivity",
    version: "0.1.0",
    description: "Use when the user asks for a Git commit message.",
    source: {
      source: "github",
      identifier: "jxpeng98/skills/plugins/productivity/skills/commit-message",
      repo: "jxpeng98/skills",
      path: "plugins/productivity/skills/commit-message",
      ref: "main"
    },
    install: {
      command: "hermes skills install jxpeng98/skills/plugins/productivity/skills/commit-message",
      source: "github",
      trust: "community"
    },
    tags: ["productivity", "planning", "review"]
  });
  assert.match(
    readme,
    /\| `productivity` \| `0\.1\.0` \| \[`jxpeng98\/skills`\]\(https:\/\/github\.com\/jxpeng98\/skills\) \| Codex, Claude Code, Antigravity, Hermes \| Productivity skills/
  );
  assert.doesNotMatch(readme, /`productivity` \| `0\.0\.1`|Old productivity metadata/);
  assert.match(readme, /Other docs stay untouched\./);

  const validateResult = await execFileAsync(process.execPath, [validateScript, "--root", targetRoot]);
  assert.match(validateResult.stdout, /Marketplace validation passed/);
});

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

test("sync rejects invalid plugin metadata before writing catalogs", async () => {
  const targetRoot = await createSkillsplaceFixture("invalid");
  const sourceRoot = await createSkillsFixture("invalid", [
    {
      directoryName: "invalid-plugin",
      name: "Invalid Plugin",
      slug: "other-plugin",
      version: "0.1.0",
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

  const marketplacePath = path.join(targetRoot, "marketplace.json");
  const codexPath = path.join(targetRoot, ".agents/plugins/marketplace.json");
  const claudePath = path.join(targetRoot, ".claude-plugin/marketplace.json");
  const antigravityPath = path.join(targetRoot, ".antigravity/catalog.json");
  const hermesPath = path.join(targetRoot, ".hermes/marketplace.json");
  const before = {
    marketplace: await readJson(marketplacePath),
    codex: await readJson(codexPath),
    claude: await readJson(claudePath),
    antigravity: await readJson(antigravityPath),
    hermes: await readJson(hermesPath)
  };

  try {
    await execFileAsync(process.execPath, [
      syncScript,
      "--source-root",
      sourceRoot,
      "--target-root",
      targetRoot
    ]);
    assert.fail("Expected invalid plugin metadata to be rejected");
  } catch (error) {
    if (isMissingSyncScript(error)) {
      throw error;
    }

    assert.match(`${error.message}\n${error.stderr ?? ""}`, /slug must match plugin directory name/);
  }

  assert.deepEqual(await readJson(marketplacePath), before.marketplace);
  assert.deepEqual(await readJson(codexPath), before.codex);
  assert.deepEqual(await readJson(claudePath), before.claude);
  assert.deepEqual(await readJson(antigravityPath), before.antigravity);
  assert.deepEqual(await readJson(hermesPath), before.hermes);
});
