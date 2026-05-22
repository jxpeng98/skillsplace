# Skillsplace Marketplace

Skillsplace is a repository for hosting marketplace metadata for Codex, Claude Code, and compatible agent platforms.

This repository is catalog-only. It does not ship bundled skills, plugins, hooks, scripts, or platform artifacts. Add entries that point to packages hosted elsewhere, or extend the catalog structure when you are ready to publish installable artifacts from separate repositories.

It keeps two catalog layers separate:

- `marketplace.json`: platform-neutral catalog for humans, tooling, and future adapters.
- `.agents/plugins/marketplace.json`: Codex-native plugin marketplace.

## Quick Start

Validate the repository:

```bash
npm run validate
```

Use it locally with Codex:

```bash
codex plugin marketplace add ./path/to/skillsplace
```

After the repository is pushed to GitHub, Codex can also add it by repository source:

```bash
codex plugin marketplace add OWNER/REPO
```

Claude Code does not consume a marketplace file directly from this repository. Keep Claude-facing references in the platform-neutral `marketplace.json` until you publish a separate package repository or managed skill distribution.

## Repository Layout

```text
.
├── marketplace.json
├── .agents/plugins/marketplace.json
├── schemas/
├── scripts/validate.mjs
├── tests/
└── docs/
```

## Adding Marketplace Entries

1. Add a package summary to `marketplace.json`.
2. For Codex, add a plugin entry to `.agents/plugins/marketplace.json` that points to a Git-backed source or another reviewed source.
3. Keep local `plugins/`, `packages/`, and `.claude/skills/` empty unless this repository intentionally changes from catalog-only to artifact-hosting.
4. Run `npm run validate`.

See `docs/publishing.md` for the full checklist.

## Reference Formats

This repository follows the Codex plugin marketplace layout documented by OpenAI and the Claude Code skill layout documented by Anthropic:

- [Codex build plugins](https://developers.openai.com/codex/plugins/build)
- [Codex agent skills](https://developers.openai.com/codex/skills)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
