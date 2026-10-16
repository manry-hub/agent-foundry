# AgentConfig Task Log

## Move skill bundles out of the repository

- [x] Switch to `feature/agent-config` and inspect skill references and the installed skill catalog.
- [x] Install the missing OWASP Secure Agent Playbook bundle in the user skill catalog; confirm Impeccable is already installed.
- [x] Update `AGENTS.md` to route by skill name and explain installation when a needed skill is missing.
- [x] Remove `.agent/skills` from the project.
- [x] Verify skill references, repository state, and the installed OWASP bundle.

## Review

- Result: Removed vendored skill files from the project and routed skill use by name in `AGENTS.md`.
- Verification: `git diff --check` passed; the installed OWASP skill manifest and its full agent-security audit procedure are present; `AGENTS.md` no longer references skill file paths.
- Follow-up: None; the active skill catalog now lists the installed OWASP router and task-specific skills.
