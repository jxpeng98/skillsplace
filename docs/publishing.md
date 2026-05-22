# Publishing Guide

Use this checklist when adding or changing marketplace metadata.

## Catalog-Only Rule

This repository is a marketplace host only. Do not add bundled skills, plugin source trees, hooks, MCP server configs, or executable package artifacts here.

## Entry Checklist

1. Choose a kebab-case slug, for example `release-helper`.
2. Add the package summary to the top-level `marketplace.json`.
3. Add a Codex entry to `.agents/plugins/marketplace.json` when the package should appear in Codex.
4. Point Codex entries at reviewed external sources, such as a Git URL and pinned `ref` or `sha`.
5. Run `npm run validate`.
6. Review every linked external package for secrets, unexpected commands, shell side effects, and unclear install instructions.

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

Claude Code skills are not bundled in this repository. Reference Claude-compatible package locations in `marketplace.json` until you publish them from a separate repository or managed distribution channel.

Do not add `.claude/skills/<name>/SKILL.md` here while this repository remains catalog-only.

## Other Platforms

Use `marketplace.json` as the stable adapter contract. Add a new platform key under `platforms` instead of changing existing Codex or Claude entries.
