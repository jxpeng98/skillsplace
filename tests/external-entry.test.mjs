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

async function createFixture(name, marketplace, codexMarketplace, claudeMarketplace) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), `${name}-`));
  await mkdir(path.join(fixtureRoot, ".agents/plugins"), { recursive: true });
  await mkdir(path.join(fixtureRoot, ".claude-plugin"), { recursive: true });
  await writeJson(path.join(fixtureRoot, "marketplace.json"), marketplace);
  await writeJson(path.join(fixtureRoot, ".agents/plugins/marketplace.json"), codexMarketplace);
  await writeJson(path.join(fixtureRoot, ".claude-plugin/marketplace.json"), claudeMarketplace);
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
