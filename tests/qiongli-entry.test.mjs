import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qiongliVersion = "0.13.0";
const qiongliDescription =
  "Academic paper workflows for planning, literature review, writing, compliance, submission, and research code.";
const expectedMarketplaceSlugs = [
  "qiongli",
  "qiongli-core",
  "qiongli-economics",
  "qiongli-accounting",
  "qiongli-business",
  "qiongli-finance",
  "qiongli-economics-accounting",
  "productivity",
  "dev-tools",
  "writing-tools",
  "presentation-tools"
];
const expectedAntigravitySlugs = ["qiongli", "productivity", "dev-tools", "writing-tools", "presentation-tools"];
const subjectPackages = [
  {
    slug: "qiongli-core",
    name: "Qiongli Core",
    description: "General-purpose Qiongli academic workflow across paper types and methods."
  },
  {
    slug: "qiongli-economics",
    name: "Qiongli Economics",
    description: "Economics-focused empirical, theory, and reproducibility workflow."
  },
  {
    slug: "qiongli-accounting",
    name: "Qiongli Accounting",
    description: "Accounting-focused archival, disclosure, audit, and measurement workflow."
  },
  {
    slug: "qiongli-business",
    name: "Qiongli Business",
    description:
      "Business-focused management, strategy, organization, marketing, and operations workflow for doctoral-level journal manuscripts."
  },
  {
    slug: "qiongli-finance",
    name: "Qiongli Finance",
    description:
      "Finance-focused corporate finance, asset pricing, market microstructure, and risk workflow for doctoral-level journal manuscripts."
  },
  {
    slug: "qiongli-economics-accounting",
    name: "Qiongli Economics + Accounting",
    description:
      "Cross-disciplinary economics and accounting workflow for archival, causal, and reporting-setting research."
  }
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}

function releaseAsset(slug, platform) {
  return (
    "https://github.com/jxpeng98/qiongli/releases/download/v" +
    qiongliVersion +
    "/" +
    slug +
    "-" +
    platform +
    "-plugin-v" +
    qiongliVersion +
    ".tar.gz"
  );
}

test("qiongli remains listed as an external marketplace package", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
  const antigravityCatalog = await readJson(".antigravity/catalog.json");

  for (const slug of expectedMarketplaceSlugs) {
    assert.ok(bySlug(marketplace.packages, slug), `expected marketplace slug ${slug}`);
    assert.ok(bySlug(codexMarketplace.plugins, slug), `expected Codex plugin ${slug}`);
    assert.ok(bySlug(claudeMarketplace.plugins, slug), `expected Claude plugin ${slug}`);
  }

  for (const slug of expectedAntigravitySlugs) {
    assert.ok(bySlug(antigravityCatalog.plugins, slug), `expected Antigravity plugin ${slug}`);
  }

  assert.deepEqual(bySlug(marketplace.packages, "qiongli"), {
    name: "Qiongli",
    slug: "qiongli",
    version: qiongliVersion,
    description: qiongliDescription,
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
    description: qiongliDescription,
    version: qiongliVersion,
    author: {
      name: "Jiaxin Peng"
    },
    homepage: "https://github.com/jxpeng98/qiongli",
    repository: "https://github.com/jxpeng98/qiongli",
    license: "MIT",
    category: "education",
    tags: ["research", "academic-writing", "literature-review"]
  });

  assert.deepEqual(bySlug(antigravityCatalog.plugins, "qiongli"), {
    name: "qiongli",
    version: qiongliVersion,
    description: qiongliDescription,
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

test("qiongli subject packages are listed as release artifact installs", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");

  for (const subject of subjectPackages) {
    assert.deepEqual(bySlug(marketplace.packages, subject.slug), {
      name: subject.name,
      slug: subject.slug,
      version: qiongliVersion,
      description: subject.description,
      manifest: releaseAsset(subject.slug, "codex"),
      platforms: {
        codex: {
          type: "plugin",
          path: releaseAsset(subject.slug, "codex"),
          marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
        },
        claude: {
          type: "plugin",
          path: releaseAsset(subject.slug, "claude"),
          marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
        }
      }
    });

    assert.deepEqual(bySlug(codexMarketplace.plugins, subject.slug), {
      name: subject.slug,
      source: {
        source: "url",
        url: releaseAsset(subject.slug, "codex")
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL"
      },
      category: "Education"
    });

    assert.deepEqual(bySlug(claudeMarketplace.plugins, subject.slug), {
      name: subject.slug,
      source: {
        source: "url",
        url: releaseAsset(subject.slug, "claude")
      },
      description: subject.description,
      version: qiongliVersion,
      author: {
        name: "Jiaxin Peng"
      },
      homepage: "https://github.com/jxpeng98/qiongli",
      repository: "https://github.com/jxpeng98/qiongli",
      license: "MIT",
      category: "education",
      tags: ["research", "academic-writing", "literature-review", "subject-package"]
    });
  }
});
