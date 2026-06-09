import { readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO = "https://github.com/jxpeng98/qiongli";
const REPO_GIT = `${REPO}.git`;
const API_RELEASES = "https://api.github.com/repos/jxpeng98/qiongli/releases";
const SKILLSPLACE = "https://github.com/jxpeng98/skillsplace/blob/main";
const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHOR = { name: "Jiaxin Peng" };
const LICENSE = "MIT";
const BASE_TAGS = ["research", "academic-writing", "literature-review"];
const QIONGLI_DESCRIPTION =
  "Academic paper workflows for planning, literature review, writing, compliance, submission, and research code.";
const NEXT_DESCRIPTION =
  "Pre-release Qiongli channel for testing the restructured package layout before it becomes the stable marketplace entry.";
const NEXT_SLUG = "qiongli-next";
const NEXT_CODEX_PLUGIN_PATH = "packages/qiongli-next-plugin";
const NEXT_GIT_BACKED_MIN_VERSION = "1.1.0-beta.6";

const SUBJECT_METADATA = {
  "qiongli-core": {
    name: "Qiongli Core",
    description: "General-purpose Qiongli academic workflow across paper types and methods."
  },
  "qiongli-economics": {
    name: "Qiongli Economics",
    description: "Economics-focused empirical, theory, and reproducibility workflow."
  },
  "qiongli-accounting": {
    name: "Qiongli Accounting",
    description: "Accounting-focused archival, disclosure, audit, and measurement workflow."
  },
  "qiongli-business": {
    name: "Qiongli Business",
    description:
      "Business-focused management, strategy, organization, marketing, and operations workflow for doctoral-level journal manuscripts."
  },
  "qiongli-finance": {
    name: "Qiongli Finance",
    description:
      "Finance-focused corporate finance, asset pricing, market microstructure, and risk workflow for doctoral-level journal manuscripts."
  },
  "qiongli-economics-accounting": {
    name: "Qiongli Economics + Accounting",
    description:
      "Cross-disciplinary economics and accounting workflow for archival, causal, and reporting-setting research."
  },
  "qiongli-political-economy": {
    name: "Qiongli Political Economy",
    description:
      "Political economy workflow for institutions, mechanisms, distribution, and comparative political-economic analysis."
  },
  "qiongli-geoeconomics": {
    name: "Qiongli Geoeconomics",
    description:
      "Geoeconomics workflow for statecraft, sanctions, supply chains, strategic competition, and global political economy."
  }
};

const SUBJECT_ORDER = Object.keys(SUBJECT_METADATA);

function parseArgs(args) {
  const rootIndex = args.indexOf("--root");
  const dryRun = args.includes("--dry-run");
  return {
    root: rootIndex === -1 ? DEFAULT_ROOT : path.resolve(args[rootIndex + 1] ?? ""),
    dryRun
  };
}

async function readJson(root, relPath) {
  return JSON.parse(await readFile(path.join(root, relPath), "utf8"));
}

async function writeJson(root, relPath, value, dryRun) {
  if (dryRun) {
    return;
  }
  await writeFile(path.join(root, relPath), `${JSON.stringify(value, null, 2)}\n`);
}

function stripTag(tagName) {
  return tagName.replace(/^v/, "");
}

function parseSemver(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? ""
  };
}

function compareIdentifier(left, right) {
  const leftNumber = /^\d+$/.test(left);
  const rightNumber = /^\d+$/.test(right);
  if (leftNumber && rightNumber) {
    return Number(left) - Number(right);
  }
  if (leftNumber) {
    return -1;
  }
  if (rightNumber) {
    return 1;
  }
  return left.localeCompare(right);
}

function compareSemver(leftVersion, rightVersion) {
  const left = parseSemver(leftVersion);
  const right = parseSemver(rightVersion);
  if (!left || !right) {
    return 0;
  }
  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }
  if (!left.prerelease && right.prerelease) {
    return 1;
  }
  if (left.prerelease && !right.prerelease) {
    return -1;
  }
  const leftParts = left.prerelease.split(".");
  const rightParts = right.prerelease.split(".");
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    if (leftParts[index] === undefined) {
      return -1;
    }
    if (rightParts[index] === undefined) {
      return 1;
    }
    const compared = compareIdentifier(leftParts[index], rightParts[index]);
    if (compared !== 0) {
      return compared;
    }
  }
  return 0;
}

function hasClaudePluginAsset(release, slug) {
  const version = stripTag(release.tag_name ?? "");
  const names = new Set((release.assets ?? []).map((asset) => asset.name));
  return names.has(`${slug}-claude-plugin-v${version}.tar.gz`);
}

function hasGitBackedQiongliNextSource(release) {
  const version = stripTag(release.tag_name ?? "");
  return compareSemver(version, NEXT_GIT_BACKED_MIN_VERSION) >= 0;
}

