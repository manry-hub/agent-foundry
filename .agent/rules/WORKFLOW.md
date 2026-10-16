# Jira Workflow Agent Rules

## Project Context

You are using Jira for issue tracking and project management. The board, issues, and workflow must be configured to reflect actual team process and provide useful signal, not just compliance theater.

## Issue Writing

-   Write story titles as user-facing outcomes: `User can export order history as CSV` not `Build CSV export endpoint`.
-   Use the "As a [role], I want [goal], so that [benefit]" format for user stories when communicating with stakeholders.
-   Fill the Description with acceptance criteria as a checklist — every item must be verifiable.
-   Set priority using objective criteria: Urgent (production down), High (blocking users), Normal (planned work), Low (nice-to-have).
-   Link related issues using `Blocks`, `Is Blocked By`, `Relates To`, and `Duplicates` — these drive Jira's dependency views.
-   Attach screenshots, logs, and reproduction steps to bugs — a bug without a reproduction path cannot be prioritized.

## Smart Commits

-   Reference issues in commit messages: `PROJ-123: add CSV export endpoint` or `feat(PROJ-123): add CSV export`.
-   Use smart commit commands to automate transitions: `PROJ-123 #in-progress` or `PROJ-123 #done`.
-   Log time via smart commits: `PROJ-123 #time 2h 30m Implemented export logic`.
-   The commit author email must match a Jira user email for smart commits to link correctly.
-   Smart commits work only on the default branch or branches configured in the integration settings.

## Branch Naming

-   Format: `<type>/<PROJ-ID>-short-description` using lowercase and hyphens.
-   Types: `feature/`, `bugfix/`, `hotfix/`, `refactor/`, `chore/`, `test/`.
-   Examples: `feature/PROJ-123-csv-export`, `bugfix/PROJ-456-null-pointer-crash`.
-   Include the Jira issue key early in the branch name — the GitHub/GitLab integration detects it automatically.
-   Keep the description to 3–5 words — branch names appear in PR titles, Jira development panels, and git log.

## Board Configuration

-   Choose Scrum for sprint-based teams with fixed-length iterations; Kanban for continuous-flow and support teams.
-   Configure WIP limits per board column — start with team size multiplied by 1.5 and adjust based on flow data.
-   Use swimlanes by priority (Urgent/High/Normal) or by epic for large teams working on multiple initiatives.
-   Add quick filters for common views: My Issues, Bugs, Blocked, Current Sprint.
-   Keep board columns aligned to actual handoff points in the workflow — remove phantom states that nobody uses.

## Workflow Status Transitions

-   Standard flow: `To Do → In Progress → In Review → Done`.
-   Add `Blocked` as a global transition with a required comment explaining the blocker.
-   Use `Cancelled` for work abandoned during a sprint — always leave a comment explaining why.
-   Name transitions with action verbs: `Start Work`, `Submit for Review`, `Merge`, `Close`.
-   Avoid adding custom states for every team's edge case — each additional state adds friction.
-   Automate transitions via Jira Automation: `When PR merged → transition linked issue to Done`.

## JQL Essentials

-   Active work: `assignee = currentUser() AND status IN ("In Progress", "In Review") ORDER BY priority DESC`.
-   Current sprint: `sprint IN openSprints() AND project = MYPROJ ORDER BY priority DESC, created ASC`.
-   Stale issues: `status NOT IN (Done, Closed, Cancelled) AND updated < -30d ORDER BY updated ASC`.
-   Unassigned bugs: `issuetype = Bug AND assignee IS EMPTY AND priority IN (Urgent, High)`.
-   Blocked: `"Flagged" IS NOT EMPTY AND status NOT IN (Done, Closed)`.
-   Use `@currentUser()`, `startOfWeek()`, `endOfDay()`, and `membersOf("group")` for dynamic queries.
-   Save and share critical filters as team favorites — personal filters for daily use, shared for sprint reviews.

## Sprint Planning

-   Calculate capacity: sum of available person-days minus PTO, holidays, and ceremony time.
-   Pull stories from the top of the backlog — do not skip high-priority items for convenient ones.
-   Break stories larger than 8 points during backlog refinement before planning, not during the sprint.
-   Set a sprint goal that describes the business outcome, not just a list of tickets.
-   Track the burndown chart daily — a flat or rising line signals blocked work, not missing effort.
-   Close the sprint within one business day of the end date — move incomplete items to backlog explicitly.

## Automation Rules

-   Auto-transition issues when PRs are opened to `In Review` and merged to `Done`.
-   Flag issues in `In Progress` for more than 5 days without a status change — prevents stale tickets.
-   Auto-assign bugs to component owners using the `Component` field and owner lookup table.
-   Send Slack notifications for `Urgent` priority issues created after business hours.
-   Always prefix automated comments with `[Bot]` or an automation indicator for transparency.
-   Test all automation rules on a sandbox project before applying to production boards.

## Estimation

-   Use Fibonacci story points: 1, 2, 3, 5, 8, 13 — reject requests for sub-point precision.
-   Decompose any issue over 13 points before estimating — large items are planning risks.
-   Run planning poker for stories over 3 points — prevents anchoring on the first estimate given.
-   Track team velocity over sprints to improve accuracy — do not use velocity as a performance metric.
