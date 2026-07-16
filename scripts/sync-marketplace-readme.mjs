import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QIONGLI_REPO = "https://github.com/jxpeng98/qiongli";
const SKILLS_REPO = "https://github.com/jxpeng98/skills";
const TABLE_HEADER = "| Package | Version | Source | Platforms | Description |";
const TABLE_SEPARATOR = "| --- | --- | --- | --- | --- |";
const PLATFORM_ORDER = ["codex", "claude", "claude-desktop", "antigravity", "hermes"];
const PLATFORM_LABELS = {
  codex: "Codex",
  claude: "Claude Code",
  "claude-desktop": "Claude Desktop",
  antigravity: "Antigravity",
  hermes: "Hermes"
};

function parseArgs(args) {
  const rootIndex = args.indexOf("--root");
  return {
    root: rootIndex === -1 ? DEFAULT_ROOT : path.resolve(args[rootIndex + 1] ?? ""),
    dryRun: args.includes("--dry-run")
  };
}

function markdownCell(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function platformLabel(platform) {
  return (
    PLATFORM_LABELS[platform] ??
    platform
      .split("-")
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(" ")
  );
}

function readmePlatformList(platforms = {}) {
  const platformNames = Object.keys(platforms);
  const orderedPlatforms = [
    ...PLATFORM_ORDER.filter((platform) => platformNames.includes(platform)),
    ...platformNames.filter((platform) => !PLATFORM_ORDER.includes(platform))
  ];
  return orderedPlatforms.map(platformLabel).join(", ");
}

function readmeSource(entry) {
  const manifest = entry.manifest ?? "";
  if (manifest.includes("github.com/jxpeng98/qiongli")) {
    const label = entry.slug === "qiongli-next" ? "`qiongli` pre-release" : "`qiongli` release";
    return `[${label}](${QIONGLI_REPO}/releases/tag/v${entry.version})`;
  }
  if (manifest.includes("github.com/jxpeng98/skills")) {
    return `[\`jxpeng98/skills\`](${SKILLS_REPO})`;
  }
  return manifest ? `[package source](${manifest})` : "Not provided";
}

export function marketplaceReadmeRow(entry) {
  return [
    `| \`${markdownCell(entry.slug)}\``,
    `\`${markdownCell(entry.version)}\``,
    readmeSource(entry),
    markdownCell(readmePlatformList(entry.platforms)),
    `${markdownCell(entry.description)} |`
  ].join(" | ");
}

export function renderMarketplaceReadme(readme, packages) {
  const lines = readme.split("\n");
  const headerIndex = lines.findIndex((line) => line.trim() === TABLE_HEADER);
  if (headerIndex === -1 || lines[headerIndex + 1]?.trim() !== TABLE_SEPARATOR) {
    throw new Error("README.md marketplace table header was not found");
  }

  let tableEnd = headerIndex + 2;
  while (tableEnd < lines.length && lines[tableEnd].trim().startsWith("|")) {
    tableEnd += 1;
  }

  const rows = packages.map(marketplaceReadmeRow);
  return [
    ...lines.slice(0, headerIndex + 2),
    ...rows,
    ...lines.slice(tableEnd)
  ].join("\n");
}

export async function syncMarketplaceReadme({
  root = DEFAULT_ROOT,
  marketplace,
  dryRun = false
} = {}) {
  const catalog =
    marketplace ??
    JSON.parse(await readFile(path.join(root, "marketplace.json"), "utf8"));
  const readmePath = path.join(root, "README.md");
  const readme = await readFile(readmePath, "utf8");
  const nextReadme = renderMarketplaceReadme(readme, catalog.packages ?? []);
  const changed = nextReadme !== readme;

  if (changed && !dryRun) {
    await writeFile(readmePath, nextReadme);
  }

  return {
    changed,
    packageCount: catalog.packages?.length ?? 0
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await syncMarketplaceReadme(parseArgs(process.argv.slice(2)));
  const action = result.changed ? "Updated" : "Checked";
  console.log(`${action} README marketplace table with ${result.packageCount} packages.`);
}
