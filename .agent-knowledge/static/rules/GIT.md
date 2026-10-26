# Git Workflow Rules

## Branches

- Create short-lived branches from `main`.
- Naming:

  - `feature/<slug>`
  - `fix/<slug>`
  - `hotfix/<slug>`

  Add a ticket prefix only when the project uses ticket tracking and the work has a ticket, for example `feature/PROJ-123-<slug>`.

- Delete a branch only after it is merged and its exact name is within the authorized scope.

## Safety

- Before Git changes, inspect the working tree, staged diff, and exact target branch or remote; preserve unrelated user changes.
- Never read or expose secrets. Do not commit secret values, credentials, or sensitive data; redact them from output and commit messages.
- Push, force-push, reset, clean, or delete a branch only when the user explicitly authorized that operation and its target. A direct request scoped to that operation and target is authorization. Do not use a broad command that affects unrelated branches or work.
- Follow `.agent-knowledge/static/rules/SAFE-OPERATIONS.md` for detailed handling of sensitive data and destructive operations.

## Commits

Use Conventional Commits:
`<type>(<scope>): <subject>`

- `feat(auth): add Google OAuth login`
- `fix(api): handle null response`

Rules:

- One logical change per commit.
- Imperative subject, no trailing period.
- Do not commit secrets, build artifacts, or dependencies.

## Before Opening a PR

- Rebase onto the latest `main`.
- Squash WIP/fixup commits.
- Ensure tests pass locally.

## Pull Requests

- Keep PRs focused and reasonably small.
- Include summary, reason for change, and testing steps.
- Link the related issue/ticket.
- Request at least one review.
- Merge only when CI passes.

## Protected Branches

- `main` is protected and can only be updated through reviewed pull requests.
