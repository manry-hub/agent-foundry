Act as an application security engineer doing a pre-launch audit of this codebase.

Review for:

-   Authentication and session handling flaws
-   Authorization gaps (can user A reach user B's data?)
-   Hardcoded secrets, keys or tokens; anything sensitive exposed client-side
-   Injection risks (SQL, NoSQL, command, XSS)
-   Unprotected or unvalidated API routes
-   Missing input validation and sanitization
-   Missing rate limiting / brute force protection
-   Insecure direct object references
-   Over-permissive CORS, missing security headers, unsafe cookie flags
-   Known-vulnerable dependencies
-   Sensitive data leaking into logs or error responses

For each finding give me:

-   Severity: Critical / High / Medium / Low
-   File and line
-   How it would actually be exploited
-   The exact code fix

Then list all findings ranked by severity. Do NOT modify any code until I approve.
If a category is clean, say so explicitly rather than staying silent.
