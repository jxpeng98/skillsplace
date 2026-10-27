# Antigravity Installation

Skillsplace is a catalog, not an installable plugin. Antigravity's named marketplace
installation currently supports only `antigravity-plugins-official`, so neither
`agy plugin install dev-tools@skillsplace` nor installing the Skillsplace repository
URL loads this catalog. Our packages live in subdirectories of external repositories.

## One-command installation without a checkout

On macOS or Linux, with curl, Node.js 18+, and Git installed:

```bash
# Antigravity App
curl -fsSL https://raw.githubusercontent.com/jxpeng98/skillsplace/main/scripts/install-antigravity.sh | sh -s -- dev-tools --target app

# agy CLI (also requires agy on PATH)
curl -fsSL https://raw.githubusercontent.com/jxpeng98/skillsplace/main/scripts/install-antigravity.sh | sh -s -- dev-tools --target cli
```

Replace `dev-tools` with any ready package. To list packages, replace
`dev-tools --target cli` with `--list`. The App target does not require agy.

The shell bootstrap downloads only the Node installer and catalog into a temporary
directory, invokes the same installer used by npm, and cleans up on success or failure.
It does not clone Skillsplace, install npm dependencies, or leave a checkout behind.
The installer still fetches the external plugin repository at its catalog ref.

The command executes downloaded code from Skillsplace's `main` branch; review
`scripts/install-antigravity.sh`, `scripts/install-antigravity.mjs`, and the external
plugin before running. A failed download inside the bootstrap stops installation.
After installation, use the App or CLI verification steps below.

## Install from this checkout

Requirements: Node.js 18+ and Git. For the CLI target, also install the Antigravity CLI
and ensure `agy` is on PATH. No npm dependencies are needed.

```bash
npm run install:antigravity -- --list
npm run install:antigravity -- dev-tools --target cli
```

Replace `dev-tools` with a package marked `ready`: `dev-tools`, `faculty-tools`,
`presentation-tools`, `productivity`, or `writing-tools`. The default target is `cli`.
The installer reads `.antigravity/catalog.json`, clones the source at its recorded
ref into a temporary directory, validates the native manifest name, and passes the
plugin subdirectory to `agy plugin install`. Temporary source files are removed
on success or failure. Git/network and installer errors are reported as failures.

Verify in a new CLI session:

```bash
agy plugin list --json
```

In the interactive CLI, `/plugin` opens the plugin manager; `/plugin list` lists
installed plugins. Installation is delegated to agy, including its update behavior.

## Antigravity App

```bash
npm run install:antigravity -- dev-tools --target app
```

This copies the native plugin directory to `~/.gemini/config/plugins/dev-tools`,
the App's documented global discovery location. Start a new App session and inspect
Customizations / Installed. The CLI target delegates installation paths to your
installed agy version; use its `plugin list --json` output to verify the location
rather than assuming the App and CLI always use separate or shared directories.

The App installer refuses to overwrite an existing destination. To update, back up
or remove that plugin directory deliberately, then rerun the command. To uninstall
a manually copied App plugin, remove its directory. CLI plugins can be removed with
`agy plugin uninstall <package>`.

## Manual installation

For the skills repository packages, the equivalent CLI route is:

```bash
git clone --depth 1 --branch main https://github.com/jxpeng98/skills.git skills-source
agy plugin install ./skills-source/plugins/dev-tools
agy plugin list --json
```

For a project-scoped App installation, copy the selected native plugin directory to
`.agents/plugins/<package>` inside the project. Copy the plugin subdirectory, not
the repository root. Do not copy sources into this catalog repository.

## Compatibility limits

- Review external plugin content before installation. The installer does not execute
  package build scripts or convert Claude/Codex hooks or MCP configurations. Plugins
  can activate their native components when loaded by Antigravity.
- The recorded ref is honored. A branch such as `main` is mutable, so its current
  contents may be newer than the catalog's displayed version.
- Symbolic links in the fetched source are rejected to prevent copying content from
  outside the checkout. Packages requiring links need a self-contained upstream build.
- `qiongli` remains `pending-native-manifest`. The installer refuses it before fetching.
  Its upstream source/ref is in `.antigravity/catalog.json`; upstream must supply a
  root `plugin.json` and compatible native components before it can be marked ready.
  Adding the marker alone does not convert MCP configuration or hooks.
- Qiongli Next and subject-specific packages have no native Antigravity catalog entry.
- Open VSX editor extensions are a separate distribution route; publishing an extension
  is not required to install these native agent plugins.

## References

- [Antigravity plugin structure and App discovery paths](https://www.antigravity.google/docs/plugins)
- [Antigravity marketplace and agy installation commands](https://www.antigravity.google/docs/marketplace/)
