# AgentFoundry

AgentFoundry installs shared agent guidance and skills into software projects with a local CLI. It does not require npm publishing or an npm registry.

## Requirements

- Node.js 18 or newer
- A checkout of this repository

## One-time setup

From this repository, run:

    node install.mjs

The installer copies the current configuration into your per-user application directory, creates a launcher, and adds its directory to your user PATH. Existing AgentConfig installations are left untouched: they are not moved, updated, aliased, or removed. Open a new terminal after setup.

## Use from a software project

From the project directory, install the configuration into the current project:

    agent-foundry init

Pass a target directory to install somewhere else:

    agent-foundry init ./my-project

The CLI merges directories and asks before replacing each conflicting file in an interactive terminal. If conflicts exist in a non-interactive environment, it stops before writing. Use --force to replace all conflicting files:

    agent-foundry init ./my-project --force

--force replaces only files that conflict with the bundled configuration; it does not remove unrelated files.

## Updating the installed configuration

Update this repository to the revision you want, then run node install.mjs again from the checkout. The installer refreshes its managed local copy. Existing projects are not changed; run agent-foundry init in each project to apply updates there.

## Development checks

Run the local test suite without npm:

    node --test

Vendored skills retain their own license and notice files. The top-level license applies to the CLI and original configuration materials; consult each vendored skill's notices for its terms.
