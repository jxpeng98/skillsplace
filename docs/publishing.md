# Publishing Guide

Use this checklist when adding or changing marketplace metadata.

## Catalog-Only Rule

This repository is a marketplace host only. Do not add bundled skills, plugin source trees, hooks, MCP server configs, or executable package artifacts here.

## Entry Checklist

1. Choose a kebab-case slug, for example `release-helper`.
2. Add the package summary to the top-level `marketplace.json`.
3. Add a Codex entry to `.agents/plugins/marketplace.json` when the package should appear in Codex.
4. Add a Claude Code entry to `.claude-plugin/marketplace.json` when the package should appear in Claude Code.
5. Add a `platforms.claude-desktop` entry in `marketplace.json` when the package should expose a Claude Desktop direct plugin ZIP.
6. Add an Antigravity entry to `.antigravity/catalog.json` when the package should advertise Antigravity plugin or extension routes.
7. Add a Hermes entry to `.hermes/marketplace.json` when the package exposes installable external `SKILL.md` directories.
7. Point entries at reviewed external sources, such as a GitHub repo, Git URL, git subdirectory, or pinned release channel.
8. Run `npm run validate`.
9. Review every linked external package for secrets, unexpected commands, shell side effects, and unclear install instructions.

## Codex

Codex reads a repository marketplace from `.agents/plugins/marketplace.json`.

Prefer Git-backed entries for this repository when the upstream package stores the plugin source in a
stable directory:

```json
{
  "name": "external-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example/agent-packages.git",
    "path": "./plugins/external-plugin",
    "ref": "main"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

Do not use release archive URLs for Codex entries. Codex expects an installable plugin directory, so
packages whose source tree is not complete until build time should publish a build-generated dist Git
ref and use a pinned `git-subdir` entry. Qiongli uses refs such as `codex/v1.3.0` with paths like
`./plugins/qiongli` and `./plugins/qiongli-next`.

## Claude Code

Claude Code reads a plugin marketplace from `.claude-plugin/marketplace.json`. The marketplace requires `name`, `owner`, and `plugins`.

Prefer GitHub-backed entries for this repository:

```json
{
  "name": "external-plugin",
  "source": {
    "source": "github",
    "repo": "example/agent-packages",
    "ref": "main"
  },
  "description": "External plugin hosted outside this marketplace."
}
```

Do not add `.claude/skills/<name>/SKILL.md` or local plugin source trees here while this repository remains catalog-only.

## Other Platforms

Use `marketplace.json` as the stable adapter contract. Add a new platform key under `platforms` instead of changing existing Codex or Claude entries.

Claude Desktop direct plugin installs use `platforms.claude-desktop` with `type: "plugin"` and a reviewed release ZIP URL. Keep this separate from `.claude-plugin/marketplace.json`, which is reserved for Claude Code plugin marketplace entries.

## Hermes

Hermes support is recorded in `.hermes/marketplace.json`.

Use Hermes entries only for external directories that contain a `SKILL.md` file:

```json
{
  "name": "commit-message",
  "package": "productivity",
  "version": "0.1.0",
  "description": "Use when the user asks for a Git commit message.",
  "source": {
    "source": "github",
    "identifier": "jxpeng98/skills/plugins/productivity/skills/commit-message",
    "repo": "jxpeng98/skills",
    "path": "plugins/productivity/skills/commit-message",
    "ref": "main"
  },
  "install": {
    "command": "hermes skills install jxpeng98/skills/plugins/productivity/skills/commit-message",
    "source": "github",
    "trust": "community"
  },
  "tags": ["productivity"]
}
```

Do not copy `SKILL.md` files into this repository while it remains catalog-only.

## Antigravity

Antigravity support is recorded in `.antigravity/catalog.json`.

Use the plugin route when the external source is a valid Antigravity plugin directory with a root `plugin.json` file:

```json
{
  "name": "external-plugin",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example/agent-packages.git",
    "path": "plugins/external-plugin",
    "ref": "main"
  },
  "plugin": {
    "status": "ready",
    "requiredRootFile": "plugin.json",
    "workspaceInstallPath": ".agents/plugins/external-plugin",
    "globalInstallPath": "~/.gemini/config/plugins/external-plugin"
  },
  "extension": {
    "status": "not-published",
    "registry": "open-vsx",
    "extensionId": null
  }
}
```

If the package is distributed as an Antigravity Editor extension, publish it to Open VSX and set `extension.status` to `published` with the extension ID.
