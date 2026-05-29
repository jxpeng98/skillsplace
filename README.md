# Skillsplace Marketplace

Skillsplace is a catalog-only marketplace for agent plugins and skills. It is the aggregation point for packages that live in separate repositories.

The current marketplace entries are:

| Package | Version | Source | Platforms | Description |
| --- | --- | --- | --- | --- |
| `qiongli` | `0.13.0` | [`jxpeng98/qiongli`](https://github.com/jxpeng98/qiongli) | Codex, Claude Code, Antigravity | Academic paper workflows for planning, literature review, writing, compliance, submission, and research code. |
| `qiongli-core` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | General-purpose Qiongli academic workflow across paper types and methods. |
| `qiongli-economics` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | Economics-focused empirical, theory, and reproducibility workflow. |
| `qiongli-accounting` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | Accounting-focused archival, disclosure, audit, and measurement workflow. |
| `qiongli-business` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | Business-focused management, strategy, organization, marketing, and operations workflow for doctoral-level journal manuscripts. |
| `qiongli-finance` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | Finance-focused corporate finance, asset pricing, market microstructure, and risk workflow for doctoral-level journal manuscripts. |
| `qiongli-economics-accounting` | `0.13.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v0.13.0) | Codex, Claude Code | Cross-disciplinary economics and accounting workflow for archival, causal, and reporting-setting research. |
| `productivity` | `0.1.0` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity | Productivity skills for planning, critique, decisions, commits, and pull requests. |
| `dev-tools` | `0.1.0` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity | Developer skills for repository boundaries, validation, and release readiness. |
| `writing-tools` | `0.1.0` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity | Writing skills for clarity, tone, summarization, and reusable text transformation. |
| `presentation-tools` | `0.1.0` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity | Presentation skills for creating engineering and project slides with Slidev. |

This repository does not vendor plugin source code, skills, hooks, MCP servers, or executable package artifacts. It only points supported platforms to reviewed external sources.

## Install Plugins

### Codex

Add this marketplace:

```bash
codex plugin marketplace add jxpeng98/skillsplace --ref main
```

Then install or enable a plugin from the Codex plugin UI. Use one of the package names listed above, such as `qiongli-core`, `productivity`, or `dev-tools`.

To confirm the marketplace is registered:

```bash
codex plugin marketplace list
```

### Claude Code

Add this marketplace:

```bash
claude plugin marketplace add jxpeng98/skillsplace@main
```

Install a plugin from this marketplace by replacing `<plugin-name>` with any package name listed above:

```bash
claude plugin install <plugin-name>@skillsplace
```

In an interactive Claude Code session, the equivalent slash commands are:

```text
/plugin marketplace add jxpeng98/skillsplace@main
/plugin install <plugin-name>@skillsplace
```

### Antigravity

Skillsplace publishes Antigravity adapter metadata at:

```text
.antigravity/catalog.json
```

Antigravity currently uses custom plugin directories with a root `plugin.json`, or editor extensions from Open VSX.

Current Antigravity entries:

- `productivity`, `dev-tools`, `writing-tools`, and `presentation-tools` are marked ready for the native plugin route.
- `qiongli` is listed in the Antigravity catalog, but native Antigravity plugin installation is marked pending until `jxpeng98/qiongli` adds `plugins/qiongli/plugin.json`.
- The subject-specific Qiongli release packages are currently listed for Codex and Claude Code only.

See `docs/antigravity.md` for the exact plugin and Open VSX extension routes.

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
- `.antigravity/catalog.json`: Antigravity adapter catalog for plugin and Open VSX extension routes.

## Repository Layout

```text
.
├── marketplace.json
├── .agents/plugins/marketplace.json
├── .claude-plugin/marketplace.json
├── .antigravity/catalog.json
├── schemas/
├── scripts/validate.mjs
├── tests/
└── docs/
```

## Add Marketplace Entries

1. Add a package summary to `marketplace.json`.
2. For Codex, add a plugin entry to `.agents/plugins/marketplace.json` that points to a Git-backed source or another reviewed source.
3. For Claude Code, add a plugin entry to `.claude-plugin/marketplace.json` that points to a GitHub, Git URL, git-subdir, npm, or reviewed relative source.
4. For Antigravity, add or update a metadata entry in `.antigravity/catalog.json` that records the plugin source and Open VSX extension status.
5. Keep local `plugins/`, `packages/`, and `.claude/skills/` empty unless this repository intentionally changes from catalog-only to artifact-hosting.
6. Run `npm run validate`.

See `docs/publishing.md` for the full checklist.

## References

This repository follows the Codex plugin marketplace layout documented by OpenAI and the Claude Code skill layout documented by Anthropic:

- [Codex build plugins](https://developers.openai.com/codex/plugins/build)
- [Codex agent skills](https://developers.openai.com/codex/skills)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Antigravity plugins](https://antigravity.google/docs/plugins?authuser=2&hl=de)
- [Antigravity Editor extensions](https://antigravity.google/docs/editor)
