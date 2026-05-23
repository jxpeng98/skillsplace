# Publishing Guide

Use this checklist when adding or changing marketplace metadata.

## Catalog-Only Rule

This repository is a marketplace host only. Do not add bundled skills, plugin source trees, hooks, MCP server configs, or executable package artifacts here.

## Entry Checklist

1. Choose a kebab-case slug, for example `release-helper`.
2. Add the package summary to the top-level `marketplace.json`.
3. Add a Codex entry to `.agents/plugins/marketplace.json` when the package should appear in Codex.
4. Add a Claude Code entry to `.claude-plugin/marketplace.json` when the package should appear in Claude Code.
5. Add an Antigravity entry to `.antigravity/catalog.json` when the package should advertise Antigravity plugin or extension routes.
6. Point entries at reviewed external sources, such as a GitHub repo, Git URL, git subdirectory, or pinned release channel.
7. Run `npm run validate`.
8. Review every linked external package for secrets, unexpected commands, shell side effects, and unclear install instructions.

## Codex

Codex reads a repository marketplace from `.agents/plugins/marketplace.json`.

Prefer Git-backed entries for this repository:

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
