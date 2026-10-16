---
name: owasp-secure-agent-playbook
description: Route requested code, application, dependency, infrastructure, API, mobile, or AI-agent security reviews to the matching locally vendored OWASP Secure Agent Playbook skill and procedure. Use for security assessments and audits, not routine implementation work.
---

# OWASP Secure Agent Playbook

The upstream OWASP Secure Agent Playbook is vendored in `upstream/`, including its skills, plays, templates, datasets, license, and third-party notices. Use this local copy so the full procedure is available without fetching GitHub during an audit. See `UPSTREAM.md` for provenance and refresh details.

## Workflow

1. Establish the requested target and scope from the user's request and the repository.
2. Use `upstream/README.md` to select the smallest relevant set of procedures. Code and infrastructure procedures are under `upstream/plugins/code-security-skills/`; AI and agent procedures are under `upstream/plugins/ai-security-skills/`.
3. Read the selected `skills/<skill-name>/SKILL.md` and follow its referenced play under the same plugin's `plays/` directory. Also load any cited local data or templates needed by that procedure. Resolve references such as `plays/...`, `data/...`, and `templates/...` from the plugin directory; if a referenced file is not there, resolve it from `upstream/`.
4. Keep actions within the user's scope. Treat source review as the default; perform active tests against live systems or change state only when explicitly included in the request.
5. Report evidence, impact, severity, and actionable remediation in the format requested by the user. Distinguish confirmed findings from hypotheses and name any procedure or tool that could not be run.

Use only the relevant procedures rather than loading the whole catalog into the assessment context. Preserve the included `LICENSE.md` and `THIRD_PARTY_NOTICES.md` when copying or redistributing this skill bundle.
