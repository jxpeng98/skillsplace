import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const SKILLS_REPO = "https://github.com/jxpeng98/skills";
const SKILLS_REPO_GIT = `${SKILLS_REPO}.git`;
const SKILLS_REPO_ID = "jxpeng98/skills";
const SKILLSPLACE_REPO = "https://github.com/jxpeng98/skillsplace";
const DEFAULT_AUTHOR = { name: "Jiaxin Peng" };
const DEFAULT_LICENSE = "MIT";
const REF = "main";
const ANTIGRAVITY_PLUGIN_STATUSES = ["ready", "pending-native-manifest", "not-supported"];
const ANTIGRAVITY_EXTENSION_STATUSES = ["published", "not-published", "not-supported"];
const ANTIGRAVITY_EXTENSION_REGISTRIES = ["open-vsx", "none"];
const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATE_SCRIPT = path.join(REPO_ROOT, "scripts/validate.mjs");

const CATALOGS = {
  marketplace: "marketplace.json",
  codex: ".agents/plugins/marketplace.json",
  claude: ".claude-plugin/marketplace.json",
  antigravity: ".antigravity/catalog.json",
  hermes: ".hermes/marketplace.json"
};

const { sourceRoot, targetRoot } = parseArgs(process.argv.slice(2));
const plugins = await readPluginMetadata(sourceRoot);
await syncCatalogs(targetRoot, plugins);

function parseArgs(args) {
  const sourceRootValue = readArg(args, "--source-root");
  const targetRootValue = readArg(args, "--target-root");

  if (!sourceRootValue || !targetRootValue) {
    throw new Error("Usage: sync-skills-repo.mjs --source-root <path> --target-root <path>");
  }

  return {
    sourceRoot: path.resolve(sourceRootValue),
    targetRoot: path.resolve(targetRootValue)
  };
}

function readArg(args, name) {
  const index = args.lastIndexOf(name);
  if (index === -1) {
    return "";
  }
  return args[index + 1] ?? "";
}

