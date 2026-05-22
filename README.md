# Skillsplace Marketplace

Skillsplace is a repository for hosting marketplace metadata for Codex, Claude Code, and compatible agent platforms.

This repository is catalog-only. It does not ship bundled skills, plugins, hooks, scripts, or platform artifacts. Add entries that point to packages hosted elsewhere, or extend the catalog structure when you are ready to publish installable artifacts from separate repositories.

It keeps three catalog layers separate:

- `marketplace.json`: platform-neutral catalog for humans, tooling, and future adapters.
- `.agents/plugins/marketplace.json`: Codex-native plugin marketplace.
- `.claude-plugin/marketplace.json`: Claude Code-native plugin marketplace.

## Quick Start

Validate the repository:

```bash
npm run validate
```

Use it locally with Codex:

```bash
codex plugin marketplace add ./path/to/skillsplace
```

After the repository is pushed to GitHub, Codex can add it by repository source:

```bash
codex plugin marketplace add jxpeng98/skillsplace --ref main
```

Use it locally with Claude Code:

```bash
claude plugin marketplace add ./path/to/skillsplace
```

After the repository is pushed to GitHub, Claude Code can add it by repository source:

```bash
claude plugin marketplace add jxpeng98/skillsplace@main
```

## Repository Layout

```text
.
├── marketplace.json
├── .agents/plugins/marketplace.json
├── .claude-plugin/marketplace.json
├── schemas/
├── scripts/validate.mjs
├── tests/
└── docs/
```

## Adding Marketplace Entries

1. Add a package summary to `marketplace.json`.
2. For Codex, add a plugin entry to `.agents/plugins/marketplace.json` that points to a Git-backed source or another reviewed source.
3. For Claude Code, add a plugin entry to `.claude-plugin/marketplace.json` that points to a GitHub, Git URL, git-subdir, npm, or reviewed relative source.
4. Keep local `plugins/`, `packages/`, and `.claude/skills/` empty unless this repository intentionally changes from catalog-only to artifact-hosting.
5. Run `npm run validate`.

See `docs/publishing.md` for the full checklist.

## Reference Formats

This repository follows the Codex plugin marketplace layout documented by OpenAI and the Claude Code skill layout documented by Anthropic:

- [Codex build plugins](https://developers.openai.com/codex/plugins/build)
- [Codex agent skills](https://developers.openai.com/codex/skills)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
