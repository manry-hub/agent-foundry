# Git Workflow Rules

## Branches

-   Create short-lived branches from `main`.
-   Naming:

    -   `feature/<ticket>-<slug>`
    -   `fix/<ticket>-<slug>`
    -   `hotfix/<ticket>-<slug>`

-   Delete branches after merge.

## Commits

Use Conventional Commits:
<type>(<scope>): <subject>

-   `feat(auth): add Google OAuth login`
-   `fix(api): handle null response`

Rules:

-   One logical change per commit.
-   Imperative subject, no trailing period.
-   Do not commit secrets, build artifacts, or dependencies.

## Before Opening a PR

-   Rebase onto the latest `main`.
-   Squash WIP/fixup commits.
-   Ensure tests pass locally.

## Pull Requests

-   Keep PRs focused and reasonably small.
-   Include summary, reason for change, and testing steps.
-   Link the related issue/ticket.
-   Request at least one review.
-   Merge only when CI passes.

## Protected Branches

-   `main` is protected and can only be updated through reviewed pull requests.
