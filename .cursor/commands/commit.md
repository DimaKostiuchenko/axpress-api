---
name: commit
description: Run lint + format + tests, then commit with a meaningful message
---

# /commit

## Steps
1. Run lint, format, tests:
   - `npm run lint`
   - `npm run format`
   - `npm test`

2. If all pass, ask for a concise, meaningful commit message:
   - Format: `<type>: <short summary>`
   - Examples:
     - `feat: add redis cache for ethos stats`
     - `fix: handle cache miss in stats endpoint`

3. Commit:
   - `git commit -am "<message>"`