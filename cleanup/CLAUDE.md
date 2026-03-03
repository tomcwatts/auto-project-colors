# CLAUDE.md

## Project summary
VS Code extension that auto-detects a project's favicon and applies a workspace accent color. The extension entrypoint is `src/extension.ts` and it is bundled to `dist/extension.js` via esbuild.

Published to VS Code Marketplace as "Auto Project Colors" by tomwatts (current version: 0.1.3).

## Repo layout
- `src/extension.ts` - Main extension activation and command registration
- `src/commands/` - Individual command implementations
  - `apply.ts` - Auto-detect favicon and apply colors
  - `pickIcon.ts` - Manual icon file selection
  - `revert.ts` - Restore previous colors
  - `disable.ts` - Enable/disable for workspace
  - `regenerate.ts` - Change palette strategy (dominant/vibrant/muted/pastel)
  - `setCustomHex.ts` - Set custom hex color
  - `chooseUISections.ts` - Choose UI sections preset (minimal/balanced/topBottom/maximum)
  - `showStatus.ts` - Status dashboard with quick actions
  - `index.ts` - Command registration hub
- `src/ui/` - UI color application logic
  - `uiApplier.ts` - Color customization application (CRITICAL: clears old colors before applying new)
  - `stateManager.ts` - Workspace state persistence
  - `statusBar.ts` - Status bar integration
- `src/colors/` - Color extraction and generation
  - `colorExtractor.ts` - Extract dominant color from images using Sharp
  - `colorGenerator.ts` - Generate palettes with WCAG contrast
- `src/utils/` - Shared utilities
  - `config.ts` - Configuration management and UI presets
  - `fileHelpers.ts` - File system operations
  - `logger.ts` - Extension logging
  - `iconFinder.ts` - Favicon detection
- `src/test/extension.test.ts` - VS Code test suite
- `esbuild.js` - Build/bundle configuration
- `package.json` - Extension manifest, commands, and settings
- `dist/extension.js` - Build output (generated)

## Tech stack
- TypeScript (ES2022, Node16 modules)
- VS Code Extension API
- esbuild bundler
- ESLint with `typescript-eslint`
- Sharp for image processing

## Common workflows
- Install deps: `npm install`
- Build (typecheck + lint + bundle): `npm run compile`
- Watch (esbuild + tsc): `npm run watch`
- Package for publish: `npm run package` (outputs `auto-project-colors-x.x.x.vsix`)
- Lint: `npm run lint`
- Typecheck: `npm run check-types`
- Tests (Extension Test Runner): `npm test`

## Extension development
- Run/debug: press `F5` in VS Code to launch an Extension Development Host
- Build output must remain `dist/extension.js` to match `package.json` `main`
- Commands are registered in `src/commands/index.ts` and declared in `package.json` `contributes.commands`
- Settings are defined in `package.json` `contributes.configuration`

## Available commands
All commands work on the active workspace folder:

1. **Apply Auto Project Colors** (`projectColor.apply`)
   - Auto-detects favicon and applies its dominant color to VS Code UI

2. **Pick Icon File Manually** (`projectColor.pickIcon`)
   - Opens file picker to manually select an icon

3. **Revert to Previous Colors** (`projectColor.revert`)
   - Restores colors from before Auto Project Colors was applied

4. **Disable for This Workspace** (`projectColor.disable`)
   - Toggles enabled/disabled state

5. **Regenerate with Different Strategy** (`projectColor.regenerate`)
   - QuickPick to change palette strategy: dominant, vibrant, muted, pastel
   - Reuses the same icon, just changes color processing

6. **Set Custom Color from Hex Code** (`projectColor.setCustomHex`)
   - Input box to enter custom hex color (e.g., `#FF5733`)
   - Validates format and generates full palette

7. **Choose UI Sections to Color** (`projectColor.chooseUISections`)
   - QuickPick to select preset: minimal, balanced, topBottom, maximum, custom
   - Automatically updates all 5 UI section flags and reapplies colors
   - See "UI Sections Preset System" below for details

8. **Show Current Color Status** (`projectColor.showStatus`)
   - Status dashboard with current color and quick actions menu
   - Gateway to all other commands

## UI Sections Preset System

The preset system allows users to easily configure which VS Code UI sections get colored. Instead of toggling 5 individual boolean flags in settings, users pick a named preset.

### Presets

| Preset | Title Bar | Activity Bar | Status Bar | Tab Bar | Side Bar | Use Case |
|--------|-----------|--------------|------------|---------|----------|----------|
| **Minimal** | ✓ | ✗ | ✗ | ✗ | ✗ | Least distraction, window identification only |
| **Balanced** | ✓ | ✓ | ✓ | ✗ | ✗ | Default - Good balance of visibility |
| **Top & Bottom** | ✓ | ✗ | ✓ | ✗ | ✗ | Clear window borders, no sidebar distraction |
| **Maximum** | ✓ | ✓ | ✓ | ✓ | ✓ | Full immersion, maximum color |
| **Custom** | *(varies)* | *(varies)* | *(varies)* | *(varies)* | *(varies)* | User manually set flags (auto-detected) |

