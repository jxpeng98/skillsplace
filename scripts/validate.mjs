import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = resolveRoot(process.argv.slice(2));
const errors = [];

function resolveRoot(args) {
  const rootIndex = args.indexOf("--root");
  if (rootIndex === -1) {
    return defaultRoot;
  }

  const value = args[rootIndex + 1];
  if (!value) {
    console.error("Missing value for --root");
    process.exit(1);
  }

  return path.resolve(value);
}

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
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
    return [];
  }
  return value;
}

function requireNonEmptyArray(value, label) {
  const items = requireArray(value, label);
  if (items.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
  return items;
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

function requireEnum(value, allowedValues, label) {
  const text = requireString(value, label);
  if (text && !allowedValues.includes(text)) {
    fail(`${label} has unsupported value ${text}`);
  }
  return text;
}

function requirePortableReference(value, label, options = {}) {
  const text = requireString(value, label);
  if (!text) {
    return text;
  }

  const normalized = text.replace(/\\/g, "/");
  if (/^file:\/\//i.test(normalized)) {
    fail(`${label} must not use file:// URLs`);
  }
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/")) {
    fail(`${label} must not use a local absolute path`);
  }
  if (normalized.startsWith("~/") && !options.allowHomePath) {
    fail(`${label} must not use a user home path`);
  }
  return text;
}

function indexByName(entries, label) {
  const index = new Map();
  for (const [entryIndex, entryValue] of entries.entries()) {
    const entry = requireObject(entryValue, `${label}[${entryIndex}]`);
    const name = requireString(entry.name, `${label}[${entryIndex}].name`);
    if (!name) {
      continue;
    }
    if (index.has(name)) {
      fail(`${label}[${entryIndex}].name duplicates ${name}`);
      continue;
    }
    index.set(name, { entry, index: entryIndex });
  }
  return index;
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
  return path.posix.normalize(relPath.replace(/\\/g, "/").replace(/^\.\//, ""));
}

function isExternalRef(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
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
    const manifestPath = requirePortableReference(entry.manifest, `${label}.manifest`);

    if (slug) {
      if (slugs.has(slug)) {
        fail(`${label}.slug duplicates ${slug}`);
      }
      slugs.add(slug);
    }

    if (manifestPath && !isExternalRef(manifestPath) && existsRel(manifestPath, `${label}.manifest`)) {
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
      const platformPath = requirePortableReference(platform.path, `${label}.platforms.${platformName}.path`);
      if (platformPath && !isExternalRef(platformPath)) {
        existsRel(platformPath, `${label}.platforms.${platformName}.path`);
      }
      if (platform.marketplace && !isExternalRef(platform.marketplace)) {
        const marketplacePath = requirePortableReference(
          platform.marketplace,
          `${label}.platforms.${platformName}.marketplace`
        );
        existsRel(marketplacePath, `${label}.platforms.${platformName}.marketplace`);
      } else if (platform.marketplace) {
        requirePortableReference(platform.marketplace, `${label}.platforms.${platformName}.marketplace`);
      }
    }
  }
}

function validatePackageManifest(manifest, manifestRel) {
  requireString(manifest.description, `${manifestRel}.description`);
  requireString(manifest.license, `${manifestRel}.license`);
  requireObject(manifest.publisher, `${manifestRel}.publisher`);
  requireNonEmptyArray(manifest.categories, `${manifestRel}.categories`);
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
    let sourceKind = "local";
    let pluginPath = "";

    if (typeof source === "string") {
      pluginPath = requirePortableReference(source, `${label}.source`);
    } else {
      const sourceObject = requireObject(source, `${label}.source`);
      sourceKind = requireString(sourceObject.source, `${label}.source.source`);
      if (!["local", "url", "git-subdir"].includes(sourceKind)) {
        fail(`${label}.source.source must be local, url, or git-subdir`);
      }
      if (sourceKind === "local" || sourceKind === "git-subdir") {
        pluginPath = requirePortableReference(sourceObject.path, `${label}.source.path`);
      } else if (sourceObject.path !== undefined) {
        pluginPath = requirePortableReference(sourceObject.path, `${label}.source.path`);
      }
      if (sourceKind !== "local") {
        requirePortableReference(sourceObject.url, `${label}.source.url`);
      }
      if (sourceKind === "git-subdir") {
        requireString(sourceObject.ref, `${label}.source.ref`);
      }
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
    if (pluginPath && !pluginPath.startsWith("./") && !isExternalRef(pluginPath)) {
      fail(`${label}.source.path must start with ./`);
    }

    if (pluginPath && sourceKind === "local" && existsRel(pluginPath, `${label}.source.path`)) {
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

async function validateClaudeMarketplace() {
  const marketplaceRel = ".claude-plugin/marketplace.json";
  const claude = requireObject(await readJson(marketplaceRel), marketplaceRel);
  requireKebab(claude.name, `${marketplaceRel}.name`);
  const owner = requireObject(claude.owner, `${marketplaceRel}.owner`);
  requireString(owner.name, `${marketplaceRel}.owner.name`);
  if (claude.version !== undefined) {
    requireSemver(claude.version, `${marketplaceRel}.version`);
  }
  if (claude.description !== undefined) {
    requireString(claude.description, `${marketplaceRel}.description`);
  }

  const entries = requireArray(claude.plugins, `${marketplaceRel}.plugins`);
  const names = new Set();

  for (const [index, entryValue] of entries.entries()) {
    const label = `${marketplaceRel}.plugins[${index}]`;
    const entry = requireObject(entryValue, label);
    const name = requireKebab(entry.name, `${label}.name`);
    const source = entry.source;

    if (name) {
      if (names.has(name)) {
        fail(`${label}.name duplicates ${name}`);
      }
      names.add(name);
    }

    if (typeof source === "string") {
      requirePortableReference(source, `${label}.source`);
      if (!source.startsWith("./") && !isExternalRef(source)) {
        fail(`${label}.source must be a ./ path or external URL`);
      }
      if (source.startsWith("./")) {
        existsRel(source, `${label}.source`);
      }
    } else {
      const sourceObject = requireObject(source, `${label}.source`);
      const sourceKind = requireString(sourceObject.source, `${label}.source.source`);
      if (!["github", "url", "git-subdir", "npm"].includes(sourceKind)) {
        fail(`${label}.source.source must be github, url, git-subdir, or npm`);
      }
      if (sourceKind === "github") {
        requireString(sourceObject.repo, `${label}.source.repo`);
        requireString(sourceObject.ref, `${label}.source.ref`);
      }
      if (sourceKind === "url") {
        requirePortableReference(sourceObject.url, `${label}.source.url`);
      }
      if (sourceKind === "git-subdir") {
        requirePortableReference(sourceObject.url, `${label}.source.url`);
        requirePortableReference(sourceObject.path, `${label}.source.path`);
        requireString(sourceObject.ref, `${label}.source.ref`);
      }
      if (sourceKind === "npm") {
        requireString(sourceObject.package, `${label}.source.package`);
      }
    }
  }
}

async function validateClaudeSkills() {
  const skillRoot = ".claude/skills";
  const absSkillRoot = path.resolve(root, skillRoot);
  if (!existsSync(absSkillRoot)) {
    return;
  }

  for (const name of await import("node:fs/promises").then((fs) => fs.readdir(absSkillRoot))) {
    const relPath = joinRel(skillRoot, name, "SKILL.md");
    if (existsSync(path.resolve(root, relPath)) && statSync(path.resolve(root, relPath)).isFile()) {
      assertSkillFile(relPath, relPath);
    } else {
      fail(`${joinRel(skillRoot, name)} must contain SKILL.md`);
    }
  }
}

async function validateAntigravityCatalog() {
  const catalogRel = ".antigravity/catalog.json";
  if (!existsSync(path.resolve(root, catalogRel))) {
    return;
  }

  const catalog = requireObject(await readJson(catalogRel), catalogRel);
  requireKebab(catalog.name, `${catalogRel}.name`);
  requireString(catalog.displayName, `${catalogRel}.displayName`);
  requireSemver(catalog.version, `${catalogRel}.version`);
  requireString(catalog.description, `${catalogRel}.description`);

  const entries = requireArray(catalog.plugins, `${catalogRel}.plugins`);
  const names = new Set();

  for (const [index, entryValue] of entries.entries()) {
    const label = `${catalogRel}.plugins[${index}]`;
    const entry = requireObject(entryValue, label);
    const name = requireKebab(entry.name, `${label}.name`);
    requireSemver(entry.version, `${label}.version`);
    requireString(entry.description, `${label}.description`);

    if (name) {
      if (names.has(name)) {
        fail(`${label}.name duplicates ${name}`);
      }
      names.add(name);
    }

    const source = requireObject(entry.source, `${label}.source`);
    const sourceKind = requireEnum(source.source, ["local", "url", "git-subdir"], `${label}.source.source`);
    if (sourceKind === "local") {
      const sourcePath = requirePortableReference(source.path, `${label}.source.path`);
      if (sourcePath && existsRel(sourcePath, `${label}.source.path`)) {
        existsRel(joinRel(sourcePath, "plugin.json"), `${label}.source.plugin.json`);
      }
    }
    if (sourceKind === "url") {
      requirePortableReference(source.url, `${label}.source.url`);
    }
    if (sourceKind === "git-subdir") {
      requirePortableReference(source.url, `${label}.source.url`);
      requirePortableReference(source.path, `${label}.source.path`);
      requireString(source.ref, `${label}.source.ref`);
    }

    const plugin = requireObject(entry.plugin, `${label}.plugin`);
    requireEnum(plugin.status, ["ready", "pending-native-manifest", "not-supported"], `${label}.plugin.status`);
    requireString(plugin.requiredRootFile, `${label}.plugin.requiredRootFile`);
    requireString(plugin.workspaceInstallPath, `${label}.plugin.workspaceInstallPath`);
    requireString(plugin.globalInstallPath, `${label}.plugin.globalInstallPath`);

    const extension = requireObject(entry.extension, `${label}.extension`);
    const extensionStatus = requireEnum(
      extension.status,
      ["published", "not-published", "not-supported"],
      `${label}.extension.status`
    );
    requireEnum(extension.registry, ["open-vsx", "none"], `${label}.extension.registry`);
    if (extensionStatus === "published") {
      requireString(extension.extensionId, `${label}.extension.extensionId`);
    } else if (extension.extensionId !== null && extension.extensionId !== undefined) {
      requireString(extension.extensionId, `${label}.extension.extensionId`);
    }
  }
}

async function validatePlatformCatalogSync() {
  const marketplaceRel = "marketplace.json";
  const codexRel = ".agents/plugins/marketplace.json";
  const claudeRel = ".claude-plugin/marketplace.json";
  const antigravityRel = ".antigravity/catalog.json";

  const marketplace = requireObject(await readJson(marketplaceRel), marketplaceRel);
  const codex = requireObject(await readJson(codexRel), codexRel);
  const claude = requireObject(await readJson(claudeRel), claudeRel);
  const antigravityExists = existsSync(path.resolve(root, antigravityRel));
  const antigravity = antigravityExists ? requireObject(await readJson(antigravityRel), antigravityRel) : null;

  const codexIndex = indexByName(requireArray(codex.plugins, `${codexRel}.plugins`), `${codexRel}.plugins`);
  const claudeIndex = indexByName(requireArray(claude.plugins, `${claudeRel}.plugins`), `${claudeRel}.plugins`);
  const antigravityIndex = antigravity
    ? indexByName(requireArray(antigravity.plugins, `${antigravityRel}.plugins`), `${antigravityRel}.plugins`)
    : new Map();

  const declared = {
    codex: new Set(),
    claude: new Set(),
    antigravity: new Set()
  };

  for (const [packageIndex, entryValue] of requireArray(marketplace.packages, `${marketplaceRel}.packages`).entries()) {
    const label = `${marketplaceRel}.packages[${packageIndex}]`;
    const entry = requireObject(entryValue, label);
    const slug = requireKebab(entry.slug, `${label}.slug`);
    const platforms = requireObject(entry.platforms, `${label}.platforms`);

    if (!slug) {
      continue;
    }

    requirePlatformEntry(platforms, "codex", slug, codexIndex, `${codexRel}.plugins`, declared.codex, label);
    requirePlatformEntry(platforms, "claude", slug, claudeIndex, `${claudeRel}.plugins`, declared.claude, label);

    if (platforms.antigravity !== undefined && !antigravityExists) {
      fail(`${label}.platforms.antigravity requires ${antigravityRel}`);
    }
    requirePlatformEntry(
      platforms,
      "antigravity",
      slug,
      antigravityIndex,
      `${antigravityRel}.plugins`,
      declared.antigravity,
      label
    );
  }

  forbidUndeclaredPlatformEntries(codexIndex, declared.codex, `${codexRel}.plugins`, "codex");
  forbidUndeclaredPlatformEntries(claudeIndex, declared.claude, `${claudeRel}.plugins`, "claude");
  if (antigravityExists) {
    forbidUndeclaredPlatformEntries(antigravityIndex, declared.antigravity, `${antigravityRel}.plugins`, "antigravity");
  }
}

function requirePlatformEntry(platforms, platformName, slug, platformIndex, platformLabel, declared, packageLabel) {
  if (platforms[platformName] === undefined) {
    return;
  }

  declared.add(slug);
  if (!platformIndex.has(slug)) {
    fail(`${packageLabel}.platforms.${platformName} requires ${platformLabel} entry named ${slug}`);
  }
}

function forbidUndeclaredPlatformEntries(platformIndex, declared, platformLabel, platformName) {
  for (const [name, value] of platformIndex.entries()) {
    if (!declared.has(name)) {
      fail(`${platformLabel}[${value.index}].name must be declared in marketplace.json platforms.${platformName}`);
    }
  }
}

await validateNeutralMarketplace();
await validateCodexMarketplace();
await validateClaudeMarketplace();
await validateClaudeSkills();
await validateAntigravityCatalog();
await validatePlatformCatalogSync();
await Promise.all(pending);

if (errors.length > 0) {
  console.error("Marketplace validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Marketplace validation passed.");
