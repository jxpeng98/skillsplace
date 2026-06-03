# Antigravity Support

Skillsplace can publish Antigravity install metadata, but Antigravity does not currently read a Codex-style or Claude-style GitHub marketplace file from this repository.

Antigravity has two relevant installation routes:

- Plugin route: Antigravity custom plugins are directories with a root `plugin.json` file and optional `skills/`, `rules/`, `mcp_config.json`, and `hooks.json` entries. Custom plugins can be placed at the workspace level in `.agents/plugins/` or `_agents/plugins/`, or globally in `~/.gemini/config/plugins/`.
- Extension route: the Antigravity Editor is based on the VS Code codebase and can install editor extensions from Open VSX.

## Current Catalog

This repository exposes Antigravity adapter metadata at:

```text
.antigravity/catalog.json
```

The catalog entry for `qiongli` points to the external package source:

```text
https://github.com/jxpeng98/qiongli/tree/v0.14.0/plugins/qiongli
```

The entry marks the native Antigravity plugin route as `pending-native-manifest` because `qiongli` still needs a root `plugins/qiongli/plugin.json` file before that folder is a complete Antigravity plugin.

## Enable Native Plugin Installation

In the `jxpeng98/qiongli` repository, add a root Antigravity plugin manifest:

```text
plugins/qiongli/plugin.json
```

Minimal content:

```json
{
  "name": "qiongli"
}
```

After that exists, users can install the plugin by placing the `plugins/qiongli` folder in one of Antigravity's plugin discovery locations:

```text
.agents/plugins/qiongli
~/.gemini/config/plugins/qiongli
```

Skillsplace can keep pointing at the same external source; only the upstream package needs the Antigravity marker file.

## Enable Extension Installation

To install through the Antigravity Editor extension marketplace, publish a VS Code-compatible extension to Open VSX. Once published, update `.antigravity/catalog.json`:

```json
{
  "extension": {
    "status": "published",
    "registry": "open-vsx",
    "extensionId": "publisher.qiongli"
  }
}
```

Until an Open VSX extension is published, the extension route remains `not-published`.

## References

- [Antigravity Plugins](https://antigravity.google/docs/plugins?authuser=2&hl=de)
- [Antigravity Editor](https://antigravity.google/docs/editor)
