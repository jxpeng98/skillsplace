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
const expectedCodexSlugs = ["qiongli", "qiongli-next", "productivity", "dev-tools", "writing-tools", "presentation-tools"];
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

function qiongliCodexArtifact(version) {
  return releaseAsset("qiongli", "codex", version);
}

function qiongliCodexPluginPath(version) {
  return version.startsWith("0.") ? "plugins/qiongli" : "packages/qiongli-plugin";
}

function qiongliCodexPlatform(version) {
  return {
    type: "plugin",
    path: qiongliCodexArtifact(version),
    marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
  };
}

function qiongliNextCodexArtifact(version) {
  return releaseAsset("qiongli-next", "codex", version);
}

function qiongliNextCodexPlatform(version) {
  return {
    type: "plugin",
    path: qiongliNextCodexArtifact(version),
    marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.agents/plugins/marketplace.json"
  };
}

function qiongliCodexEntry(name, version) {
  return {
    name,
    source: {
      source: "url",
      url: qiongliCodexArtifact(version)
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Education"
  };
}

function qiongliNextCodexEntry(version) {
  return {
    name: "qiongli-next",
    source: {
      source: "url",
      url: qiongliNextCodexArtifact(version)
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Education"
  };
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
  assert.ok(bySlug(marketplace.packages, "qiongli-next"), "expected marketplace slug qiongli-next");
  assert.ok(bySlug(claudeMarketplace.plugins, "qiongli-next"), "expected Claude plugin qiongli-next");

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
    manifest: qiongliCodexArtifact(qiongliVersion),
    platforms: {
      codex: qiongliCodexPlatform(qiongliVersion),
      claude: {
        type: "plugin",
        path: releaseAsset("qiongli", "claude", qiongliVersion),
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
      },
      antigravity: {
        type: "plugin",
        path: `https://github.com/jxpeng98/qiongli/tree/v${qiongliVersion}/${qiongliCodexPluginPath(qiongliVersion)}`,
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.antigravity/catalog.json"
      }
    }
  });

  assert.deepEqual(bySlug(codexMarketplace.plugins, "qiongli"), qiongliCodexEntry("qiongli", qiongliVersion));

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
      path: qiongliCodexPluginPath(qiongliVersion),
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

test("qiongli pre-release is exposed through an explicit release-archive next channel", async () => {
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
    manifest: qiongliNextCodexArtifact(qiongliPrereleaseVersion),
    platforms: {
      codex: qiongliNextCodexPlatform(qiongliPrereleaseVersion),
      claude: {
        type: "plugin",
        path: releaseAsset("qiongli-next", "claude", qiongliPrereleaseVersion),
        marketplace: "https://github.com/jxpeng98/skillsplace/blob/main/.claude-plugin/marketplace.json"
      }
    }
  });

  assert.deepEqual(bySlug(codexMarketplace.plugins, "qiongli-next"), qiongliNextCodexEntry(qiongliPrereleaseVersion));

  assert.deepEqual(bySlug(claudeMarketplace.plugins, "qiongli-next"), {
    name: "qiongli-next",
    source: {
      source: "url",
      url: releaseAsset("qiongli-next", "claude", qiongliPrereleaseVersion)
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

test("qiongli subject packages are listed as Claude release artifact installs", async () => {
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
