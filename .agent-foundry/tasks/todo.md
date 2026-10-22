# AgentFoundry

## Split Antislop core into shared and task-specific guidance
- [x] Map current core rules to the shared core and matching specialist guides.
- [x] Move UI, copywriting, and responsive rules into their respective specialist guides while preserving selective routing and R identifiers.
- [x] Update specialist instructions and checklists to use the compact shared standards.
- [x] Review references, rule coverage, and diff for consistency.

## Review
- Result: Reduced the shared core from 7,895 words to 797 and moved task-specific checks into UI, copywriting, and mobile guides. Selective routing in `AGENTS.md` remains unchanged.
- Verification: `git diff --check` passed; confirmed all R-01 through R-38 identifiers remain referenced and removed stale core Delivery Gate / Part references.
- Follow-up: None.

## Add safe operations and data-protection guardrails
- [x] Add concise always-on safety rules and a detailed safe-operations guide.
- [x] Align Git, security-audit, and cleanup prompts with the guardrails.
- [x] Record the reusable lesson from clarifying the intended meaning of security and data-integrity rules.
- [x] Review references and diff; run `git diff --check`.

## Review
- Result: Added shared guardrails and `.agent-foundry/rules/SAFE-OPERATIONS.md`; aligned the Git, security-audit, and cleanup prompts.
- Verification: `git diff --check` passed; confirmed all references resolve and the installer recursively includes `.agent-foundry` files.
- Follow-up: None.

## Align CLI tests and scaffold checks with current guidance
- [x] Remove stale bundled-skill assumptions from CLI tests while retaining generic plugin-reference coverage.
- [x] Check guidance references and verify `SAFE-OPERATIONS.md` is included in generated scaffolds.
- [x] Keep repository task history out of generated project templates.
- [x] Run `node --test`, review all pending changes, and commit the coherent change.

## Review
- Result: Replaced skill-specific CLI test assumptions with generic plugin-reference coverage, added path and scaffold checks, and kept internal task history out of generated projects.
- Verification: `node --test` passed (10 tests); `node --check bin/cli.mjs` and `git diff --check` passed; confirmed the withdrawn skill has no references in `AGENTS.md`, `bin/cli.mjs`, or CLI tests.
- Follow-up: None.
