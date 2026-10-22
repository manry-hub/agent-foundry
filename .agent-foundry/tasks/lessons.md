# Lessons
- When reorganizing template directories, update every internal path reference and scaffold expectation in the same change.
- When rebranding the repository, check user-facing docs and starter files for stale current-name labels; keep former names only where needed for legacy compatibility.
- When adapting copied agent prompts into project rules, remove plugin-specific metadata and paths, then route each reference only to tasks that need it.
- When a user asks about security or data-integrity rules, distinguish agent safety guardrails for secret exposure and harmful side effects from application security or database integrity; clarify the intended meaning when ambiguous.
- When adding a rules document, place it directly under `.agent-foundry/rules/` unless the user requests a nested category, and update all references if its location changes.
- When a user withdraws a skill integration, remove its routing and package-specific CLI assumptions while preserving generic template behavior where applicable.
