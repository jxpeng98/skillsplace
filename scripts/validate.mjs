import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isObject(value)) {
    fail(`${label} must be an object`);
    return {};
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
    return [];
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
    return "";
  }
  return value;
}

function requireKebab(value, label) {
  const text = requireString(value, label);
  if (text && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(text)) {
    fail(`${label} must be kebab-case and at most 64 characters`);
  }
  return text;
}

function requireSemver(value, label) {
  const text = requireString(value, label);
  if (text && !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(text)) {
    fail(`${label} must be semver-like, for example 0.1.0`);
  }
  return text;
}

async function readJson(relPath) {
  const absPath = path.resolve(root, relPath);
  try {
    return JSON.parse(await readFile(absPath, "utf8"));
  } catch (error) {
    fail(`${relPath} is not valid JSON: ${error.message}`);
    return {};
  }
}

async function readText(relPath) {
  const absPath = path.resolve(root, relPath);
  try {
    return await readFile(absPath, "utf8");
  } catch (error) {
    fail(`${relPath} cannot be read: ${error.message}`);
    return "";
  }
}

function existsRel(relPath, label) {
  const normalized = normalizeRel(relPath);
  const absPath = path.resolve(root, normalized);
  if (!absPath.startsWith(root + path.sep) && absPath !== root) {
    fail(`${label} escapes the repository root: ${relPath}`);
    return false;
  }
  if (!existsSync(absPath)) {
    fail(`${label} does not exist: ${normalized}`);
    return false;
  }
  return true;
}

