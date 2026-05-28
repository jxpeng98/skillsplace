import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedSlugs = ["qiongli", "productivity", "dev-tools", "writing-tools", "presentation-tools"];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}

test("qiongli remains listed as an external marketplace package", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
  const antigravityCatalog = await readJson(".antigravity/catalog.json");

  assert.deepEqual(marketplace.packages.map((entry) => entry.slug), expectedSlugs);
  assert.deepEqual(codexMarketplace.plugins.map((entry) => entry.name), expectedSlugs);
  assert.deepEqual(claudeMarketplace.plugins.map((entry) => entry.name), expectedSlugs);
  assert.deepEqual(antigravityCatalog.plugins.map((entry) => entry.name), expectedSlugs);

  assert.deepEqual(bySlug(marketplace.packages, "qiongli"), {
    name: "Qiongli",
    slug: "qiongli",
    version: "0.10.1",
    description:
      "Academic paper workflows for planning, literature review, writing, compliance, submission, and research code.",
    manifest: "https://github.com/jxpeng98/qiongli/blob/main/pyproject.toml",
    platforms: {
      codex: {
        type: "plugin",
        path: "https://github.com/jxpeng98/qiongli/tree/main/plugins/qiongli"
      },
      claude: {
        type: "plugin",
        path: "https://github.com/jxpeng98/qiongli/tree/main/plugins/qiongli"
      },
      antigravity: {
        type: "plugin",
        path: "https://github.com/jxpeng98/qiongli/tree/main/plugins/qiongli",
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.antigravity/catalog.json"
      }
    }
  });

  assert.deepEqual(bySlug(codexMarketplace.plugins, "qiongli"), {
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
  });

  assert.deepEqual(bySlug(claudeMarketplace.plugins, "qiongli"), {
    name: "qiongli",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/qiongli.git",
      path: "plugins/qiongli",
      ref: "main"
    },
    description:
      "Academic paper workflows for planning, literature review, writing, compliance, submission, and research code.",
    version: "0.10.1",
    author: {
      name: "Jiaxin Peng"
    },
    homepage: "https://github.com/jxpeng98/qiongli",
    repository: "https://github.com/jxpeng98/qiongli",
    license: "MIT",
    category: "education",
    tags: [
      "research",
      "academic-writing",
      "literature-review"
    ]
  });

  assert.deepEqual(bySlug(antigravityCatalog.plugins, "qiongli"), {
    name: "qiongli",
    version: "0.10.1",
    description:
      "Academic paper workflows for planning, literature review, writing, compliance, submission, and research code.",
    source: {
      source: "git-subdir",
      url: "https://github.com/jxpeng98/qiongli.git",
      path: "plugins/qiongli",
      ref: "main"
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
  });
});
