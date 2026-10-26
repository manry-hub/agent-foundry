# Orca Multi-Session Workflow

Use this workflow only when the user explicitly requests multi-agent orchestration, role separation, or parallel work in Orca. It is optional for small tasks and single-session work.

## Principles

- The workflow is **provider-agnostic**. Use one agent provider with separate sessions; do not tie the workflow to a particular provider or model.
- Split parallel work by **branch and file ownership**, not merely by role labels.
- Each branch has exactly one writing session. Other sessions may read that branch but must not write to it.
- Do not start parallel sessions until every branch has a distinct physical worktree verified by `git worktree list`.
- If Orca shows multiple workspaces with the same checkout path, they are not isolated. Do not run parallel writers; repair the registry or worktree setup first.

## Workflow

1. **Planning session**
   - Analyze the repository and requirements without changing code, configuration, or project documentation.
   - Define scope, cross-scope contracts, file ownership, dependencies, acceptance criteria, and the integration strategy.
   - Send the plan to the user. Do not open implementation sessions before explicit approval.
2. **User decision gate**
   - The user approves, revises, or rejects the plan.
   - Explicit approval is the sole authorization to start implementation.
3. **Branch and worktree preparation**
   - Ensure a clean baseline on `main` or the approved base branch.
   - Create one feature branch for each independent scope, for example `feature/<scope>-frontend` and `feature/<scope>-backend`.
   - Create one genuinely separate Orca worktree for each branch, then verify every session's branch and physical path before sending an implementation prompt.
   - Designate one integration session on an integration branch. It must not merge changes until all dependent branches are complete.
4. **Parallel implementation**
   - Each session modifies only its owned files and runs checks relevant to its scope.
   - The approved contract is the shared source of truth. If the contract, scope, or a dependency must change, the session stops and asks the planner to obtain a user decision.
   - Each implementation session reports its commit, changed files, verification results, and blockers from its own branch.
5. **Integration**
   - The integration session merges scope branches into the integration branch, resolves conflicts only according to the approved contract, and runs combined verification.
   - Do not merge directly into `main` outside the project's required review/PR flow.
   - Report the integration commit, checks, deviations, and blockers to the user. There is no automatic review-agent stage unless the user requests one.

## Orca Practices

- Create branches before implementation sessions begin, then associate each Orca session with that branch's worktree.
- Read a terminal's status before sending it a follow-up prompt.
- Use structured Orca coordination only when the user requests supervision, structured status, a dependency DAG, or ask/reply flows. Use worktree and terminal commands for ordinary handoffs.
- If a worktree cannot be created as a separate checkout, do not simulate parallel work in one folder. Work sequentially or repair isolation first.

