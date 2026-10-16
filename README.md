# @manry-hub/agent-config

Run the installer directly from the public GitHub repository:

```sh
npx --allow-git=all --allow-scripts=@manry-hub/agent-config --package=github:manry-hub/AgentConfig#feature/npm-cli-scaffold agent-config init
```

This does not use the npm registry. With npm 12, Git dependencies and lifecycle scripts are disabled by default. These command-only flags allow Git dependencies for this invocation and permit only this package's `prepare` script to assemble its template; they do not change your global npm settings. The `feature/npm-cli-scaffold` branch must be pushed to GitHub first. After merging the feature into the default branch, remove `#feature/npm-cli-scaffold` from the package spec.

By default, `init` installs `AGENTS.md` and the complete `.agent/` directory into the current working directory. Pass a target directory to install elsewhere:

```sh
npx --allow-git=all --allow-scripts=@manry-hub/agent-config --package=github:manry-hub/AgentConfig#feature/npm-cli-scaffold agent-config init ./my-project
```

The installer merges directories and asks separately before replacing each conflicting file when run in an interactive terminal. In a non-interactive environment, it stops before writing if conflicts exist. Use `--force` to replace all conflicting files:

```sh
npx --allow-git=all --allow-scripts=@manry-hub/agent-config --package=github:manry-hub/AgentConfig#feature/npm-cli-scaffold agent-config init ./my-project --force
```

`--force` only replaces files that conflict with the bundled configuration; it does not remove unrelated files. This release provides `init` only.

The installer package contains the repository's root `AGENTS.md` and `.agent/` tree. Vendored skills retain their own license and notice files. The top-level license applies to the CLI and original configuration materials; consult each vendored skill's notices for its terms.
