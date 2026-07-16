import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const scriptUrl = pathToFileURL(path.resolve("scripts/summarize-marketplace-sync.mjs")).href;

function marketplace(packages) {
  return {
    name: "skillsplace",
    displayName: "Skillsplace Marketplace",
    version: "0.1.0",
    description: "Fixture marketplace.",
    packages
  };
}

function pkg(slug, version, extra = {}) {
  return {
    name: slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    slug,
    version,
    description: `${slug} package.`,
    manifest: `https://example.com/${slug}`,
    platforms: {
      claude: {
        type: "plugin",
        path: `https://example.com/${slug}.tar.gz`
      }
    },
    ...extra
  };
}

test("summarizeMarketplaceSync formats a single package bump as the commit subject", async () => {
  const { summarizeMarketplaceSync } = await import(scriptUrl);
  const summary = summarizeMarketplaceSync({
    before: marketplace([pkg("qiongli-next", "1.17.0-beta.2")]),
    after: marketplace([pkg("qiongli-next", "1.18.0-beta.1")]),
    changedFiles: ["marketplace.json", "README.md"]
  });

  assert.equal(summary.commitMessage, "chore: bump qiongli-next to 1.18.0-beta.1");
  assert.equal(summary.prTitle, "chore: bump qiongli-next to 1.18.0-beta.1");
  assert.match(summary.prBody, /qiongli-next: `1\.17\.0-beta\.2` -> `1\.18\.0-beta\.1`/);
  assert.match(summary.prBody, /README\.md/);
  assert.match(summary.stepSummary, /Version Updates/);
});

test("summarizeMarketplaceSync keeps multi-package bumps readable", async () => {
  const { summarizeMarketplaceSync } = await import(scriptUrl);
  const summary = summarizeMarketplaceSync({
    before: marketplace([pkg("qiongli", "1.16.1"), pkg("qiongli-next", "1.17.0-beta.2")]),
    after: marketplace([pkg("qiongli", "1.17.0"), pkg("qiongli-next", "1.18.0-beta.1")]),
    changedFiles: ["marketplace.json", ".claude-plugin/marketplace.json"]
  });

  assert.equal(summary.commitMessage, "chore: bump qiongli to 1.17.0 and qiongli-next to 1.18.0-beta.1");
  assert.match(summary.prBody, /qiongli: `1\.16\.1` -> `1\.17\.0`/);
  assert.match(summary.prBody, /qiongli-next: `1\.17\.0-beta\.2` -> `1\.18\.0-beta\.1`/);
  assert.match(summary.prBody, /marketplace\.json/);
});

test("summarizeMarketplaceSync reports metadata-only syncs without pretending there was a bump", async () => {
  const { summarizeMarketplaceSync } = await import(scriptUrl);
  const summary = summarizeMarketplaceSync({
    before: marketplace([pkg("qiongli-next", "1.18.0-beta.1")]),
    after: marketplace([
      pkg("qiongli-next", "1.18.0-beta.1", {
        description: "Updated package metadata."
      })
    ]),
    changedFiles: ["marketplace.json"]
  });

  assert.equal(summary.commitMessage, "chore: sync marketplace metadata");
  assert.match(summary.prBody, /No package version changes detected/);
  assert.match(summary.prBody, /qiongli-next/);
});