function normalizeRel(relPath) {
  return path.normalize(relPath.replace(/^\.\//, ""));
}

function joinRel(...parts) {
  return normalizeRel(path.join(...parts));
}

function pathFromRoot(relPath) {
  return normalizeRel(relPath);
}

function pathFromManifest(manifestRelPath, targetRelPath) {
  return normalizeRel(path.join(path.dirname(manifestRelPath), targetRelPath));
}

function assertSkillFile(relPath, label) {
  if (!existsRel(relPath, label)) {
    return;
  }

  const textPromise = readText(relPath).then((text) => {
    if (!text.startsWith("---\n")) {
      fail(`${label} must start with YAML frontmatter`);
      return;
    }
    const end = text.indexOf("\n---", 4);
    if (end === -1) {
      fail(`${label} frontmatter is not closed`);
      return;
    }
    const frontmatter = text.slice(4, end);
    if (!/^description:\s*.+$/m.test(frontmatter)) {
      fail(`${label} frontmatter must include description`);
    }
  });

  pending.push(textPromise);
}

const pending = [];

async function validateNeutralMarketplace() {
  const marketplace = requireObject(await readJson("marketplace.json"), "marketplace.json");
  requireKebab(marketplace.name, "marketplace.name");
  requireString(marketplace.displayName, "marketplace.displayName");
  requireSemver(marketplace.version, "marketplace.version");
  requireString(marketplace.description, "marketplace.description");

  const packages = requireArray(marketplace.packages, "marketplace.packages");
  const slugs = new Set();

  for (const [index, entryValue] of packages.entries()) {
    const label = `marketplace.packages[${index}]`;
    const entry = requireObject(entryValue, label);
    const name = requireString(entry.name, `${label}.name`);
    const slug = requireKebab(entry.slug, `${label}.slug`);
    const version = requireSemver(entry.version, `${label}.version`);
    requireString(entry.description, `${label}.description`);
    const manifestPath = requireString(entry.manifest, `${label}.manifest`);

    if (slug) {
      if (slugs.has(slug)) {
        fail(`${label}.slug duplicates ${slug}`);
      }
      slugs.add(slug);
    }

    if (manifestPath && existsRel(manifestPath, `${label}.manifest`)) {
      const manifestRel = pathFromRoot(manifestPath);
      const manifest = requireObject(await readJson(manifestRel), manifestRel);
      if (manifest.name !== name) {
        fail(`${manifestRel}.name must match ${label}.name`);
      }
      if (manifest.slug !== slug) {
        fail(`${manifestRel}.slug must match ${label}.slug`);
      }
      if (manifest.version !== version) {
        fail(`${manifestRel}.version must match ${label}.version`);
      }
      validatePackageManifest(manifest, manifestRel);
    }

    const platforms = requireObject(entry.platforms, `${label}.platforms`);
    for (const [platformName, platformValue] of Object.entries(platforms)) {
      const platform = requireObject(platformValue, `${label}.platforms.${platformName}`);
      requireString(platform.type, `${label}.platforms.${platformName}.type`);
      const platformPath = requireString(platform.path, `${label}.platforms.${platformName}.path`);
      if (platformPath) {
        existsRel(platformPath, `${label}.platforms.${platformName}.path`);
      }
      if (platform.marketplace) {
        existsRel(platform.marketplace, `${label}.platforms.${platformName}.marketplace`);
      }
    }
  }
}

function validatePackageManifest(manifest, manifestRel) {
  requireString(manifest.description, `${manifestRel}.description`);
  requireString(manifest.license, `${manifestRel}.license`);
  requireObject(manifest.publisher, `${manifestRel}.publisher`);
  requireArray(manifest.categories, `${manifestRel}.categories`);
  requireArray(manifest.keywords, `${manifestRel}.keywords`);
  requireObject(manifest.security, `${manifestRel}.security`);

  const platforms = requireObject(manifest.platforms, `${manifestRel}.platforms`);
  for (const [platformName, platformValue] of Object.entries(platforms)) {
    const platform = requireObject(platformValue, `${manifestRel}.platforms.${platformName}`);
    requireString(platform.kind, `${manifestRel}.platforms.${platformName}.kind`);
    const artifactPath = requireString(platform.path, `${manifestRel}.platforms.${platformName}.path`);
    const manifestPath = requireString(platform.manifest, `${manifestRel}.platforms.${platformName}.manifest`);

    if (artifactPath) {
      existsRel(pathFromManifest(manifestRel, artifactPath), `${manifestRel}.platforms.${platformName}.path`);
    }
    if (manifestPath) {
      const resolvedManifest = pathFromManifest(manifestRel, manifestPath);
      existsRel(resolvedManifest, `${manifestRel}.platforms.${platformName}.manifest`);
      if (platform.kind === "skill") {
        assertSkillFile(resolvedManifest, `${manifestRel}.platforms.${platformName}.manifest`);
      }
    }
  }
}

async function validateCodexMarketplace() {
  const marketplaceRel = ".agents/plugins/marketplace.json";
  const codex = requireObject(await readJson(marketplaceRel), marketplaceRel);
  requireKebab(codex.name, `${marketplaceRel}.name`);
  requireObject(codex.interface, `${marketplaceRel}.interface`);
  const entries = requireArray(codex.plugins, `${marketplaceRel}.plugins`);

  for (const [index, entryValue] of entries.entries()) {
    const label = `${marketplaceRel}.plugins[${index}]`;
    const entry = requireObject(entryValue, label);
    const name = requireKebab(entry.name, `${label}.name`);
    const category = requireString(entry.category, `${label}.category`);
    const policy = requireObject(entry.policy, `${label}.policy`);
    const installation = requireString(policy.installation, `${label}.policy.installation`);
    const authentication = requireString(policy.authentication, `${label}.policy.authentication`);
    const source = entry.source;
    let pluginPath = "";

    if (typeof source === "string") {
      pluginPath = source;
    } else {
      const sourceObject = requireObject(source, `${label}.source`);
      const sourceKind = requireString(sourceObject.source, `${label}.source.source`);
      if (!["local", "url", "git-subdir"].includes(sourceKind)) {
        fail(`${label}.source.source must be local, url, or git-subdir`);
      }
      pluginPath = requireString(sourceObject.path, `${label}.source.path`);
    }

    if (installation && !["AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"].includes(installation)) {
      fail(`${label}.policy.installation has unsupported value ${installation}`);
    }
    if (authentication && !["ON_INSTALL", "ON_USE"].includes(authentication)) {
      fail(`${label}.policy.authentication has unsupported value ${authentication}`);
    }
    if (!category) {
      fail(`${label}.category is required`);
    }
    if (pluginPath && !pluginPath.startsWith("./")) {
      fail(`${label}.source.path must start with ./`);
    }

    if (pluginPath && existsRel(pluginPath, `${label}.source.path`)) {
      const pluginRel = pathFromRoot(pluginPath);
      const pluginManifestRel = joinRel(pluginRel, ".codex-plugin/plugin.json");
      const pluginManifest = requireObject(await readJson(pluginManifestRel), pluginManifestRel);
      if (pluginManifest.name !== name) {
        fail(`${pluginManifestRel}.name must match ${label}.name`);
      }
      requireSemver(pluginManifest.version, `${pluginManifestRel}.version`);
      requireString(pluginManifest.description, `${pluginManifestRel}.description`);
      if (pluginManifest.skills) {
        const skillsPath = joinRel(pluginRel, pluginManifest.skills);
        existsRel(skillsPath, `${pluginManifestRel}.skills`);
      }
    }
  }
}

async function validateClaudeSkills() {
  const skillRoot = ".claude/skills";
  if (!existsRel(skillRoot, skillRoot)) {
    return;
  }

  const absSkillRoot = path.resolve(root, skillRoot);
  for (const name of await import("node:fs/promises").then((fs) => fs.readdir(absSkillRoot))) {
    const relPath = joinRel(skillRoot, name, "SKILL.md");
    if (existsSync(path.resolve(root, relPath)) && statSync(path.resolve(root, relPath)).isFile()) {
      assertSkillFile(relPath, relPath);
    } else {
      fail(`${joinRel(skillRoot, name)} must contain SKILL.md`);
    }
  }
}

await validateNeutralMarketplace();
await validateCodexMarketplace();
await validateClaudeSkills();
await Promise.all(pending);

if (errors.length > 0) {
  console.error("Marketplace validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Marketplace validation passed.");
