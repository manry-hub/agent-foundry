# 002 — Add Workflow, ADR, and Specification Knowledge System

Date: 2026-10-28

## Checklist

- [x] Numbered workflow output path and canonical template are available.
- [x] Numbered ADR output path and canonical template are available.
- [x] Numbered SPEC output path and canonical template are available.
- [x] Active project instructions and documentation index describe when to use each artifact.

## Change Description

Added reusable workflow, architecture decision record, and technical specification documentation conventions. The design follows the staged workflow and decision/specification examples in the Manufacturing Execution System while keeping the templates project-agnostic and suitable for verified project evidence.

## Modified Files

- `AGENTS.md` — edited
- `.agent-knowledge/dynamic/docs/README.md` — edited
- `.agent-knowledge/static/commands/setups/DEVDOCS-SETUP.md` — edited
- `.agent-knowledge/static/templates/WORKFLOW-TEMPLATE.md` — added
- `.agent-knowledge/static/templates/ADR-TEMPLATE.md` — added
- `.agent-knowledge/static/templates/SPEC-TEMPLATE.md` — added
- `.agent-knowledge/dynamic/workflows/.gitkeep` — added
- `.agent-knowledge/dynamic/docs/notes/.gitkeep` — added
- `.agent-knowledge/dynamic/reports/LESSON.md` — edited

## Review

- Result: Workflows, ADRs, and specifications have defined creation paths, canonical templates, and usage guidance.
- Verification: Compared the reference project's staged workflows and ADR/SPEC examples; checked required paths, template references, and the final diff for whitespace errors.
- Follow-up: None.

## UAT (User Acceptance Test) Verification

| # | Test | Result |
| --- | --- | --- |
| 1 | Required templates and dynamic output directories exist | Pass |
| 2 | Active instructions reference the numbered artifact paths | Pass |
