# Skillsplace Marketplace

Skillsplace is a catalog-only marketplace for agent plugins and skills. It is the aggregation point for packages that live in separate repositories.

The current marketplace entry is:

| Package | Source | Platforms | Description |
| --- | --- | --- | --- |
| `qiongli` | [`jxpeng98/qiongli`](https://github.com/jxpeng98/qiongli) | Codex, Claude Code | Academic paper workflows for planning, literature review, writing, compliance, submission, and research code. |

This repository does not vendor plugin source code, skills, hooks, MCP servers, or executable package artifacts. It only points supported platforms to reviewed external sources.

## Install Qiongli

### Codex

Add this marketplace:

```bash
codex plugin marketplace add jxpeng98/skillsplace --ref main
```

Then install or enable `qiongli` from the Codex plugin UI. To confirm the marketplace is registered:

```bash
codex plugin marketplace list
```

### Claude Code

Add this marketplace:

```bash
claude plugin marketplace add jxpeng98/skillsplace@main
```

Install `qiongli` from this marketplace:

```bash
claude plugin install qiongli@skillsplace
```

In an interactive Claude Code session, the equivalent slash commands are:

```text
/plugin marketplace add jxpeng98/skillsplace@main
/plugin install qiongli@skillsplace
```

## Local Development

Validate the marketplace before publishing:

```bash
npm run validate
```

Use the local checkout while editing:

```bash
codex plugin marketplace add /path/to/skillsplace
claude plugin marketplace add /path/to/skillsplace
```

## Catalog Files

Skillsplace keeps three catalog layers separate:

- `marketplace.json`: platform-neutral catalog for humans, tooling, and future adapters.
- `.agents/plugins/marketplace.json`: Codex-native plugin marketplace.
- `.claude-plugin/marketplace.json`: Claude Code-native plugin marketplace.

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

## Add Marketplace Entries

1. Add a package summary to `marketplace.json`.
2. For Codex, add a plugin entry to `.agents/plugins/marketplace.json` that points to a Git-backed source or another reviewed source.
3. For Claude Code, add a plugin entry to `.claude-plugin/marketplace.json` that points to a GitHub, Git URL, git-subdir, npm, or reviewed relative source.
4. Keep local `plugins/`, `packages/`, and `.claude/skills/` empty unless this repository intentionally changes from catalog-only to artifact-hosting.
5. Run `npm run validate`.

See `docs/publishing.md` for the full checklist.

## References

This repository follows the Codex plugin marketplace layout documented by OpenAI and the Claude Code skill layout documented by Anthropic:

- [Codex build plugins](https://developers.openai.com/codex/plugins/build)
- [Codex agent skills](https://developers.openai.com/codex/skills)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