### Implementation Files

- [src/utils/config.ts](src/utils/config.ts) - Preset types (`UISectionsPreset`), definitions (`UI_PRESETS`), and detection (`detectCurrentPreset()`)
- [src/commands/chooseUISections.ts](src/commands/chooseUISections.ts) - QuickPick UI and atomic config updates
- [src/commands/showStatus.ts](src/commands/showStatus.ts:69-72) - Integration into status menu

### Key Architecture

```typescript
// Preset definition (src/utils/config.ts)
export const UI_PRESETS: Record<UISectionsPreset, UIPresetDefinition> = {
    minimal: { colorTitleBar: true, colorActivityBar: false, ... },
    balanced: { colorTitleBar: true, colorActivityBar: true, ... },
    // ...
};

// Atomic update (src/commands/chooseUISections.ts)
await Promise.all([
    configuration.update('colorTitleBar', presetConfig.colorTitleBar, ...),
    configuration.update('colorActivityBar', presetConfig.colorActivityBar, ...),
    // ... all 5 flags updated simultaneously
]);
```

### Preset Detection

The extension automatically detects which preset is active by comparing current flag values against preset definitions. If no preset matches exactly, it returns `'custom'`.

## QuickPick Pattern

Many commands use the VS Code QuickPick pattern for user selection. Key features:

- **Current selection first**: `sortedOptions.sort()` puts current choice at top
- **Visual markers**: Current option gets `" (current)"` suffix and `picked: true`
- **Codicons**: Use `$(icon-name)` in labels for visual consistency
- **Descriptive text**: Each option has a `description` field

Reference implementations:
- [src/commands/regenerate.ts](src/commands/regenerate.ts:70-93) - Palette strategy picker
- [src/commands/chooseUISections.ts](src/commands/chooseUISections.ts:45-78) - UI sections preset picker

## Color Application System

### Critical: Color Clearing

**IMPORTANT**: When applying new colors (especially when changing presets), you MUST clear old colors first to prevent merge conflicts.

The correct pattern (from [src/ui/uiApplier.ts](src/ui/uiApplier.ts:202-208)):

```typescript
// Remove all managed color keys first (to clear previously colored sections that are now disabled)
const managedKeys = getAllManagedColorKeys();
await removeColorCustomizations(workspaceFolder, managedKeys);

// Build and apply new colors
const newColors = buildColorCustomizations(palette, config);
await setColorCustomizations(workspaceFolder, newColors);
```

**Why this matters**: When switching from "Maximum" preset (all sections) to "Minimal" (title only), the activity bar, status bar, tab bar, and sidebar colors must be explicitly removed. VS Code's `setColorCustomizations()` merges with existing values, so old colors persist unless cleared.

### Color Customization Keys

All managed keys are defined in [src/ui/uiApplier.ts](src/ui/uiApplier.ts:8-40):

- Title bar: `titleBar.activeBackground`, `titleBar.activeForeground`, `titleBar.inactiveBackground`, `titleBar.inactiveForeground`
- Activity bar: `activityBar.background`, `activityBar.foreground`, `activityBar.inactiveForeground`, `activityBar.activeBorder`
- Status bar: `statusBar.background`, `statusBar.foreground`, `statusBar.noFolderBackground`, `statusBar.debuggingBackground`
- Tab bar: `tab.activeBackground`, `tab.activeForeground`, `tab.activeBorder`, `tab.activeBorderTop`
- Sidebar: `sideBar.background`, `sideBar.foreground`
- Misc: `focusBorder` (always applied for consistent accent)

## State Management

Extension state is stored per workspace using `getStateManager()`:

- `hasAppliedColors(folder)` - Check if colors are currently applied
- `getCurrentColor(folder)` - Get the currently applied color hex
- `getIconPath(folder)` - Get the path to the detected icon
- `storePreviousColors(folder, colors)` - Save colors for revert
- `markColorsApplied(folder, color, iconPath)` - Mark as applied

State is workspace-scoped and persists across VS Code restarts.

## Conventions & gotchas
- Keep `src/` as the single source of truth; `dist/` is generated
- Avoid importing `vscode` types in non-extension runtime modules unless needed; they are externalized in esbuild
- When adding commands:
  1. Create new file in `src/commands/`
  2. Register in `src/commands/index.ts`
  3. Add to `package.json` `contributes.commands`
  4. Add to `package.json` `contributes.menus.commandPalette`
  5. Optionally integrate into [src/commands/showStatus.ts](src/commands/showStatus.ts) menu
- When adding settings, update `package.json` `contributes.configuration`
- Tests are discovered by name pattern `**/*.test.ts` under `src/test/`
- **Always clear old colors before applying new ones** (see "Color Application System" above)
- The extension has been published to the marketplace; increment version in `package.json` before rebuilding

## When editing
- Prefer small, focused changes
- Keep TypeScript `strict` mode happy; fix types rather than using `any`
- Follow existing QuickPick patterns for new user-facing selections
- When modifying color application logic, test with preset switching to ensure old colors are cleared
- Use atomic config updates (`Promise.all`) when updating multiple related settings
