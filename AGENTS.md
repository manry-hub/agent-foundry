# Agent Guidance

Use these shared rules across agents. Follow more specific project or task instructions when they apply, while preserving the user's requested scope.

## Understand the Project and Request

- Treat the user's request and the repository's current state as the source of truth. Inspect relevant files and instructions before changing anything.
- Identify the project's stack from its manifests and configuration, then read only the applicable guidance under `.agent-foundry/rules/`.
- Before running project commands or changing dependencies, inspect manifests, lockfiles, runtime-version files, and tool configuration. Follow the declared versions, package manager, and existing scripts. Investigate conflicting declarations; ask before choosing a version or package manager only when the project leaves a necessary choice open.
- Make consequential assumptions and tradeoffs explicit. Ask a focused question when plausible interpretations or an unresolved decision could materially change the result; otherwise proceed using the clearest supported interpretation.
- Respect the requested workflow stage: discovery, specification, planning/tickets, implementation, or verification. A request for one stage authorizes that stage only; a clear implementation request authorizes the work. Pause for approval only when requested or when a material decision or scope exceeds that authorization.

## Plan and Implement Proportionately

- For substantial, multi-step, or architectural work, define the outcome, scope, assumptions, and observable completion criteria, then outline a concise plan. Use the active agent's planning features when available; small, clear tasks can proceed directly.
- Use `.agent-foundry/tasks/todo.md` as a working checklist for substantial or long-running tasks. Update progress and add a concise review when using it.
- If an important assumption proves false, the approach stops working, or the scope must materially change, pause to explain the change and revise the plan. Get user input when the new scope or decision is not already authorized.
- Prefer the simplest maintainable solution that meets the request. Avoid speculative features, dependencies, abstractions, or rewrites without a concrete need.
- Keep changes surgical: follow the project's architecture and conventions, limit edits to the request and its necessary consequences, remove only artifacts made obsolete by the change, and investigate root causes instead of masking them with avoidable workarounds.

## Verify and Report

- For substantial work, define how each important outcome will be checked. Choose verification suited to the change: relevant tests, linting, type checks, builds, targeted manual checks, or diff review.
- Run relevant project checks for code changes. For documentation or configuration changes, compare the final diff with the requested scope and validate affected references or formats. Do not claim a check passed unless it was run; report checks that could not be run and what remains unverified.
- Summarize material changes, verification results, and unresolved issues in the final response.

## Task Records and Corrections

- For substantial or long-running work, use `.agent-foundry/tasks/todo.md` as a concise checklist. Keep completed task records as history rather than replacing them; update checkboxes and review notes as work progresses.
- Format each todo entry with a task/workstream heading, observable checkbox items, and a review section:

  ```md
  # <Project or task log>

  ## <Task or workstream>
  - [ ] <Observable action or outcome>

  ## Review
  - Result: <What was completed>
  - Verification: <Checks performed and outcomes>
  - Follow-up: <Unresolved items, if any>
  ```

- Use `.agent-foundry/tasks/lessons.md` for reusable prevention rules, not a chronological task log. Keep the `# Lessons` heading and add one concise bullet per lesson, phrased as a trigger or context followed by the action that prevents recurrence:

  ```md
  # Lessons
  - When <trigger or context>, <preventive action>.
  ```

- After any user correction, record its reusable lesson and prevention rule in `.agent-foundry/tasks/lessons.md`; consult relevant lessons on related work.
- Do not create task-tracking records for trivial work unless the user or project requires them.

## Repository References

- For branch, commit, merge, or pull request work, consult `.agent-foundry/commands/GIT.md` and follow repository conventions and the hosting platform's current state.
- Treat files in `.agent-foundry/commands/` as standalone prompts for manual use; apply them only when explicitly requested. Consult `GIT.md` during branch, commit, merge, or pull request work as described above.
- For code style, use the matching guide under `.agent-foundry/rules/specific-codestyle/` when one exists for the project's stack. These guides hold stack-specific conventions; this file holds shared workflow guidance.
- For product UI work that affects visual direction, interaction patterns, or the design system, consult the root `DESIGN.md`.
- Use `.agent-foundry/docs/` for living product and project documents, the root `DESIGN.md` for design guidance, and `.agent-foundry/rules/` for agent procedures and stack-specific conventions.

## Skill Routing

- For frontend UI or UX work, invoke the `impeccable` skill and follow its task-matched workflow and references. If it is missing from the active agent's skill catalog, install it from `pbakaus/impeccable` with that environment's supported skill installer, verify it is available, then invoke it.
- Apply Antislop only when task scope matches. In `.agent-foundry/rules/antislop/`, read `CORE-FILTER.md` plus only the matching specialist: `UI.md` for interface visuals or interaction patterns, `COPYWRITING.md` for user-facing copy or prose, and `LAYOUT-MOBILE.md` for responsive or mobile behavior. For mixed work, read only the matching specialists. Skip all Antislop files for unrelated tasks, and resolve its usage mode only after a scope match.
- For security reviews or audits, invoke the installed OWASP skill matching the target by its exact catalog name, including its namespace. Prefer `owasp-secure-agent-playbook` as the router; otherwise choose a target-specific skill. If missing, install the relevant skill or package from `OWASP/secure-agent-playbook` with the active agent's supported installer, verify it, then invoke it.
- Treat skill names as agent-environment invocations, not project file paths. Install a missing task-relevant skill before starting work that depends on it. Follow the installed skill's complete procedure and load the references it identifies.

## Living Project Documents

- Consult `.agent-foundry/docs/BRD.md` for business context, problem and objectives, stakeholders, high-level business requirements and scope, business rules, KPIs, constraints, assumptions, risks, or dependencies.
- Consult `.agent-foundry/docs/PRD.md` for product overview, target users, needs and use cases, product scope, feature requirements, user stories, acceptance criteria, user flows and UX, and functional or non-functional requirements.
- Consult `.agent-foundry/docs/SDD.md` for system boundaries, architecture, technology stack, module or component responsibilities and dependencies, and database design such as ERDs, tables, relationships, indexes, and constraints.
- After a material feature addition, change, or removal, update or retire only the affected information in relevant documents. Treat the listed topics as prompts rather than mandatory headings; keep useful sections concise, leave unknowns explicit, and do not invent decisions.
- Keep external research distinct from project facts. When research is requested or supplied, record its sources and dates and label recommendations or proposed designs; describe the current system using project evidence such as configuration, schemas, migrations, models, and queries. Do not repeat web research during routine implementation unless requested.

## MCP Tool Routing

- Use Pencil MCP when reading, creating, editing, or validating Pen app designs or `.pen` files. Read Pencil's built-in skill first; access `.pen` files through Pencil MCP tools.
- Use Playwright MCP for browser interactions and end-to-end checks of user-facing web flows.
- Use Chrome DevTools MCP to inspect or diagnose a running page's console, network traffic, computed styles, performance, memory, or Lighthouse results. Pair it with Playwright when a user flow must be reproduced before diagnosis.
- Use Context7 MCP when a task depends on current documentation for a library, framework, SDK, API, CLI, or cloud service. Resolve the library ID first, then query the relevant concept.
- Use Sequential Thinking MCP for complex, uncertain, multi-step analysis or planning; skip it for routine tasks. Keep tool input focused on task facts and decision checkpoints rather than private chain-of-thought.
- MCP availability varies by agent environment. Use a relevant MCP when exposed; otherwise use an appropriate alternative and report a material limitation. Do not imply that an unavailable tool was used.
