# Agent Guidance

Use these shared rules across agents. Follow more specific project or task instructions when they apply, while preserving the user's requested scope.

## Understand the Project and Request

- Treat the user's request and the repository's current state as the source of truth. Inspect relevant files and instructions before changing anything.
- Identify the project's stack from its manifests and configuration, then read only the applicable guidance under `.agent/rules/`.
- Before running project commands or changing dependencies, inspect manifests, lockfiles, runtime-version files, and tool configuration. Follow the declared versions, package manager, and existing scripts. Investigate conflicting declarations; ask before choosing a version or package manager only when the project leaves a necessary choice open.
- Make consequential assumptions and tradeoffs explicit. Ask a focused question when plausible interpretations or an unresolved decision could materially change the result; otherwise proceed using the clearest supported interpretation.
- Respect the requested workflow stage: discovery, specification, planning/tickets, implementation, or verification. A request for one stage authorizes that stage only; a clear implementation request authorizes the work. Pause for approval only when requested or when a material decision or scope exceeds that authorization.

## Plan and Implement Proportionately

- For substantial, multi-step, or architectural work, define the outcome, scope, assumptions, and observable completion criteria, then outline a concise plan. Use the active agent's planning features when available; small, clear tasks can proceed directly.
- Use `.agent/tasks/todo.md` as a working checklist for substantial or long-running tasks. Update progress and add a concise review when using it.
- If an important assumption proves false, the approach stops working, or the scope must materially change, pause to explain the change and revise the plan. Get user input when the new scope or decision is not already authorized.
- Prefer the simplest maintainable solution that meets the request. Avoid speculative features, dependencies, abstractions, or rewrites without a concrete need.
- Keep changes surgical: follow the project's architecture and conventions, limit edits to the request and its necessary consequences, remove only artifacts made obsolete by the change, and investigate root causes instead of masking them with avoidable workarounds.

## Verify and Report

- For substantial work, define how each important outcome will be checked. Choose verification suited to the change: relevant tests, linting, type checks, builds, targeted manual checks, or diff review.
- Run relevant project checks for code changes. For documentation or configuration changes, compare the final diff with the requested scope and validate affected references or formats. Do not claim a check passed unless it was run; report checks that could not be run and what remains unverified.
- Summarize material changes, verification results, and unresolved issues in the final response.

## Task Records and Corrections

- For substantial or long-running work, use `.agent/tasks/todo.md` as a concise checklist. Keep completed task records as history rather than replacing them; update checkboxes and review notes as work progresses.
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

- Use `.agent/tasks/lessons.md` for reusable prevention rules, not a chronological task log. Keep the `# Lessons` heading and add one concise bullet per lesson, phrased as a trigger or context followed by the action that prevents recurrence:

  ```md
  # Lessons
  - When <trigger or context>, <preventive action>.
  ```

- After any user correction, record its reusable lesson and prevention rule in `.agent/tasks/lessons.md`; consult relevant lessons on related work.
- Do not create task-tracking records for trivial work unless the user or project requires them.

## Repository References

- For branch, commit, merge, or pull request work, consult `.agent/rules/GIT.md` and follow repository conventions and the hosting platform's current state.
- Treat files in `.agent/commands/` as standalone prompts for the user's manual use. Apply one only when the user explicitly asks to use that command.
- For code style, use the matching guide under `.agent/rules/specific-codestyle/` when one exists for the project's stack. These guides hold stack-specific conventions; this file holds shared workflow guidance.
- For frontend UI or UX work, read `.agent/skills/impeccable/SKILL.md` and load the reference that matches the task.
- For a requested security review or audit, read `.agent/skills/owasp-secure-agent-playbook/SKILL.md` and follow the upstream procedure that matches the target.

## Living Project Documents

- Consult `.agent/rules/BRD.md` or `.agent/rules/FRD.md` when a task affects business scope or product behavior. After implementing a material change, update only affected statements in the relevant document; leave unrelated sections unchanged.
- Treat the usual BRD and FRD topics as prompts, not mandatory headings. Keep these documents concise and current; leave unknowns open rather than inventing them.
- For changes to persisted data, consult the project's existing `DATABASE.md` and update facts verifiable from its schema, migrations, models, or queries. Keep web research separate from routine feature work; when research is requested, record sources and dates and distinguish recommendations from the implemented data model. Do not create a duplicate `DATABASE.md` when none exists.

## MCP Tool Routing

- Use Pencil MCP when reading, creating, editing, or validating Pen app designs or `.pen` files. Read Pencil's built-in skill first; access `.pen` files through Pencil MCP tools.
- Use Playwright MCP for browser interactions and end-to-end checks of user-facing web flows.
- Use Chrome DevTools MCP to inspect or diagnose a running page's console, network traffic, computed styles, performance, memory, or Lighthouse results. Pair it with Playwright when a user flow must be reproduced before diagnosis.
- Use Context7 MCP when a task depends on current documentation for a library, framework, SDK, API, CLI, or cloud service. Resolve the library ID first, then query the relevant concept.
- Use Sequential Thinking MCP for complex, uncertain, multi-step analysis or planning; skip it for routine tasks. Keep tool input focused on task facts and decision checkpoints rather than private chain-of-thought.
- MCP availability varies by agent environment. Use a relevant MCP when exposed; otherwise use an appropriate alternative and report a material limitation. Do not imply that an unavailable tool was used.
