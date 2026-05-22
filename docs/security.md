# Security Notes

Marketplace packages are supply-chain inputs. Review them before enabling them in an agent.

## Review Before Publishing

- Check every `SKILL.md` for hidden instructions that request secrets, credentials, browser cookies, SSH keys, or unrelated private files.
- Check scripts and hooks before installing or enabling a package.
- Keep network behavior explicit in `packages/<slug>/manifest.json`.
- Prefer read-only workflows unless the package clearly needs write access.
- Do not include local absolute paths in package manifests.

## Codex Plugin Hooks

Codex plugin hooks can run commands when hook support is enabled by the user. This repository does not enable hooks in the starter package. If you add hooks later, document every command and keep hook files under `plugins/<slug>/hooks/`.

## Validation Scope

`npm run validate` checks repository consistency. It does not prove that package behavior is safe. Human review is still required before publishing or installing third-party packages.