async function readPluginMetadata(root) {
  const pluginsRoot = path.join(root, "plugins");
  const entries = await readdir(pluginsRoot, { withFileTypes: true });

  const plugins = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directoryName = entry.name;
    const metadataPath = path.join(pluginsRoot, directoryName, "skillsplace.json");
    let metadataText;

    try {
      metadataText = await readFile(metadataPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    let metadata;
    try {
      metadata = JSON.parse(metadataText);
    } catch (error) {
      throw new Error(`${metadataPath} is not valid JSON: ${error.message}`);
    }

    const plugin = normalizePluginMetadata(metadata, directoryName, metadataPath);
    plugin.hermesSkills = await readHermesSkills(path.join(pluginsRoot, directoryName), plugin);
    plugins.push(plugin);
  }

  return plugins.sort((left, right) => left.slug.localeCompare(right.slug));
}

async function readHermesSkills(pluginRoot, plugin) {
  const skillsRoot = path.join(pluginRoot, "skills");
  let entries;

  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) {
      continue;
    }

    const skillDirectory = entry.name;
    const skillPath = path.join(skillsRoot, skillDirectory, "SKILL.md");
    let text;
    try {
      text = await readFile(skillPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const frontmatter = parseSkillFrontmatter(text, skillPath);
    const name = requireKebab(frontmatter.name ?? skillDirectory, `${skillPath}.name`);
    const description = requireString(frontmatter.description, `${skillPath}.description`);

    skills.push({
      name,
      directory: skillDirectory,
      package: plugin.slug,
      version: plugin.version,
      description,
      tags: plugin.tags
    });
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

function parseSkillFrontmatter(text, label) {
  if (!text.startsWith("---\n")) {
    throw new Error(`${label} must start with YAML frontmatter`);
  }

  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error(`${label} frontmatter is not closed`);
  }

  const metadata = {};
  const frontmatter = text.slice(4, end);
  for (const line of frontmatter.split("\n")) {
    const match = /^(name|description):\s*(.*)$/.exec(line);
    if (match) {
      metadata[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return metadata;
}

function normalizePluginMetadata(metadata, directoryName, metadataPath) {
  requireObject(metadata, `${metadataPath}`);

  if (metadata.slug !== directoryName) {
    throw new Error(`${metadataPath}: slug must match plugin directory name`);
  }

  const slug = requireKebab(metadata.slug, `${metadataPath}.slug`);
  const name = requireString(metadata.name, `${metadataPath}.name`);
  const version = requireSemver(metadata.version, `${metadataPath}.version`);
  const description = requireString(metadata.description, `${metadataPath}.description`);
  const manifest = requireRelativePath(metadata.manifest, `${metadataPath}.manifest`);
  const category = requireObject(metadata.category, `${metadataPath}.category`);
  const platforms = requireObject(metadata.platforms ?? {}, `${metadataPath}.platforms`);
  const tags = metadata.tags === undefined ? [] : requireStringArray(metadata.tags, `${metadataPath}.tags`);

  return {
    name,
    slug,
    version,
    description,
    manifest: normalizeRel(manifest),
    category: {
      codex: requireString(category.codex, `${metadataPath}.category.codex`),
      claude: requireString(category.claude, `${metadataPath}.category.claude`)
    },
    tags,
    author: normalizeAuthor(metadata.author, `${metadataPath}.author`),
    homepage: normalizePortableString(metadata.homepage, `${metadataPath}.homepage`, SKILLS_REPO),
    repository: normalizePortableString(metadata.repository, `${metadataPath}.repository`, SKILLS_REPO),
    license: metadata.license === undefined
      ? DEFAULT_LICENSE
      : requireString(metadata.license, `${metadataPath}.license`),
    platforms: normalizePlatforms(platforms, metadataPath)
  };
}

function normalizeAuthor(value, label) {
  if (value === undefined) {
    return DEFAULT_AUTHOR;
  }

  const author = requireObject(value, label);
  return {
    name: requireString(author.name, `${label}.name`)
  };
}

function normalizePortableString(value, label, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const text = requireString(value, label);
  const normalized = text.replace(/\\/g, "/");
  if (
    /^file:\/\//i.test(normalized) ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.startsWith("/") ||
    normalized.startsWith("~/")
  ) {
    throw new Error(`${label} must not be a local absolute path, file:// URL, or ~/ path`);
  }
  return text;
}

function normalizePlatforms(platforms, metadataPath) {
  const normalized = {
    codex: platforms.codex === true,
    claude: platforms.claude === true,
    antigravity: undefined
  };

  if (platforms.antigravity !== undefined) {
    const antigravity = requireObject(platforms.antigravity, `${metadataPath}.platforms.antigravity`);
    const extension = antigravity.extension === undefined
      ? {}
      : requireObject(antigravity.extension, `${metadataPath}.platforms.antigravity.extension`);
    const extensionStatus = normalizeEnum(
      extension.status,
      `${metadataPath}.platforms.antigravity.extension.status`,
      ANTIGRAVITY_EXTENSION_STATUSES,
      "not-published"
    );
    const extensionId = normalizeNullableString(
      extension.extensionId,
      `${metadataPath}.platforms.antigravity.extension.extensionId`
    );

    if (extensionStatus === "published" && extensionId === null) {
      throw new Error(
        `${metadataPath}.platforms.antigravity.extension.extensionId ` +
          "must be a non-empty string when extension.status is published"
      );
    }

    normalized.antigravity = {
      status: normalizeEnum(
        antigravity.status,
        `${metadataPath}.platforms.antigravity.status`,
        ANTIGRAVITY_PLUGIN_STATUSES,
        "pending-native-manifest"
      ),
      requiredRootFile: antigravity.requiredRootFile === undefined
        ? "plugin.json"
        : requireRelativePath(antigravity.requiredRootFile, `${metadataPath}.platforms.antigravity.requiredRootFile`),
      extension: {
        status: extensionStatus,
        registry: normalizeEnum(
          extension.registry,
          `${metadataPath}.platforms.antigravity.extension.registry`,
          ANTIGRAVITY_EXTENSION_REGISTRIES,
          "open-vsx"
        ),
        extensionId
      }
    };
  }

  return normalized;
}

function normalizeEnum(value, label, allowedValues, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const text = requireString(value, label);
  if (!allowedValues.includes(text)) {
    throw new Error(`${label} must be one of ${allowedValues.join(", ")}`);
  }
  return text;
}

function normalizeNullableString(value, label) {
  if (value === undefined || value === null) {
    return null;
  }
  return requireString(value, label);
}

async function syncCatalogs(root, plugins) {
  const marketplace = await readJson(path.join(root, CATALOGS.marketplace));
  const codex = await readJson(path.join(root, CATALOGS.codex));
  const claude = await readJson(path.join(root, CATALOGS.claude));
  const antigravity = await readJson(path.join(root, CATALOGS.antigravity));
  const hermes = await readJson(path.join(root, CATALOGS.hermes));

  marketplace.packages = [
    ...requireArray(marketplace.packages, `${CATALOGS.marketplace}.packages`).filter((entry) => !isManagedPackage(entry)),
    ...plugins.map(toMarketplacePackage)
  ];
  codex.plugins = [
    ...requireArray(codex.plugins, `${CATALOGS.codex}.plugins`).filter((entry) => !isManagedSource(entry.source)),
    ...plugins.filter((plugin) => plugin.platforms.codex).map(toCodexEntry)
  ];
  claude.plugins = [
    ...requireArray(claude.plugins, `${CATALOGS.claude}.plugins`).filter((entry) => !isManagedSource(entry.source)),
    ...plugins.filter((plugin) => plugin.platforms.claude).map(toClaudeEntry)
  ];
  antigravity.plugins = [
    ...requireArray(antigravity.plugins, `${CATALOGS.antigravity}.plugins`).filter((entry) => !isManagedSource(entry.source)),
    ...plugins.filter((plugin) => plugin.platforms.antigravity).map(toAntigravityEntry)
  ];
  hermes.skills = [
    ...requireArray(hermes.skills, `${CATALOGS.hermes}.skills`).filter((entry) => !isManagedHermesSource(entry.source)),
    ...plugins.flatMap((plugin) => plugin.hermesSkills.map((skill) => toHermesEntry(plugin, skill)))
  ];

  validateMergedCatalogs({ marketplace, codex, claude, antigravity, hermes });
  await validateMergedCatalogFiles({ marketplace, codex, claude, antigravity, hermes });

  await writeJson(path.join(root, CATALOGS.marketplace), marketplace);
  await writeJson(path.join(root, CATALOGS.codex), codex);
  await writeJson(path.join(root, CATALOGS.claude), claude);
  await writeJson(path.join(root, CATALOGS.antigravity), antigravity);
  await writeJson(path.join(root, CATALOGS.hermes), hermes);
}

async function validateMergedCatalogFiles(catalogs) {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "skillsplace-sync-validate-"));

  try {
    await writeJsonInRoot(tempRoot, CATALOGS.marketplace, catalogs.marketplace);
    await writeJsonInRoot(tempRoot, CATALOGS.codex, catalogs.codex);
    await writeJsonInRoot(tempRoot, CATALOGS.claude, catalogs.claude);
    if (catalogs.antigravity) {
      await writeJsonInRoot(tempRoot, CATALOGS.antigravity, catalogs.antigravity);
    }
    if (catalogs.hermes) {
      await writeJsonInRoot(tempRoot, CATALOGS.hermes, catalogs.hermes);
    }

    await execFileAsync(process.execPath, [VALIDATE_SCRIPT, "--root", tempRoot], {
      cwd: REPO_ROOT,
      maxBuffer: 1024 * 1024 * 10
    });
  } catch (error) {
    const details = [error.stderr, error.stdout, error.message].filter(Boolean).join("\n").trim();
    throw new Error(
      "Merged catalog validation failed before writing target catalogs" +
        (details ? `:\n${details}` : "")
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeJsonInRoot(root, relPath, value) {
  const absPath = path.join(root, relPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeJson(absPath, value);
}

function validateMergedCatalogs({ marketplace, codex, claude, antigravity, hermes }) {
  const packages = requireArray(marketplace.packages, `${CATALOGS.marketplace}.packages`);
  const codexPlugins = requireArray(codex.plugins, `${CATALOGS.codex}.plugins`);
  const claudePlugins = requireArray(claude.plugins, `${CATALOGS.claude}.plugins`);
  const antigravityPlugins = antigravity
    ? requireArray(antigravity.plugins, `${CATALOGS.antigravity}.plugins`)
    : [];
  const hermesSkills = hermes ? requireArray(hermes.skills, `${CATALOGS.hermes}.skills`) : [];

  assertUniqueKey(packages, "slug", `${CATALOGS.marketplace}.packages`);
  const codexNames = assertUniqueKey(codexPlugins, "name", `${CATALOGS.codex}.plugins`);
  const claudeNames = assertUniqueKey(claudePlugins, "name", `${CATALOGS.claude}.plugins`);
  const antigravityNames = antigravity
    ? assertUniqueKey(antigravityPlugins, "name", `${CATALOGS.antigravity}.plugins`)
    : new Map();
  const hermesPackages = hermes ? indexHermesPackages(hermesSkills, `${CATALOGS.hermes}.skills`) : new Map();
  if (antigravity) {
    validateMergedAntigravityEntries(antigravityPlugins);
  }

  const declared = {
    codex: new Set(),
    claude: new Set(),
    antigravity: new Set(),
    hermes: new Set()
  };

  for (const [index, entry] of packages.entries()) {
    const label = `${CATALOGS.marketplace}.packages[${index}]`;
    const slug = requireString(entry?.slug, `${label}.slug`);
    const platforms = requireObject(entry?.platforms, `${label}.platforms`);

    requireDeclaredPlatform(platforms, "codex", slug, codexNames, declared.codex, label);
    requireDeclaredPlatform(platforms, "claude", slug, claudeNames, declared.claude, label);
    requireDeclaredPlatform(platforms, "antigravity", slug, antigravityNames, declared.antigravity, label);
    requireDeclaredHermesPackage(platforms, slug, hermesPackages, declared.hermes, label);
  }

  rejectUndeclaredPlatformEntries(codexNames, declared.codex, `${CATALOGS.codex}.plugins`, "codex");
  rejectUndeclaredPlatformEntries(claudeNames, declared.claude, `${CATALOGS.claude}.plugins`, "claude");
  if (antigravity) {
    rejectUndeclaredPlatformEntries(
      antigravityNames,
      declared.antigravity,
      `${CATALOGS.antigravity}.plugins`,
      "antigravity"
    );
  }
  if (hermes) {
    rejectUndeclaredHermesPackages(hermesPackages, declared.hermes, `${CATALOGS.hermes}.skills`);
  }
}

function validateMergedAntigravityEntries(entries) {
  for (const [index, entry] of entries.entries()) {
    const label = `${CATALOGS.antigravity}.plugins[${index}]`;
    requireObject(entry?.plugin, `${label}.plugin`);
    const extension = requireObject(entry?.extension, `${label}.extension`);
    const status = requireString(extension.status, `${label}.extension.status`);

    if (status === "published") {
      requireString(extension.extensionId, `${label}.extension.extensionId`);
    }
  }
}

function assertUniqueKey(entries, key, label) {
  const seen = new Map();

  for (const [index, entry] of entries.entries()) {
    const value = requireString(entry?.[key], `${label}[${index}].${key}`);
    if (seen.has(value)) {
      throw new Error(
        `${label}[${index}].${key} duplicates ${value} from ${label}[${seen.get(value)}]`
      );
    }
    seen.set(value, index);
  }

  return seen;
}

function requireDeclaredPlatform(platforms, platformName, slug, platformNames, declared, packageLabel) {
  if (platforms[platformName] === undefined) {
    return;
  }

  declared.add(slug);
  if (!platformNames.has(slug)) {
    throw new Error(
      `${packageLabel}.platforms.${platformName} declares ${slug}, ` +
        `but ${platformName} catalog entry is missing`
    );
  }
}

function rejectUndeclaredPlatformEntries(platformNames, declared, platformLabel, platformName) {
  for (const [name, index] of platformNames.entries()) {
    if (!declared.has(name)) {
      throw new Error(
        `${platformLabel}[${index}].name ${name} is missing from marketplace.json platforms.${platformName}`
      );
    }
  }
}

function indexHermesPackages(entries, label) {
  const index = new Map();
  const names = new Set();

  for (const [entryIndex, entry] of entries.entries()) {
    const name = requireString(entry?.name, `${label}[${entryIndex}].name`);
    if (names.has(name)) {
      throw new Error(`${label}[${entryIndex}].name duplicates ${name}`);
    }
    names.add(name);

    const packageName = requireString(entry?.package, `${label}[${entryIndex}].package`);
    const values = index.get(packageName) ?? [];
    values.push(entryIndex);
    index.set(packageName, values);
  }

  return index;
}

function requireDeclaredHermesPackage(platforms, slug, hermesPackages, declared, packageLabel) {
  if (platforms.hermes === undefined) {
    return;
  }

  declared.add(slug);
  if (!hermesPackages.has(slug)) {
    throw new Error(`${packageLabel}.platforms.hermes declares ${slug}, but Hermes catalog entry is missing`);
  }
}

function rejectUndeclaredHermesPackages(hermesPackages, declared, label) {
  for (const [packageName, indexes] of hermesPackages.entries()) {
    if (!declared.has(packageName)) {
      for (const index of indexes) {
        throw new Error(`${label}[${index}].package ${packageName} is missing from marketplace.json platforms.hermes`);
      }
    }
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toMarketplacePackage(plugin) {
  const packageEntry = {
    name: plugin.name,
    slug: plugin.slug,
    version: plugin.version,
    description: plugin.description,
    manifest: `${pluginWebPath(plugin.slug)}/${plugin.manifest}`,
    platforms: {}
  };

  if (plugin.platforms.codex) {
    packageEntry.platforms.codex = {
      type: "plugin",
      path: pluginWebPath(plugin.slug),
      marketplace: `${SKILLSPLACE_REPO}/blob/main/${CATALOGS.codex}`
    };
  }

  if (plugin.platforms.claude) {
    packageEntry.platforms.claude = {
      type: "plugin",
      path: pluginWebPath(plugin.slug),
      marketplace: `${SKILLSPLACE_REPO}/blob/main/${CATALOGS.claude}`
    };
  }

  if (plugin.platforms.antigravity) {
    packageEntry.platforms.antigravity = {
      type: "plugin",
      path: pluginWebPath(plugin.slug),
      marketplace: `${SKILLSPLACE_REPO}/blob/main/${CATALOGS.antigravity}`
    };
  }

  if (plugin.hermesSkills.length > 0) {
    packageEntry.platforms.hermes = {
      type: "adapter",
      path: `${pluginWebPath(plugin.slug)}/skills`,
      marketplace: `${SKILLSPLACE_REPO}/blob/main/${CATALOGS.hermes}`
    };
  }

  return packageEntry;
}

function toCodexEntry(plugin) {
  return {
    name: plugin.slug,
    source: {
      source: "git-subdir",
      url: SKILLS_REPO_GIT,
      path: `./plugins/${plugin.slug}`,
      ref: REF
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: plugin.category.codex
  };
}

function toClaudeEntry(plugin) {
  return {
    name: plugin.slug,
    source: {
      source: "git-subdir",
      url: SKILLS_REPO_GIT,
      path: `plugins/${plugin.slug}`,
      ref: REF
    },
    description: plugin.description,
    version: plugin.version,
    author: plugin.author,
    homepage: plugin.homepage,
    repository: plugin.repository,
    license: plugin.license,
    category: plugin.category.claude,
    tags: plugin.tags
  };
}

function toAntigravityEntry(plugin) {
  const extension = plugin.platforms.antigravity.extension;

  return {
    name: plugin.slug,
    version: plugin.version,
    description: plugin.description,
    source: {
      source: "git-subdir",
      url: SKILLS_REPO_GIT,
      path: `plugins/${plugin.slug}`,
      ref: REF
    },
    plugin: {
      status: plugin.platforms.antigravity.status,
      requiredRootFile: plugin.platforms.antigravity.requiredRootFile,
      workspaceInstallPath: `.agents/plugins/${plugin.slug}`,
      globalInstallPath: `~/.gemini/config/plugins/${plugin.slug}`
    },
    extension: {
      status: extension.status,
      registry: extension.registry,
      extensionId: extension.extensionId
    }
  };
}

function toHermesEntry(plugin, skill) {
  const identifier = hermesIdentifier(plugin.slug, skill.directory);

  return {
    name: skill.name,
    package: plugin.slug,
    version: plugin.version,
    description: skill.description,
    source: {
      source: "github",
      identifier,
      repo: SKILLS_REPO_ID,
      path: `plugins/${plugin.slug}/skills/${skill.directory}`,
      ref: REF
    },
    install: {
      command: `hermes skills install ${identifier}`,
      source: "github",
      trust: "community"
    },
    tags: plugin.tags
  };
}

function pluginWebPath(slug) {
  return `${SKILLS_REPO}/tree/main/plugins/${slug}`;
}

function hermesIdentifier(pluginSlug, skillDirectory) {
  return `${SKILLS_REPO_ID}/plugins/${pluginSlug}/skills/${skillDirectory}`;
}

function isManagedPackage(entry) {
  const slug = entry?.slug;
  if (!isKebabString(slug)) {
    return false;
  }

  const basePath = pluginWebPath(slug);
  return typeof entry.manifest === "string" && entry.manifest.startsWith(`${basePath}/`);
}

function isManagedSource(source) {
  if (!source || typeof source !== "object") {
    return false;
  }
  if (source.source !== "git-subdir" || source.url !== SKILLS_REPO_GIT || source.ref !== REF) {
    return false;
  }

  return managedPluginPath(source.path) !== "";
}

function isManagedHermesSource(source) {
  return (
    source &&
    typeof source === "object" &&
    source.source === "github" &&
    source.repo === SKILLS_REPO_ID &&
    typeof source.path === "string" &&
    source.path.startsWith("plugins/") &&
    source.path.includes("/skills/")
  );
}

function managedPluginPath(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = normalizeRel(value);
  const parts = normalized.split("/");
  if (parts.length !== 2 || parts[0] !== "plugins" || !isKebabString(parts[1])) {
    return "";
  }

  return normalized;
}

function isKebabString(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
  return value;
}

function requireKebab(value, label) {
  const text = requireString(value, label);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(text)) {
    throw new Error(`${label} must be kebab-case and at most 64 characters`);
  }
  return text;
}

function requireSemver(value, label) {
  const text = requireString(value, label);
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(text)) {
    throw new Error(`${label} must be semver-like, for example 0.1.0`);
  }
  return text;
}

function requireRelativePath(value, label) {
  const text = requireString(value, label);
  const slashNormalized = text.replace(/\\/g, "/");
  const normalized = normalizeRel(text);
  if (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(slashNormalized) ||
    /^[A-Za-z]:\//.test(slashNormalized) ||
    slashNormalized.startsWith("/") ||
    slashNormalized.startsWith("~/") ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`${label} must be a repository-relative path`);
  }
  return text;
}

function normalizeRel(value) {
  return path.posix.normalize(value.replace(/\\/g, "/").replace(/^\.\//, ""));
}
