# Adapter Contract

The platform-neutral catalog is intentionally small. It should be easy for another agent platform to read without understanding Codex or Claude-specific files.

## Top-Level Marketplace

`marketplace.json` identifies the repository catalog and points to external package metadata or platform-specific sources.

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

Local paths inside `marketplace.json` are relative to the repository root. Prefer URLs or Git-backed Codex entries while this repository remains catalog-only.
