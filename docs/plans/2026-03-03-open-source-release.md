# Open Source Release Preparation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare the Auto Project Colors VS Code extension for a pristine open source release on a new public GitHub repo.

**Architecture:** Configuration, file organization, and documentation changes only — no logic changes. Each task is independently verifiable. The final output is a codebase ready for `git init` + single clean commit.

**Tech Stack:** TypeScript, VS Code Extension API, esbuild, ESLint (flat config), npm

**Design doc:** `docs/plans/2026-03-03-open-source-release-design.md`

---

## Pre-flight: Read These Files First

Before starting any task, read these files so you understand the current state:

```bash
cat .vscodeignore
cat eslint.config.mjs
cat tsconfig.json
cat LICENSE
cat CHANGELOG.md
cat package.json | head -20
ls -la
```

---

### Task 1: Fix .vscodeignore

**Files:**
- Modify: `.vscodeignore`

**Context:** Three problems exist in the current `.vscodeignore`:
1. `.claude/**` is NOT excluded — this causes `.claude/settings.local.json` to be packaged into the VSIX (a real bug: local dev permissions get shipped)
2. `cleanup/**` needs to be added (for the new cleanup folder we'll create in Task 2)
3. `.yarnrc` is referenced but that file does not exist — dead reference to remove

**Step 1: Read the current .vscodeignore**

```bash
cat .vscodeignore
```

**Step 2: Replace the entire file with the corrected version**

Write `.vscodeignore` with this exact content:

```
.vscode/**
.vscode-test/**
out/**
node_modules/**
!node_modules/sharp/**
!node_modules/@img/**
!node_modules/color/**
!node_modules/color-string/**
!node_modules/color-convert/**
!node_modules/color-name/**
!node_modules/simple-swizzle/**
!node_modules/detect-libc/**
!node_modules/semver/**
src/**
.gitignore
esbuild.js
cleanup/**
.claude/**
**/tsconfig.json
**/eslint.config.mjs
**/*.map
**/*.ts
**/.vscode-test.*
.github/**
.git/**
**/*.test.ts
**/*.spec.ts
```

Changes vs. original:
- Removed: `.yarnrc` (file doesn't exist)
- Added: `cleanup/**` (new cleanup folder)
- Added: `.claude/**` (fixes packaging bug)

**Step 3: Verify the diff looks right**

```bash
git diff .vscodeignore
```

Expected: removed `.yarnrc` line, added `cleanup/**` and `.claude/**` lines.

**Step 4: Commit**

```bash
git add .vscodeignore
git commit -m "fix: exclude .claude/ and cleanup/ from VSIX, remove dead .yarnrc reference"
```

---

### Task 2: Create /cleanup Folder and Move Internal Files

**Files:**
- Create: `cleanup/` directory
- Move: `CLAUDE.md` → `cleanup/CLAUDE.md`
- Move: `Implementation-Checklist.md` → `cleanup/Implementation-Checklist.md`
- Move: `SEO-Optimization-Guide.md` → `cleanup/SEO-Optimization-Guide.md`
- Move: `vsc-extension-quickstart.md` → `cleanup/vsc-extension-quickstart.md`

**Context:** These files are internal planning/development artifacts. They shouldn't live in the project root alongside standard open source files (README, LICENSE, CONTRIBUTING, etc.). Moving them to `/cleanup` keeps them available for reference while signaling they're not product documentation.

**Step 1: Create the cleanup directory and move files**

```bash
mkdir -p cleanup
git mv CLAUDE.md cleanup/CLAUDE.md
git mv Implementation-Checklist.md cleanup/Implementation-Checklist.md
git mv SEO-Optimization-Guide.md cleanup/SEO-Optimization-Guide.md
git mv vsc-extension-quickstart.md cleanup/vsc-extension-quickstart.md
```

**Step 2: Verify the moves**

```bash
ls cleanup/
ls *.md
```

Expected in `cleanup/`: CLAUDE.md, Implementation-Checklist.md, SEO-Optimization-Guide.md, vsc-extension-quickstart.md

Expected in root `*.md`: README.md, CHANGELOG.md only (plus any new files we haven't created yet)

**Step 3: Verify .gitignore still ignores what it should**

```bash
git status
```

The cleanup/ files should appear as renamed (not untracked).

**Step 4: Commit**

```bash
git add cleanup/
git commit -m "refactor: move internal planning files to cleanup/"
```

---

### Task 3: Update LICENSE Copyright

**Files:**
- Modify: `LICENSE`

**Context:** The LICENSE currently says `Copyright (c) 2024 Project Color`. This should reflect the real author name and current year.

**Step 1: Read current LICENSE**

```bash
cat LICENSE
```

**Step 2: Update the copyright line**

Find the line:
```
Copyright (c) 2024 Project Color
```

Replace with:
```
Copyright (c) 2025 Tom Watts
```

(Use the Edit tool to make this targeted change — do not rewrite the rest of the MIT license text.)

**Step 3: Verify**

```bash
head -3 LICENSE
```

Expected: `MIT License` then blank line then `Copyright (c) 2025 Tom Watts`

**Step 4: Commit**

```bash
git add LICENSE
git commit -m "fix: update LICENSE copyright year and author name"
```

---

### Task 4: Tighten ESLint Rules (warn → error)

**Files:**
- Modify: `eslint.config.mjs`

**Context:** All 4 rules are currently `"warn"`, which means violations don't fail CI or `npm run compile`. For open source, lint rules should be errors so contributors get immediate feedback and the quality gate is enforced.

**Step 1: Read the current eslint config**

```bash
cat eslint.config.mjs
```

**Step 2: Update the rules object**

Find the `rules` section:
```javascript
    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],
        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
    },
```

Replace with:
```javascript
    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],
        curly: "error",
        eqeqeq: "error",
        "no-throw-literal": "error",
        semi: "error",
    },
```

Note: `@typescript-eslint/naming-convention` stays as `"warn"` — naming is stylistic and doesn't need to hard-block.

**Step 3: Run lint to confirm no violations**

```bash
npm run lint
```

Expected: exits with code 0, no output (or only the esbuild watch output, not lint errors)

If there ARE lint errors, fix them before committing. They'll be minor style issues (missing semicolons, missing curly braces, etc.).

**Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: promote ESLint rules from warn to error"
```

---

### Task 5: Tighten TypeScript Config

**Files:**
- Modify: `tsconfig.json`

**Context:** Two additional strict checks are commented out or absent. Enabling them catches real bugs: unused variables that bloat the bundle, and functions that might return `undefined` accidentally.

**Step 1: Read current tsconfig**

```bash
cat tsconfig.json
```

**Step 2: Add two compiler options**

Find the `compilerOptions` object and add two lines:

Current:
```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "lib": ["ES2022"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  }
}
```

Updated:
```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "lib": ["ES2022"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true
  }
}
```

**Step 3: Run typecheck to confirm no violations**

```bash
npm run check-types
```

Expected: exits with code 0, no TypeScript errors.

If there ARE errors (e.g., "error TS6133: 'X' is declared but its value is never read"), fix them:
- Remove unused variables/imports
- For functions that need explicit return: add `return;` or handle all branches

Run `npm run check-types` again after each fix until clean.

**Step 4: Run full compile to confirm lint + types together**

```bash
npm run compile
```

Expected: exits with code 0.

**Step 5: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable noUnusedLocals and noImplicitReturns in TypeScript config"
```

---

### Task 6: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

**Context:** This is one of the two required community documents. It tells contributors exactly how to set up the dev environment, run tests, and submit a PR.

**Step 1: Create CONTRIBUTING.md with this exact content**

```markdown
# Contributing to Auto Project Colors

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [VS Code](https://code.visualstudio.com/) 1.70.0 or later

## Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-fork>/auto-project-colors.git
cd auto-project-colors

# 2. Install dependencies
npm install

# 3. Open in VS Code
code .
```

## Running the Extension

Press **F5** in VS Code to launch an **Extension Development Host** — a new VS Code window with your local build of the extension loaded.

Any changes to `src/` require a rebuild. Either:
- Press **Ctrl+Shift+F5** to restart the Extension Development Host, or
- Run `npm run watch` in a terminal (rebuilds on file save)

## Building

```bash
# Type-check + lint + bundle
npm run compile

# Bundle only (skips checks)
node esbuild.js

# Production bundle (minified, no source maps)
node esbuild.js --production
```

Build output goes to `dist/extension.js`. This file is gitignored and generated fresh each build.

## Running Tests

```bash
npm test
```

This compiles the tests, builds the extension, and runs the full test suite inside a real VS Code Extension Host. Tests live in `src/test/`.

## Code Style

- TypeScript strict mode is enforced (`"strict": true` in `tsconfig.json`)
- ESLint runs as part of `npm run compile` — fix all errors before committing
- Follow existing patterns in `src/` — commands in `src/commands/`, utilities in `src/utils/`
- See `cleanup/CLAUDE.md` for a detailed architectural guide

## Submitting a Pull Request

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `npm run compile` — must exit with code 0 (no errors)
4. Run `npm test` — all tests must pass
5. Open a PR with a clear description of what changed and why

For large changes, open an issue first to discuss the approach.

## Project Structure

```
src/
├── extension.ts        # Entry point, activation, file watcher, config listener
├── commands/           # One file per command (apply, revert, regenerate, etc.)
├── ui/                 # Color application (uiApplier.ts), state, status bar
├── colors/             # Color extraction (Sharp), palette generation, normalization
├── icons/              # Favicon auto-detection with framework awareness
├── utils/              # Config, file helpers, logging, color validation
└── test/               # Test files (Mocha + assert, VS Code Extension Test Runner)
```
```

**Step 2: Verify the file was created**

```bash
wc -l CONTRIBUTING.md
```

Expected: ~80 lines

**Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md"
```

---

### Task 7: Create SECURITY.md

**Files:**
- Create: `SECURITY.md`

**Context:** GitHub shows a "Report a vulnerability" button on repos that have SECURITY.md. It also tells contributors the right channel for security issues (not a public issue).

**Step 1: Create SECURITY.md with this exact content**

```markdown
# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |
| < 1.0   | ❌ No     |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

To report a vulnerability privately:

1. Go to the [Security tab](../../security) of this repository
2. Click **"Report a vulnerability"** to open a private advisory
3. Describe the issue, steps to reproduce, and potential impact

Alternatively, you can email the maintainer directly. Check the repository's profile for contact information.

## What to Expect

- **Acknowledgement:** Within 7 days of your report
- **Assessment:** We will evaluate severity and determine a fix timeline
- **Disclosure:** We will coordinate a disclosure date with you after a fix is released

## Scope

**In scope:**
- Vulnerabilities in the extension source code (`src/`)
- Dependency vulnerabilities that affect the extension's behavior
- Path traversal or arbitrary file read issues in icon detection

**Out of scope:**
- Vulnerabilities in VS Code itself (report to [Microsoft](https://www.microsoft.com/en-us/msrc))
- Issues in the user's own project files
- Bugs that are not security-relevant (use the public issue tracker instead)

## Notes

This extension runs entirely offline — it makes no network requests. It reads local image files from the user's workspace to extract colors. Attack surface is limited to local file processing.
```

**Step 2: Verify the file was created**

```bash
wc -l SECURITY.md
```

Expected: ~50 lines

**Step 3: Commit**

```bash
git add SECURITY.md
git commit -m "docs: add SECURITY.md with vulnerability reporting process"
```

---

### Task 8: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

**Context:** The CHANGELOG currently goes from `[Unreleased]` straight to `[0.1.3]`. We need to add a `[1.0.0]` entry that documents the open source launch and the recent improvements made during the pre-release audit.

**Step 1: Read the current CHANGELOG**

```bash
head -30 CHANGELOG.md
```

**Step 2: Insert the [1.0.0] entry**

Find the line:
```markdown
## [0.1.3] - 2026-01-19
```

Insert this block BEFORE it (after the `[Unreleased]` section):

```markdown
## [1.0.0] - 2026-03-03

### Added
- Open source release on GitHub
- 14 new unit tests for `uiApplier` — covers preset switching, managed color keys, focusBorder invariant
- `CONTRIBUTING.md` and `SECURITY.md` for community contributors

### Changed
- Version bumped to 1.0.0 for public release milestone
- Internal planning files moved to `cleanup/` folder

### Fixed
- Config changes now apply to all workspace folders in multi-root workspaces (not just the first)
- `.claude/settings.local.json` no longer packaged into VSIX
- ICO files are now rejected before Sharp processing (avoids silent failure)
- SVG hex color regex now supports 8-character alpha hex values (`#rrggbbaa`)

### Performance
- Workspace activation now processes all folders in parallel (`Promise.all`)
- Framework and monorepo detection results are cached per workspace root

### Reliability
- Added 8-second timeout to all Sharp image processing operations
- Logger output channel creation now has a console fallback

```

**Step 3: Verify the structure looks right**

```bash
head -50 CHANGELOG.md
```

Expected: `[Unreleased]` section → `[1.0.0]` section → `[0.1.3]` section

**Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add [1.0.0] changelog entry for open source release"
```

---

### Task 9: Bump Version to 1.0.0

**Files:**
- Modify: `package.json`

**Context:** One field change: `"version": "0.1.3"` → `"version": "1.0.0"`.

**Step 1: Verify the current version**

```bash
node -e "console.log(require('./package.json').version)"
```

Expected: `0.1.3`

**Step 2: Update the version field in package.json**

Find:
```json
  "version": "0.1.3",
```

Replace with:
```json
  "version": "1.0.0",
```

**Step 3: Verify**

```bash
node -e "console.log(require('./package.json').version)"
```

Expected: `1.0.0`

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.0.0 for open source release"
```

---

### Task 10: Final Verification

**Files:** None modified — verification only.

**Step 1: Full compile**

```bash
npm run compile
```

Expected: exits code 0. Output should be:
```
> auto-project-colors@1.0.0 compile
> npm run check-types && npm run lint && node esbuild.js
[watch] build started
[watch] build finished
```

If there are errors, fix them and re-run before proceeding.

**Step 2: Full test suite**

```bash
npm test
```

Expected: all 63 tests pass. Last line should be:
```
63 passing (XXms)
Exit code: 0
```

**Step 3: Build the VSIX package**

```bash
npm run package
```

Expected: creates `auto-project-colors-1.0.0.vsix`

**Step 4: Inspect VSIX contents for packaging bugs**

```bash
unzip -l auto-project-colors-1.0.0.vsix | grep -E "\.claude|cleanup|CLAUDE|Implementation|SEO|settings\.local"
```

Expected: **empty output** (none of those files should be in the package)

If anything shows up, go back and fix `.vscodeignore`, then rebuild.

**Step 5: Verify VSIX contains the right things**

```bash
unzip -l auto-project-colors-1.0.0.vsix | grep -E "extension\.(js|json)|README|CHANGELOG|LICENSE"
```

Expected output should include:
```
extension/dist/extension.js
extension/package.json
extension/README.md
extension/CHANGELOG.md
extension/LICENSE
```

**Step 6: Verify root directory is clean**

```bash
ls *.md
```

Expected: `CHANGELOG.md  CONTRIBUTING.md  README.md  SECURITY.md`

(No CLAUDE.md, no Implementation-Checklist.md, no SEO-Optimization-Guide.md in root)

**Step 7: Final commit if any stragglers**

If `git status` shows anything uncommitted:

```bash
git status
git add -A
git commit -m "chore: final cleanup before open source release"
```

---

### Task 11: Prepare Fresh Git Repo (Final Step)

**Context:** The user wants a fresh git history for the new public repo. This task creates a single clean initial commit containing all the prepared code.

> ⚠️ **IMPORTANT:** This step is DESTRUCTIVE to git history. Only do this after Task 10 verification passes completely. The old history will be gone from the new repo (but still exists in the original private repo).

**Step 1: Confirm all changes are committed**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

If anything is uncommitted, stop and commit it first.

**Step 2: Squash all history into a single commit**

```bash
git checkout --orphan fresh-main
git add -A
git commit -m "chore: initial open source release (v1.0.0)

Auto Project Colors v1.0.0 - initial public release.

Features:
- Auto-detect project favicon and apply workspace accent color
- 4 palette strategies: dominant, vibrant, muted, pastel
- UI section presets: minimal, balanced, topBottom, maximum
- Custom hex color support
- Multi-root workspace support
- Framework-aware favicon detection (Next.js, React, Expo, Rails, Vite)
- Status bar integration with quick action menu"
```

**Step 3: Replace main with the clean branch**

```bash
git branch -D main
git branch -m main
```

**Step 4: Verify git log is clean**

```bash
git log --oneline
```

Expected: exactly ONE commit

```
abc1234 chore: initial open source release (v1.0.0)
```

**Step 5: Verify working tree**

```bash
git status
ls -la
```

Expected: clean working tree, root contains:
```
CHANGELOG.md
CONTRIBUTING.md
LICENSE
README.md
SECURITY.md
cleanup/
dist/          (gitignored, exists locally)
docs/
esbuild.js
eslint.config.mjs
icon.png
package.json
package-lock.json
src/
tsconfig.json
```

---

## Next Steps (After Plan Complete)

The code is now ready. To publish the new repo:

1. Create new GitHub repository (name TBD)
2. Add remote: `git remote add origin https://github.com/<user>/<repo>.git`
3. Push: `git push -u origin main`
4. On GitHub: set repo to public, add description, add topics (vscode-extension, colors, productivity)
5. Create `v1.0.0` tag: `git tag v1.0.0 && git push origin v1.0.0`
