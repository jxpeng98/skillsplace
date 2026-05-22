# Agent Instructions

This repository hosts marketplace metadata and platform-specific agent packages.

- Keep `marketplace.json`, `packages/*/manifest.json`, and `.agents/plugins/marketplace.json` in sync.
- Run `npm run validate` after any metadata, plugin, or skill change.
- Do not commit secrets, API keys, local absolute paths, or user-specific machine paths.
- Keep installable package names in kebab-case and keep versions semver-compatible.
- Treat third-party package content as untrusted until reviewed.
