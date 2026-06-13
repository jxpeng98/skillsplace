import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validateScript = path.join(root, "scripts/validate.mjs");

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createFixture(name, marketplace, codexMarketplace, claudeMarketplace, antigravityCatalog = null) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), `${name}-`));
  await mkdir(path.join(fixtureRoot, ".agents/plugins"), { recursive: true });
  await mkdir(path.join(fixtureRoot, ".claude-plugin"), { recursive: true });
  await writeJson(path.join(fixtureRoot, "marketplace.json"), marketplace);
  await writeJson(path.join(fixtureRoot, ".agents/plugins/marketplace.json"), codexMarketplace);
  await writeJson(path.join(fixtureRoot, ".claude-plugin/marketplace.json"), claudeMarketplace);
  if (antigravityCatalog) {
    await mkdir(path.join(fixtureRoot, ".antigravity"), { recursive: true });
    await writeJson(path.join(fixtureRoot, ".antigravity/catalog.json"), antigravityCatalog);
  }
  return fixtureRoot;
}

test("validator accepts marketplace entries that point to external package sources", async () => {
  const fixtureRoot = await createFixture(
    "skillsplace-valid-external",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "External-only marketplace fixture.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: "https://github.com/example/agent-packages/blob/main/packages/release-helper/manifest.json",
          platforms: {
            codex: {
              type: "plugin",
              path: "https://github.com/example/agent-packages/tree/main/plugins/release-helper",
              marketplace: "./.agents/plugins/marketplace.json"
            },
            claude: {
              type: "skill",
              path: "https://github.com/example/agent-packages/tree/main/claude/skills/release-helper"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "git-subdir",
            url: "https://github.com/example/agent-packages.git",
            path: "./plugins/release-helper",
            ref: "main"
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Productivity"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      description: "External-only marketplace fixture.",
      version: "0.1.0",
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "github",
            repo: "example/agent-packages",
            ref: "main"
          },
          description: "Release workflow package hosted outside this marketplace."
        }
      ]
    }
  );

  const result = await execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]);

  assert.match(result.stdout, /Marketplace validation passed/);
});

test("validator accepts Codex marketplace entries that point to external URL sources", async () => {
  const sourceUrl = "https://github.com/example/agent-packages.git";
  const fixtureRoot = await createFixture(
    "skillsplace-valid-codex-url",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "External-only marketplace fixture.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: "https://github.com/example/agent-packages/blob/main/plugins/release-helper/.codex-plugin/plugin.json",
          platforms: {
            codex: {
              type: "plugin",
              path: sourceUrl,
              marketplace: "./.agents/plugins/marketplace.json"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "url",
            url: sourceUrl
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Productivity"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      description: "External-only marketplace fixture.",
      version: "0.1.0",
      plugins: []
    }
  );

  const result = await execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]);

  assert.match(result.stdout, /Marketplace validation passed/);
});