export function selectLatestQiongliReleases(releases) {
  const candidates = releases.filter(
    (release) =>
      release &&
      !release.draft &&
      parseSemver(release.tag_name) &&
      Array.isArray(release.assets)
  );

  const byVersionDesc = (left, right) => compareSemver(right.tag_name, left.tag_name);
  return {
    stable:
      candidates
        .filter((release) => !release.prerelease && hasClaudePluginAsset(release, "qiongli"))
        .sort(byVersionDesc)[0] ?? null,
    prerelease:
      candidates
        .filter(
          (release) =>
            release.prerelease &&
            hasClaudePluginAsset(release, NEXT_SLUG) &&
            hasGitBackedQiongliNextSource(release)
        )
        .sort(byVersionDesc)[0] ?? null
  };
}

function releaseAssetsBySlug(release) {
  const version = stripTag(release.tag_name);
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^(.+)-(codex|claude)-plugin-v${escapedVersion}\\.tar\\.gz$`);
  const slugs = new Map();

  for (const asset of release.assets ?? []) {
    const match = pattern.exec(asset.name);
    if (!match) {
      continue;
    }
    const [, slug, platform] = match;
    if (!slug.startsWith("qiongli")) {
      continue;
    }
    const entry = slugs.get(slug) ?? {};
    entry[platform] = asset.browser_download_url;
    slugs.set(slug, entry);
  }

  return slugs;
}

function orderedSubjectSlugs(assetMap) {
  const slugs = [...assetMap.keys()].filter(
    (slug) => slug !== "qiongli" && slug !== NEXT_SLUG && assetMap.get(slug).claude
  );
  const known = SUBJECT_ORDER.filter((slug) => slugs.includes(slug));
  const unknown = slugs.filter((slug) => !SUBJECT_ORDER.includes(slug)).sort();
  return [...known, ...unknown];
}

function titleFromSlug(slug) {
  return slug
    .replace(/^qiongli-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function subjectMetadata(slug) {
  return (
    SUBJECT_METADATA[slug] ?? {
      name: `Qiongli ${titleFromSlug(slug)}`,
      description: `Qiongli ${titleFromSlug(slug)} focused academic workflow.`
    }
  );
}

function isQiongliSlug(slug) {
  return slug === "qiongli" || slug === "qiongli-next" || slug.startsWith("qiongli-");
}

function marketplacePackage(slug, name, version, description, manifest, platforms) {
  return {
    name,
    slug,
    version,
    description,
    manifest,
    platforms
  };
}

function qiongliNextCodexPluginUrl(version) {
  return `${REPO}/tree/v${version}/${NEXT_CODEX_PLUGIN_PATH}`;
}

function qiongliNextMarketplacePackage(version, claudeUrl) {
  const codexPath = qiongliNextCodexPluginUrl(version);
  return {
    name: "Qiongli Next",
    slug: NEXT_SLUG,
    version,
    description: NEXT_DESCRIPTION,
    manifest: codexPath,
    platforms: {
      codex: {
        type: "plugin",
        path: codexPath,
        marketplace: `${SKILLSPLACE}/.agents/plugins/marketplace.json`
      },
      claude: {
        type: "plugin",
        path: claudeUrl,
        marketplace: `${SKILLSPLACE}/.claude-plugin/marketplace.json`
      }
    }
  };
}

function codexEntry(name, ref) {
  return {
    name,
    source: {
      source: "git-subdir",
      url: REPO_GIT,
      path: "./plugins/qiongli",
      ref
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
    name: NEXT_SLUG,
    source: {
      source: "git-subdir",
      url: REPO_GIT,
      path: `./${NEXT_CODEX_PLUGIN_PATH}`,
      ref: `v${version}`
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Education"
  };
}

function claudeEntry(name, url, description, version, tags) {
  return {
    name,
    source: {
      source: "url",
      url
    },
    description,
    version,
    author: AUTHOR,
    homepage: REPO,
    repository: REPO,
    license: LICENSE,
    category: "education",
    tags
  };
}

function buildQiongliEntries(stableRelease, prereleaseRelease) {
  const stableVersion = stripTag(stableRelease.tag_name);
  const stableAssets = releaseAssetsBySlug(stableRelease);
  const stableCore = stableAssets.get("qiongli");
  const prereleaseVersion = stripTag(prereleaseRelease.tag_name);
  const prereleaseCore = releaseAssetsBySlug(prereleaseRelease).get(NEXT_SLUG);

  if (!stableCore?.claude) {
    throw new Error(`${stableRelease.tag_name} is missing the qiongli Claude plugin asset`);
  }
  if (!prereleaseCore?.claude) {
    throw new Error(`${prereleaseRelease.tag_name} is missing the qiongli-next pre-release Claude plugin asset`);
  }

  const subjects = orderedSubjectSlugs(stableAssets).map((slug) => {
    const metadata = subjectMetadata(slug);
    const assets = stableAssets.get(slug);
    return {
      slug,
      version: stableVersion,
      name: metadata.name,
      description: metadata.description,
      claudeUrl: assets.claude
    };
  });

  const stableCodexPath = `${REPO}/tree/v${stableVersion}/plugins/qiongli`;

  return {
    stableVersion,
    prereleaseVersion,
    marketplace: [
      marketplacePackage("qiongli", "Qiongli", stableVersion, QIONGLI_DESCRIPTION, stableCodexPath, {
        codex: {
          type: "plugin",
          path: stableCodexPath,
          marketplace: `${SKILLSPLACE}/.agents/plugins/marketplace.json`
        },
        claude: {
          type: "plugin",
          path: stableCore.claude,
          marketplace: `${SKILLSPLACE}/.claude-plugin/marketplace.json`
        },
        antigravity: {
          type: "plugin",
          path: stableCodexPath,
          marketplace: `${SKILLSPLACE}/.antigravity/catalog.json`
        }
      }),
      qiongliNextMarketplacePackage(prereleaseVersion, prereleaseCore.claude),
      ...subjects.map((subject) =>
        marketplacePackage(subject.slug, subject.name, subject.version, subject.description, subject.claudeUrl, {
          claude: {
            type: "plugin",
            path: subject.claudeUrl,
            marketplace: `${SKILLSPLACE}/.claude-plugin/marketplace.json`
          }
        })
      )
    ],
    codex: [codexEntry("qiongli", `v${stableVersion}`), qiongliNextCodexEntry(prereleaseVersion)],
    claude: [
      claudeEntry("qiongli", stableCore.claude, QIONGLI_DESCRIPTION, stableVersion, BASE_TAGS),
      claudeEntry("qiongli-next", prereleaseCore.claude, NEXT_DESCRIPTION, prereleaseVersion, [...BASE_TAGS, "pre-release"]),
      ...subjects.map((subject) =>
        claudeEntry(subject.slug, subject.claudeUrl, subject.description, subject.version, [...BASE_TAGS, "subject-package"])
      )
    ],
    antigravity: {
      name: "qiongli",
      version: stableVersion,
      description: QIONGLI_DESCRIPTION,
      source: {
        source: "git-subdir",
        url: `${REPO}.git`,
        path: "plugins/qiongli",
        ref: `v${stableVersion}`
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
  };
}

export async function syncQiongliReleases({ root = DEFAULT_ROOT, releases, dryRun = false } = {}) {
  const allReleases = releases ?? (await fetchQiongliReleases());
  const selected = selectLatestQiongliReleases(allReleases);
  if (!selected.stable) {
    throw new Error("No stable Qiongli release with a Claude plugin asset was found");
  }
  if (!selected.prerelease) {
    throw new Error("No Qiongli pre-release with a Claude plugin asset was found");
  }

  const generated = buildQiongliEntries(selected.stable, selected.prerelease);
  const marketplace = await readJson(root, "marketplace.json");
  marketplace.packages = [
    ...generated.marketplace,
    ...marketplace.packages.filter((entry) => !isQiongliSlug(entry.slug))
  ];

  const codex = await readJson(root, ".agents/plugins/marketplace.json");
  codex.plugins = [
    ...generated.codex,
    ...codex.plugins.filter((entry) => !isQiongliSlug(entry.name))
  ];

  const claude = await readJson(root, ".claude-plugin/marketplace.json");
  claude.plugins = [
    ...generated.claude,
    ...claude.plugins.filter((entry) => !isQiongliSlug(entry.name))
  ];

  const antigravity = await readJson(root, ".antigravity/catalog.json");
  antigravity.plugins = [
    generated.antigravity,
    ...antigravity.plugins.filter((entry) => entry.name !== "qiongli")
  ];

  await writeJson(root, "marketplace.json", marketplace, dryRun);
  await writeJson(root, ".agents/plugins/marketplace.json", codex, dryRun);
  await writeJson(root, ".claude-plugin/marketplace.json", claude, dryRun);
  await writeJson(root, ".antigravity/catalog.json", antigravity, dryRun);

  return {
    stableVersion: generated.stableVersion,
    prereleaseVersion: generated.prereleaseVersion,
    subjectCount: generated.marketplace.length - 2
  };
}

export async function fetchQiongliReleases() {
  const headers = {
    "User-Agent": "skillsplace-qiongli-release-sync",
    Accept: "application/vnd.github+json"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return new Promise((resolve, reject) => {
    const request = https.get(
      API_RELEASES,
      {
        headers
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GitHub releases request failed with HTTP ${response.statusCode}: ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`GitHub releases response is not valid JSON: ${error.message}`));
          }
        });
      }
    );
    request.on("error", reject);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { root, dryRun } = parseArgs(process.argv.slice(2));
  const result = await syncQiongliReleases({ root, dryRun });
  const action = dryRun ? "Checked" : "Updated";
  console.log(
    `${action} Qiongli marketplace entries: stable ${result.stableVersion}, pre-release ${result.prereleaseVersion}, ${result.subjectCount} subject packages.`
  );
}
