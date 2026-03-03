# Open Source Release — Design Document

**Date:** 2026-03-03
**Goal:** Prepare the Auto Project Colors VS Code extension for a clean, professional open source release on a new public GitHub repository.

---

## Context

The extension is currently developed in a private repo (`tomcwatts/auto-project-colors`). It is published to the VS Code Marketplace at v0.1.3. The goal is to prepare a clean new repo that is ready to accept community contributions, with no internal planning artifacts visible, no packaging bugs, and proper open source conventions in place.

Key findings from the readiness audit:
- ✅ No secrets, API keys, or sensitive data in source code
- ✅ MIT license present, all dependencies are MIT/Apache-2.0
- ✅ Excellent end-user README and CHANGELOG
- ❌ `.claude/settings.local.json` is being packaged into the VSIX (packaging bug)
- ❌ Missing CONTRIBUTING.md and SECURITY.md
- ❌ ESLint rules are warnings-only (should be errors for CI quality gate)
- ❌ Internal planning files (SEO guide, implementation checklist, CLAUDE.md) are in root
- ❌ Dead `.yarnrc` reference in `.vscodeignore`
- ❌ LICENSE copyright says "2024 Project Color" (should be current year + author name)

---

## Approach: Thorough (B)

Chosen over "Surgical" (just fix packaging) and "Minimal" (just move files) because the user specified "pristine condition." This approach closes all gaps an experienced open source contributor or reviewer would notice on first look.

---

## Design Decisions

### 1. Repository & Version

| Decision | Choice | Reason |
|----------|--------|--------|
| New repo or make current public | New repo | Fresh start, single clean initial commit |
| Git history | Single initial commit | Hides internal dev history, clean first impression |
| Version | Bump to `1.0.0` | Signals intentional public release milestone |
| Initial commit message | `chore: initial open source release (v1.0.0)` | Standard convention |

### 2. File Organization

Internal planning files move to `/cleanup/` (still present for reference, but excluded from VSIX and clearly not "product files"):
- `CLAUDE.md` → `cleanup/CLAUDE.md`
- `Implementation-Checklist.md` → `cleanup/Implementation-Checklist.md`
- `SEO-Optimization-Guide.md` → `cleanup/SEO-Optimization-Guide.md`
- `vsc-extension-quickstart.md` → `cleanup/vsc-extension-quickstart.md`

`.vscodeignore` changes:
- Add `cleanup/**` — exclude new folder from VSIX
- Add `.claude/**` — fix packaging bug (currently ships `settings.local.json`)
- Remove `.yarnrc` — file doesn't exist, dead reference

### 3. Community Documentation

**`CONTRIBUTING.md`** (new file at root):
- Prerequisites (Node.js, VS Code, npm)
- Dev setup: `npm install` → F5 to launch Extension Development Host
- Running tests: `npm test`
- Building: `npm run compile`
- PR guidelines: one feature per PR, run tests before submitting
- Code style: TypeScript strict mode, follow existing patterns in `src/`
- Reference to `cleanup/CLAUDE.md` for architectural details

**`SECURITY.md`** (new file at root):
- Vulnerability reporting via GitHub private security advisories
- In-scope: extension code, dependency vulnerabilities
- Out-of-scope: VS Code itself, user's own project files
- Response expectation: acknowledge within 7 days

### 4. Build Hygiene

**`eslint.config.mjs`** — convert 4 rules from `"warn"` → `"error"`:
```
curly, eqeqeq, no-throw-literal, semi
```

**`tsconfig.json`** — add 2 compiler checks:
```json
"noUnusedLocals": true,
"noImplicitReturns": true
```

**`LICENSE`** — update copyright line:
- From: `Copyright (c) 2024 Project Color`
- To: `Copyright (c) 2025 Tom Watts`

**`CHANGELOG.md`** — add `[1.0.0]` entry at top:
```markdown
## [1.0.0] - 2026-03-03
### Added
- Open source release on GitHub
- Performance improvements: parallel workspace activation, cached framework/monorepo detection
- Reliability improvements: ICO pre-validation, Sharp processing timeout, SVG alpha hex support
- Test coverage: uiApplier unit tests (14 new tests, 63 total)
- Fix: config changes now apply to all workspace folders, not just first
```

**`package.json`** — bump `version` field from `"0.1.3"` to `"1.0.0"`

### 5. New Repo Setup (out of scope for code changes)

After code is ready:
1. `git init` in project directory
2. `git add .`
3. `git commit -m "chore: initial open source release (v1.0.0)"`
4. Create new GitHub repo (name TBD by user)
5. `git remote add origin <new-repo-url>`
6. `git push -u origin main`

---

## Verification

After all changes, before declaring done:
1. `npm run compile` — 0 TypeScript errors, 0 ESLint errors
2. `npm test` — all 63 tests pass
3. `npm run package` — builds VSIX successfully
4. Inspect VSIX: `unzip -l *.vsix | grep -E "\.claude|cleanup|CLAUDE|Implementation|SEO"` — must return empty
5. Review `CONTRIBUTING.md` and `SECURITY.md` for completeness

---

## Files Changed Summary

| File | Action |
|------|--------|
| `package.json` | Bump version to 1.0.0 |
| `CHANGELOG.md` | Add [1.0.0] entry |
| `LICENSE` | Update copyright year + name |
| `.vscodeignore` | Add cleanup/**, .claude/**, remove dead .yarnrc |
| `eslint.config.mjs` | warn → error for 4 rules |
| `tsconfig.json` | Add noUnusedLocals, noImplicitReturns |
| `CLAUDE.md` | Move to cleanup/ |
| `Implementation-Checklist.md` | Move to cleanup/ |
| `SEO-Optimization-Guide.md` | Move to cleanup/ |
| `vsc-extension-quickstart.md` | Move to cleanup/ |
| `CONTRIBUTING.md` | Create (new) |
| `SECURITY.md` | Create (new) |
