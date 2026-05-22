# Publishing Guide

Use this checklist when adding or changing a package.

## Package Checklist

1. Choose a kebab-case slug, for example `release-helper`.
2. Create `packages/<slug>/manifest.json`.
3. Add at least one platform artifact:
   - Codex plugin under `plugins/<slug>/`.
   - Claude Code skill under `.claude/skills/<slug>/`.
4. Add the package to the top-level `marketplace.json`.
5. Add a Codex entry to `.agents/plugins/marketplace.json` when the package should appear in Codex.
6. Run `npm run validate`.
7. Review the package for secrets, local paths, shell side effects, and unclear install instructions.

## Codex

Codex reads a repository marketplace from `.agents/plugins/marketplace.json`. Keep each `source.path` relative to the repository root and inside the repository.

For a plugin package, the required entry point is:

```text
plugins/<slug>/.codex-plugin/plugin.json
```

Bundled skills should live under:

```text
plugins/<slug>/skills/<skill-name>/SKILL.md
```

## Claude Code

Claude Code project skills live under:

```text
.claude/skills/<skill-name>/SKILL.md
```

Keep skill frontmatter concise. The `description` should say what the skill does and when it should be used.

## Other Platforms

Use `marketplace.json` and `packages/<slug>/manifest.json` as the stable adapter contract. Add a new platform key under `platforms` instead of changing existing Codex or Claude paths.
