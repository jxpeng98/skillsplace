# Skillsplace Marketplace

Skillsplace is a repository template for hosting reusable agent skills and plugins across Codex, Claude Code, and compatible tools.

It keeps three layers separate:

- `marketplace.json`: platform-neutral catalog for humans, tooling, and future adapters.
- `.agents/plugins/marketplace.json`: Codex-native plugin marketplace.
- `.claude/skills/`: Claude Code project skills.

The starter package is intentionally small. It exists to prove that marketplace discovery, package metadata, Codex plugin packaging, and Claude skill discovery all work from one repository.

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

Use it locally with Claude Code by running Claude from this repository root. Claude Code discovers project skills from `.claude/skills/`. To make a skill personal instead, copy the skill directory to `~/.claude/skills/`.

## Repository Layout

```text
.
├── marketplace.json
├── .agents/plugins/marketplace.json
├── .claude/skills/starter-toolkit/SKILL.md
├── plugins/starter-toolkit/
│   ├── .codex-plugin/plugin.json
│   └── skills/starter-toolkit/SKILL.md
├── packages/starter-toolkit/manifest.json
├── schemas/
├── scripts/validate.mjs
└── docs/
```

## Adding Packages

1. Create `packages/<slug>/manifest.json` from the schema in `schemas/package.schema.json`.
2. Add platform artifacts:
   - Codex plugin: `plugins/<slug>/.codex-plugin/plugin.json` and optional `plugins/<slug>/skills/`.
   - Claude skill: `.claude/skills/<slug>/SKILL.md`.
3. Add the package to `marketplace.json`.
4. Add Codex install metadata to `.agents/plugins/marketplace.json`.
5. Run `npm run validate`.

See `docs/publishing.md` for the full checklist.

## Reference Formats

This repository follows the Codex plugin marketplace layout documented by OpenAI and the Claude Code skill layout documented by Anthropic:

- [Codex build plugins](https://developers.openai.com/codex/plugins/build)
- [Codex agent skills](https://developers.openai.com/codex/skills)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
