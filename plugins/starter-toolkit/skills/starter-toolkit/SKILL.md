---
name: starter-toolkit
description: Validate a Skillsplace marketplace checkout. Use when checking whether package metadata, Codex plugin entries, and skill files are wired correctly.
---

# Starter Toolkit

Use this skill to inspect a marketplace checkout.

1. Read `marketplace.json` to list available packages.
2. Check `.agents/plugins/marketplace.json` for Codex plugin entries.
3. Check `.claude/skills/` for Claude Code skill entries.
4. Run `npm run validate` if the user wants a concrete verification pass.
5. Report missing paths, duplicate slugs, or mismatched versions before suggesting publication.

Do not install remote packages, run package scripts, or modify marketplace entries unless the user asks.
