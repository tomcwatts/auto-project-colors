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