test("validator rejects untrusted Codex URL sources that point to archive artifacts", async () => {
  const artifactUrl = "https://github.com/example/agent-packages/releases/download/v1.2.3/release-helper-codex-plugin-v1.2.3.tar.gz";
  const fixtureRoot = await createFixture(
    "skillsplace-invalid-codex-archive-url",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "External-only marketplace fixture.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: artifactUrl,
          platforms: {
            codex: {
              type: "plugin",
              path: artifactUrl,
              marketplace: "./.agents/plugins/marketplace.json"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "url",
            url: artifactUrl
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Productivity"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      description: "External-only marketplace fixture.",
      version: "0.1.0",
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /Codex archive URL sources must be trusted Qiongli release artifacts/
  );
});

test("validator rejects Qiongli subject Codex archives without a trust rule", async () => {
  const artifactUrl =
    "https://github.com/jxpeng98/qiongli/releases/download/v1.3.0/qiongli-core-codex-plugin-v1.3.0.tar.gz";
  const fixtureRoot = await createFixture(
    "skillsplace-invalid-qiongli-subject-codex-archive-url",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "External-only marketplace fixture.",
      packages: [
        {
          name: "Qiongli Core",
          slug: "qiongli-core",
          version: "1.3.0",
          description: "Qiongli subject package fixture.",
          manifest: artifactUrl,
          platforms: {
            codex: {
              type: "plugin",
              path: artifactUrl,
              marketplace: "./.agents/plugins/marketplace.json"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "qiongli-core",
          source: {
            source: "url",
            url: artifactUrl
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Education"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      description: "External-only marketplace fixture.",
      version: "0.1.0",
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /Codex archive URL sources must be trusted Qiongli release artifacts/
  );
});

test("validator uses the root passed with --root", async () => {
  const fixtureRoot = await createFixture(
    "skillsplace-invalid-root",
    {
      name: "Invalid Name",
      displayName: "Invalid Marketplace",
      version: "0.1.0",
      description: "This fixture should fail.",
      packages: []
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: []
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /marketplace\.name must be kebab-case/
  );
});

test("validator requires neutral platform entries to have matching platform catalog entries", async () => {
  const fixtureRoot = await createFixture(
    "skillsplace-missing-platform-entry",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "Marketplace fixture with a missing Codex entry.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: "https://github.com/example/agent-packages/blob/main/packages/release-helper/manifest.json",
          platforms: {
            codex: {
              type: "plugin",
              path: "https://github.com/example/agent-packages/tree/main/plugins/release-helper"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: []
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /marketplace\.json\.packages\[0\]\.platforms\.codex requires \.agents\/plugins\/marketplace\.json\.plugins entry named release-helper/
  );
});

test("validator requires git-subdir platform sources to pin a ref", async () => {
  const fixtureRoot = await createFixture(
    "skillsplace-missing-git-ref",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "Marketplace fixture with an unpinned Codex source.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: "https://github.com/example/agent-packages/blob/main/packages/release-helper/manifest.json",
          platforms: {
            codex: {
              type: "plugin",
              path: "https://github.com/example/agent-packages/tree/main/plugins/release-helper"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "git-subdir",
            url: "https://github.com/example/agent-packages.git",
            path: "./plugins/release-helper"
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Productivity"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /\.agents\/plugins\/marketplace\.json\.plugins\[0\]\.source\.ref must be a non-empty string/
  );
});

test("validator rejects Codex URL sources without a portable URL", async () => {
  const fixtureRoot = await createFixture(
    "skillsplace-codex-url-source",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "Marketplace fixture with an unsupported Codex URL source.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: "https://github.com/example/agent-packages/blob/main/packages/release-helper/manifest.json",
          platforms: {
            codex: {
              type: "plugin",
              path: "https://github.com/example/agent-packages/releases/download/v1.2.3/release-helper.tar.gz"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "url"
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Productivity"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /\.agents\/plugins\/marketplace\.json\.plugins\[0\]\.source\.url must be a non-empty string/
  );
});

test("validator rejects machine-local source URLs", async () => {
  const fixtureRoot = await createFixture(
    "skillsplace-local-source-url",
    {
      name: "skillsplace",
      displayName: "Skillsplace Marketplace",
      version: "0.1.0",
      description: "Marketplace fixture with a local source URL.",
      packages: [
        {
          name: "Release Helper",
          slug: "release-helper",
          version: "1.2.3",
          description: "Release workflow package hosted outside this marketplace.",
          manifest: "https://github.com/example/agent-packages/blob/main/packages/release-helper/manifest.json",
          platforms: {
            codex: {
              type: "plugin",
              path: "https://github.com/example/agent-packages/tree/main/plugins/release-helper"
            }
          }
        }
      ]
    },
    {
      name: "skillsplace",
      interface: {
        displayName: "Skillsplace Marketplace"
      },
      plugins: [
        {
          name: "release-helper",
          source: {
            source: "git-subdir",
            url: "file:///Users/example/agent-packages.git",
            path: "./plugins/release-helper",
            ref: "main"
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_INSTALL"
          },
          category: "Productivity"
        }
      ]
    },
    {
      name: "skillsplace",
      owner: {
        name: "jxpeng98"
      },
      plugins: []
    }
  );

  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--root", fixtureRoot]),
    /\.agents\/plugins\/marketplace\.json\.plugins\[0\]\.source\.url must not use file:\/\/ URLs/
  );
});
