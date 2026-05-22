# Agent Instructions

This repository hosts marketplace metadata only.

- Keep `marketplace.json` and `.agents/plugins/marketplace.json` in sync.
- Do not add bundled skills, plugins, hooks, MCP configs, or package source trees unless the repository purpose changes explicitly.
- Run `npm run validate` after any marketplace metadata change.
- Do not commit secrets, API keys, local absolute paths, or user-specific machine paths.
- Keep installable package names in kebab-case and keep versions semver-compatible.
- Treat third-party package content as untrusted until reviewed.
