import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qiongliDescription =
  "Academic paper workflows for planning, literature review, writing, compliance, submission, and research code.";
const qiongliNextDescription =
  "Pre-release Qiongli channel for testing the restructured package layout before it becomes the stable marketplace entry.";
const expectedMarketplaceAndClaudeSlugs = [
  "qiongli",
  "qiongli-next",
  "productivity",
  "dev-tools",
  "writing-tools",
  "presentation-tools"
];
const expectedCodexSlugs = ["qiongli", "productivity", "dev-tools", "writing-tools", "presentation-tools"];
const expectedAntigravitySlugs = ["qiongli", "productivity", "dev-tools", "writing-tools", "presentation-tools"];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function bySlug(entries, slug) {
  return entries.find((entry) => entry.slug === slug || entry.name === slug);
}

function releaseAsset(slug, platform, version) {
  return (
    "https://github.com/jxpeng98/qiongli/releases/download/v" +
    version +
    "/" +
    slug +
    "-" +
    platform +
    "-plugin-v" +
    version +
    ".tar.gz"
  );
}

function qiongliSubjectPackages(packages) {
  return packages.filter((entry) => entry.slug.startsWith("qiongli-") && entry.slug !== "qiongli-next");
}

test("qiongli remains listed as an external marketplace package", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
  const antigravityCatalog = await readJson(".antigravity/catalog.json");

  for (const slug of expectedMarketplaceAndClaudeSlugs) {
    assert.ok(bySlug(marketplace.packages, slug), `expected marketplace slug ${slug}`);
    assert.ok(bySlug(claudeMarketplace.plugins, slug), `expected Claude plugin ${slug}`);
  }

  for (const slug of expectedCodexSlugs) {
    assert.ok(bySlug(codexMarketplace.plugins, slug), `expected Codex plugin ${slug}`);
  }

  for (const slug of expectedAntigravitySlugs) {
    assert.ok(bySlug(antigravityCatalog.plugins, slug), `expected Antigravity plugin ${slug}`);
  }

  const qiongliVersion = bySlug(marketplace.packages, "qiongli").version;
  assert.match(qiongliVersion, /^\d+\.\d+\.\d+$/);

  assert.deepEqual(bySlug(marketplace.packages, "qiongli"), {
    name: "Qiongli",
    slug: "qiongli",
    version: qiongliVersion,
    description: qiongliDescription,
    manifest: `https://github.com/jxpeng98/qiongli/tree/v${qiongliVersion}/plugins/qiongli`,
    platforms: {
      codex: {
        type: "plugin",
        path: `https://github.com/jxpeng98/qiongli/tree/v${qiongliVersion}/plugins/qiongli`,
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
      },
      claude: {
        type: "plugin",
        path: releaseAsset("qiongli", "claude", qiongliVersion),
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
      },
      antigravity: {
        type: "plugin",
        path: `https://github.com/jxpeng98/qiongli/tree/v${qiongliVersion}/plugins/qiongli`,
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
      ref: `v${qiongliVersion}`
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
      source: "url",
      url: releaseAsset("qiongli", "claude", qiongliVersion)
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
      ref: `v${qiongliVersion}`
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

test("qiongli pre-release is exposed through an explicit next channel", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");

  const qiongliPrereleaseVersion = bySlug(marketplace.packages, "qiongli-next").version;
  assert.match(qiongliPrereleaseVersion, /^\d+\.\d+\.\d+-[0-9A-Za-z.-]+$/);

  assert.deepEqual(bySlug(marketplace.packages, "qiongli-next"), {
    name: "Qiongli Next",
    slug: "qiongli-next",
    version: qiongliPrereleaseVersion,
    description: qiongliNextDescription,
    manifest: releaseAsset("qiongli", "claude", qiongliPrereleaseVersion),
    platforms: {
      claude: {
        type: "plugin",
        path: releaseAsset("qiongli", "claude", qiongliPrereleaseVersion),
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
      }
    }
  });

  assert.equal(bySlug(codexMarketplace.plugins, "qiongli-next"), undefined);

  assert.deepEqual(bySlug(claudeMarketplace.plugins, "qiongli-next"), {
    name: "qiongli-next",
    source: {
      source: "url",
      url: releaseAsset("qiongli", "claude", qiongliPrereleaseVersion)
    },
    description: qiongliNextDescription,
    version: qiongliPrereleaseVersion,
    author: {
      name: "Jiaxin Peng"
    },
    homepage: "https://github.com/jxpeng98/qiongli",
    repository: "https://github.com/jxpeng98/qiongli",
    license: "MIT",
    category: "education",
    tags: ["research", "academic-writing", "literature-review", "pre-release"]
  });
});

test("qiongli subject packages are listed as release artifact installs", async () => {
  const marketplace = await readJson("marketplace.json");
  const codexMarketplace = await readJson(".agents/plugins/marketplace.json");
  const claudeMarketplace = await readJson(".claude-plugin/marketplace.json");
  const subjectPackages = qiongliSubjectPackages(marketplace.packages);

  for (const subject of subjectPackages) {
    assert.equal(subject.manifest, releaseAsset(subject.slug, "claude", subject.version));
    assert.deepEqual(subject.platforms, {
      claude: {
        type: "plugin",
        path: releaseAsset(subject.slug, "claude", subject.version),
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
      }
    });

    assert.equal(bySlug(codexMarketplace.plugins, subject.slug), undefined);

    assert.deepEqual(bySlug(claudeMarketplace.plugins, subject.slug), {
      name: subject.slug,
      source: {
        source: "url",
        url: releaseAsset(subject.slug, "claude", subject.version)
      },
      description: subject.description,
      version: subject.version,
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

  assert.ok(subjectPackages.length > 0, "expected at least one Qiongli subject package");
});
