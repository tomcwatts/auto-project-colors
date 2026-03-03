# Changelog

All notable changes to the "Auto Project Colors" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [0.1.3] - 2026-01-19

### Changed

- **Rebranded to "Auto Project Colors"** - New extension name emphasizing automatic functionality
- Updated marketplace description to highlight "automatically identify" and "zero configuration"
- Optimized keywords for better marketplace discoverability: color, project, identify, distinguish, workspace, auto, brand, window, theme, customization
- Changed category from "Other" to "Customization" for better marketplace filtering
- Updated gallery banner color to #2B8A8C (teal brand color)
- Refreshed README with SEO-optimized content including problem/solution framework, FAQ, and comparison table
- Updated repository URLs to https://github.com/tomcwatts/auto-project-colors
- All user-facing command categories now display as "Auto Project Colors"

### Technical

- Extension ID changed from `tomwatts.project-color` to `tomwatts.auto-project-colors`
- **No breaking changes**: Command IDs (`projectColor.*`) and configuration keys remain unchanged for full backwards compatibility
- Users' existing settings, keybindings, and workspace colors are preserved

## [0.1.0] - 2024-01-01

### Added

- Initial release of Auto Project Colors
- Automatic favicon detection for workspaces
- Support for multiple project types:
  - Next.js (app router and pages router)
  - React/Vite
  - Expo/React Native
  - Ruby on Rails
  - Generic Node.js/TypeScript projects
- Color extraction from PNG, JPG, ICO, WebP, and SVG images
- Four palette strategies: dominant, vibrant, muted, and pastel
- Configurable UI elements:
  - Title bar coloring
  - Activity bar coloring
  - Status bar coloring
  - Tab bar coloring (optional)
  - Sidebar coloring (optional)
- WCAG-compliant contrast checking with configurable targets (3:1, 4.5:1, 7:1)
- Commands:
  - Apply Auto Project Colors
  - Pick Icon File Manually
  - Revert to Previous Colors
  - Disable for This Workspace
  - Regenerate with Different Strategy
  - Show Current Color Status
- Status bar item showing current color with quick actions
- File watcher for automatic color updates when favicon changes
- Configuration change listener for live settings updates
- Multi-root workspace support
- Workspace-scoped settings and state persistence
- Output channel logging for troubleshooting

### Technical Details

- Built with TypeScript in strict mode
- Uses `sharp` library for fast, reliable image processing
- Optimized color extraction (<100ms per image)
- Debounced file watching (500ms)
- Cross-platform support (Windows, macOS, Linux)
- No external system dependencies

## [Unreleased]

### Planned

- Color picker for manual color selection
- Color history for quick switching
- Preset color schemes
- Import/export settings
- Workspace color synchronization
