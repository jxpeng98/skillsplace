# Skillsplace Marketplace

Skillsplace is a catalog-only marketplace for agent plugins and skills. It is the aggregation point for packages that live in separate repositories.

The current marketplace entries are:

| Package | Version | Source | Platforms | Description |
| --- | --- | --- | --- | --- |
| `qiongli` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Codex, Claude Code, Claude Desktop, Antigravity | Academic paper workflows for planning, literature review, writing, compliance, submission, and research code. |
| `qiongli-next` | `1.19.0-beta.1` | [`qiongli` pre-release](https://github.com/jxpeng98/qiongli/releases/tag/v1.19.0-beta.1) | Codex, Claude Code, Claude Desktop | Pre-release Qiongli channel for testing the restructured package layout before it becomes the stable marketplace entry. |
| `qiongli-core` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | General-purpose Qiongli academic workflow across paper types and methods. |
| `qiongli-economics` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Economics-focused empirical, theory, and reproducibility workflow. |
| `qiongli-accounting` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Accounting-focused archival, disclosure, audit, and measurement workflow. |
| `qiongli-business` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Business-focused management, strategy, organization, marketing, and operations workflow for doctoral-level journal manuscripts. |
| `qiongli-finance` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Finance-focused corporate finance, asset pricing, market microstructure, and risk workflow for doctoral-level journal manuscripts. |
| `qiongli-economics-accounting` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Cross-disciplinary economics and accounting workflow for archival, causal, and reporting-setting research. |
| `qiongli-political-economy` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Political economy workflow for institutions, mechanisms, distribution, and comparative political-economic analysis. |
| `qiongli-geoeconomics` | `1.17.0` | [`qiongli` release](https://github.com/jxpeng98/qiongli/releases/tag/v1.17.0) | Claude Code | Geoeconomics workflow for statecraft, sanctions, supply chains, strategic competition, and global political economy. |
| `dev-tools` | `0.6.1` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity, Hermes | Developer skills for debugging, change review, Rust-to-Windows cross-builds, repository boundaries, and release readiness. |
| `faculty-tools` | `0.6.1` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity, Hermes | Daily university faculty skills for teaching, feedback, student communication, meetings, and light academic-service writing. |
| `presentation-tools` | `0.6.1` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity, Hermes | Presentation skills for choosing, creating, reviewing, and exporting Slidev, PowerPoint/PPTX, and LaTeX Beamer decks. |
| `productivity` | `0.6.1` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity, Hermes | Productivity skills for planning, critique, decisions, commits, and pull requests. |
| `writing-tools` | `0.6.1` | [`jxpeng98/skills`](https://github.com/jxpeng98/skills) | Codex, Claude Code, Antigravity, Hermes | Writing skills for clarity, tone, humanization, general writing polish, academic writing coaching, protected-fact preservation, and summarization. |

This repository does not vendor plugin source code, skills, hooks, MCP servers, or executable package artifacts. It only points supported platforms to reviewed external sources.

## Install Plugins

### Codex

Add this marketplace:

```bash
codex plugin marketplace add jxpeng98/skillsplace --ref main
```

Then install or enable a plugin from the Codex plugin UI. Use one of the Codex package names listed
above, such as `qiongli`, `productivity`, or `dev-tools`.

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
- `qiongli` is listed in the Antigravity catalog at stable tag `v1.3.0`, but native Antigravity plugin installation is marked pending until `jxpeng98/qiongli` adds a root `plugin.json` compatible with Antigravity.
- The `qiongli` and `qiongli-next` Codex entries install from build-generated `codex/v<version>`
  dist refs in `jxpeng98/qiongli`. The `qiongli-next` Claude plugin entry installs from the
  Claude-only `claude/v<version>` dist ref; stable `qiongli` stays on its existing published ref
  until a matching stable Claude ref is published. Subject-specific Qiongli release packages remain
  Claude Code only.

See `docs/antigravity.md` for the exact plugin and Open VSX extension routes.

### Hermes

Skillsplace publishes Hermes adapter metadata at:

```text
.hermes/marketplace.json
```

Hermes installs individual skills rather than multi-skill plugin bundles. The Hermes catalog therefore
maps supported packages to GitHub skill identifiers in `jxpeng98/skills`, without copying skill source
into this catalog-only repository.

Install a skill by identifier:

```bash
hermes skills install jxpeng98/skills/plugins/productivity/skills/commit-message
hermes skills install jxpeng98/skills/plugins/dev-tools/skills/release-readiness
```

List the supported identifiers from this checkout:

```bash
node -e "const c=require('./.hermes/marketplace.json'); for (const s of c.skills) console.log(s.source.identifier)"
```

If using Hermes global search, register or index this marketplace as a Hermes source first; the catalog
contains the installable identifiers and package mapping that Hermes-compatible tooling needs.

## Local Development

Validate the marketplace before publishing:

```bash
npm run validate
```

Refresh Qiongli entries from the latest GitHub release channels:

```bash
npm run sync:qiongli
npm run validate
```

The sync selects the latest non-prerelease Qiongli release for `qiongli` and the latest prerelease
for `qiongli-next`, then rewrites the platform catalogs to installable platform sources. Codex uses
build-generated `codex/v<version>` dist refs containing Codex plugin directories. The
`qiongli-next` Claude plugin catalog uses a separate `claude/v<version>` dist ref containing the
Claude plugin layout, while subject packages continue to use reviewed release artifacts. Claude
Desktop direct plugin ZIPs are exposed from the platform-neutral catalog as `claude-desktop`
entries. Both source syncs rebuild the full marketplace table in this README from `marketplace.json`,
so package additions, removals, versions, platforms, and descriptions stay aligned. Review the
resulting diff before publishing.

GitHub Actions also runs `.github/workflows/sync-marketplace-sources.yml` on a daily schedule and via
manual dispatch. It syncs both `jxpeng98/skills` package metadata and Qiongli release metadata, then
validates the marketplace and opens a pull request instead of pushing directly to `main`. The workflow
summarizes `marketplace.json` version changes so generated commits use bump-style subjects such as
`chore: bump qiongli-next to 1.18.0-beta.1` when a package version changes.

Use the local checkout while editing:

```bash
codex plugin marketplace add /path/to/skillsplace
claude plugin marketplace add /path/to/skillsplace
```

## Catalog Files

Skillsplace keeps catalog layers separate:

- `marketplace.json`: platform-neutral catalog for humans, tooling, and future adapters.
- `.agents/plugins/marketplace.json`: Codex-native plugin marketplace.
- `.claude-plugin/marketplace.json`: Claude Code-native plugin marketplace.
- Claude Desktop: `marketplace.json` `platforms.claude-desktop` direct plugin ZIP entries.
- `.antigravity/catalog.json`: Antigravity adapter catalog for plugin and Open VSX extension routes.
- `.hermes/marketplace.json`: Hermes adapter catalog for GitHub skill identifiers.

## Repository Layout

```text
.
├── marketplace.json
├── .agents/plugins/marketplace.json
├── .claude-plugin/marketplace.json
├── .antigravity/catalog.json
├── .hermes/marketplace.json
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
5. For Hermes, add or update `.hermes/marketplace.json` entries that point to external GitHub skill directories.
6. Keep local `plugins/`, `packages/`, `.claude/skills/`, and `.hermes/skills/` empty unless this repository intentionally changes from catalog-only to artifact-hosting.
7. Run `npm run validate`.

See `docs/publishing.md` for the full checklist.

## References

This repository follows the Codex plugin marketplace layout documented by OpenAI and the Claude Code skill layout documented by Anthropic:

- [Codex build plugins](https://developers.openai.com/codex/plugins/build)
- [Codex agent skills](https://developers.openai.com/codex/skills)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Antigravity plugins](https://antigravity.google/docs/plugins?authuser=2&hl=de)
- [Antigravity Editor extensions](https://antigravity.google/docs/editor)
