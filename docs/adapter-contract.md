# Adapter Contract

The platform-neutral catalog is intentionally small. It should be easy for another agent platform to read without understanding Codex or Claude-specific files.

## Top-Level Marketplace

`marketplace.json` identifies the repository catalog and points to package manifests.

Required fields:

- `name`: stable kebab-case marketplace identifier.
- `displayName`: human-readable marketplace name.
- `version`: catalog schema/content version.
- `description`: short purpose statement.
- `packages`: package summary list.

## Package Manifest

`packages/<slug>/manifest.json` is the package source of truth.

Required fields:

- `name`, `slug`, `version`, `description`, and `license`.
- `publisher`: maintainer metadata.
- `categories` and `keywords`: discovery metadata.
- `platforms`: platform-specific artifact pointers.
- `security`: plain-language expectations for network, secret, and data access.

## Platform Entry Shape

Each platform entry uses:

```json
{
  "kind": "skill",
  "path": "../../.claude/skills/starter-toolkit",
  "manifest": "../../.claude/skills/starter-toolkit/SKILL.md"
}
```

Paths inside package manifests are relative to the package manifest file. Paths inside `marketplace.json` are relative to the repository root.
