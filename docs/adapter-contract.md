# Adapter Contract

The platform-neutral catalog is intentionally small. It should be easy for another agent platform to read without understanding Codex or Claude-specific files.

## Top-Level Marketplace

`marketplace.json` identifies the repository catalog and points to external package metadata or platform-specific sources. Native platform catalogs live beside it:

- Codex: `.agents/plugins/marketplace.json`
- Claude Code: `.claude-plugin/marketplace.json`
- Antigravity: `.antigravity/catalog.json`
- Hermes: `.hermes/marketplace.json`

Required fields:

- `name`: stable kebab-case marketplace identifier.
- `displayName`: human-readable marketplace name.
- `version`: catalog schema/content version.
- `description`: short purpose statement.
- `packages`: package summary list. It can be empty while no entries are published.

## Package Manifest

This catalog-only repository does not store package manifests by default. If an external package exposes its own manifest, point to it from `marketplace.json`.

Required fields:

- `name`, `slug`, `version`, `description`, and `license`.
- `publisher`: maintainer metadata.
- `categories` and `keywords`: discovery metadata.
- `platforms`: platform-specific artifact pointers.
- `security`: plain-language expectations for network, secret, and data access.

## Platform Entry Shape

Each platform entry records how a consumer can find the package:

```json
{
  "type": "plugin",
  "path": "https://github.com/example/agent-packages/tree/main/plugins/release-helper"
}
```

Local paths inside `marketplace.json` are relative to the repository root. Prefer URLs or Git-backed
Codex entries while this repository remains catalog-only. Codex archive URL sources are rejected
because Codex installs plugin directories, not release tarballs. Packages whose source repository does
not contain a complete installable plugin directory should publish a build-generated dist Git ref and
use a `git-subdir` Codex entry pinned to that ref.

## Antigravity Adapter Entries

Antigravity custom plugins require a root `plugin.json` file in the plugin directory. The Antigravity adapter catalog records whether an external source is ready for that native plugin route and whether an Open VSX editor extension is published.

The adapter catalog is metadata for humans and tooling. It is not a claim that Antigravity reads this repository as an official marketplace.

## Hermes Adapter Entries

Hermes installs individual skills from directories that contain `SKILL.md`. The Hermes adapter catalog
therefore lists GitHub skill identifiers for external skill directories instead of Codex or Claude plugin
bundles.

Each entry records the source package and the direct install identifier:

```json
{
  "name": "commit-message",
  "package": "productivity",
  "source": {
    "source": "github",
    "identifier": "jxpeng98/skills/plugins/productivity/skills/commit-message",
    "repo": "jxpeng98/skills",
    "path": "plugins/productivity/skills/commit-message",
    "ref": "main"
  }
}
```

The adapter catalog is metadata for humans and tooling. It does not vendor skill source into this
repository, and it does not by itself register Skillsplace in any Hermes global source index.
