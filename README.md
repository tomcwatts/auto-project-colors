# Auto Project Colors

Automatically identify your VS Code projects at a glance. 🎨

Reads your project's favicon and instantly applies its dominant brand color to your VS Code UI—title bar, activity bar, and status bar. **Zero configuration. Zero setup.**

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tomwatts.auto-project-colors.svg?style=flat-square&label=Version)](https://marketplace.visualstudio.com/items?itemName=tomwatts.auto-project-colors)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/tomwatts.auto-project-colors.svg?style=flat-square&label=Downloads)](https://marketplace.visualstudio.com/items?itemName=tomwatts.auto-project-colors)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/tomwatts.auto-project-colors.svg?style=flat-square&label=Rating)](https://marketplace.visualstudio.com/items?itemName=tomwatts.auto-project-colors)

## The Problem

When you're working with multiple VS Code windows across different projects, they look identical. You waste time:
- ⏱️ Searching through windows to find the right project
- 🔄 Context-switching between similar-looking instances
- ❌ Editing the wrong project by mistake

Peacock requires manual color selection. Window Colors uses random hashes. **But your projects already have brand identities—favicons.**

## The Solution

Auto Project Colors works automatically—no configuration needed.

### How It Works

1. **Detects** your project's favicon
2. **Analyzes** its dominant color
3. **Applies** that color to VS Code UI automatically

Your workspace instantly reflects your project's branding.

**No favicon? No problem.** Many projects don't ship with a favicon—backend services, CLI tools, libraries, personal configs. The extension is still useful:

- **Set a custom hex color** — Run "Set Custom Color from Hex Code" and type any color (e.g. `#E06C75` for a warm red)
- **Pick any image** — Run "Pick Icon File Manually" to use a logo, avatar, or any image from your machine
- **Choose a palette style** — Switch between dominant, vibrant, muted, or pastel to get a look you like

Once set, your color persists per workspace—every time you open that project, you'll recognize it instantly.

### Features

- ✨ **Automatic Detection**: Works with any favicon without manual setup
- 🎨 **Brand-Accurate Colors**: Uses your project's actual brand color, not random hashes
- ⚡ **Instant Recognition**: Visual identification across all VS Code windows
- 🔧 **Zero Configuration**: Install and it works—no commands, no settings
- 🌈 **Multiple Projects**: Each project gets its unique brand color
- 💾 **Workspace-Aware**: Colors persist per VS Code workspace

### What Sets It Apart

| Feature | Auto Project Colors | Peacock | Window Colors |
|---------|-------------------|---------|---------------|
| **Automatic Detection** | ✅ Yes | ❌ Manual | ✅ Hash-based |
| **Uses Project Branding** | ✅ Yes (Favicon) | ❌ Manual selection | ❌ Random colors |
| **Zero Configuration** | ✅ Yes | ❌ 3+ steps | ✅ Yes |
| **Accurate Brand Colors** | ✅ Yes | ❌ User choice | ❌ Random |

## Quick Start

### Installation

1. Open VS Code
2. Go to Extensions (Cmd/Ctrl + Shift + X)
3. Search for "Auto Project Colors"
4. Click Install

That's it. No configuration needed.

### Usage

1. Open a project in VS Code
2. The extension automatically detects the project's favicon
3. Your VS Code UI colors update instantly

No commands. No settings to change. Just works.

### First Run

When you first open a project:
- Extension scans for `favicon.ico` or `.ico` files
- Analyzes the dominant color
- Applies it to title bar, activity bar, and status bar

Colors persist per workspace, so they'll remain consistent when you re-open projects.

## Commands

Open the Command Palette with `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux):

| Command | Description |
|---------|-------------|
| **Apply Project Color** | Detect your favicon and apply colors automatically |
| **Set Custom Color from Hex Code** | Choose your own color with a hex code (e.g., #3498db) |
| **Choose UI Sections to Color** | Pick which parts of VS Code to color (minimal, balanced, maximum) |
| **Regenerate with Different Strategy** | Switch between dominant, vibrant, muted, or pastel styles |
| **Pick Icon File Manually** | Select a specific image file to use |
| **Show Current Color Status** | Quick access to all actions in one menu |
| **Revert to Previous Colors** | Undo and restore your original colors |
| **Disable for This Workspace** | Turn the extension off for this project |

## Settings

Configure Auto Project Colors in VS Code settings (search for "auto project colors"):

### Basic Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `projectColor.enabled` | `true` | Turn the extension on or off |
| `projectColor.enableAutomaticDetection` | `true` | Automatically apply colors when you open a project |
| `projectColor.notifyOnApply` | `true` | Show a notification when colors are applied |

### Icon Detection

| Setting | Default | Description |
|---------|---------|-------------|
| `projectColor.iconSourceMode` | `"auto"` | `"auto"` searches automatically, `"manual"` uses a specific path |
| `projectColor.iconPath` | `""` | Path to your favicon (only used with manual mode) |
| `projectColor.iconSearchPatterns` | See below | Glob patterns for finding favicons |
| `projectColor.maxImageSize` | `5242880` | Maximum image size in bytes (5MB default) |

### Color Customization

| Setting | Default | Description |
|---------|---------|-------------|
| `projectColor.paletteStrategy` | `"dominant"` | Style: `dominant`, `vibrant`, `muted`, or `pastel` |
| `projectColor.contrastTarget` | `4.5` | WCAG contrast ratio (3 = AA, 4.5 = AA Large, 7 = AAA) |

### UI Elements

Control which parts of VS Code get colored. **Tip:** Use the "Choose UI Sections to Color" command for quick presets!

| Setting | Default | Description |
|---------|---------|-------------|
| `projectColor.colorTitleBar` | `true` | Color the title bar at the top |
| `projectColor.colorActivityBar` | `true` | Color the left sidebar icons |
| `projectColor.colorStatusBar` | `true` | Color the bottom status bar |
| `projectColor.colorTabBar` | `false` | Color the active tab |
| `projectColor.colorSideBar` | `false` | Color the file explorer sidebar |

**Presets Available:**
- **Minimal** – Title bar only (just enough to identify windows)
- **Balanced** – Title bar + Activity bar + Status bar (recommended)
- **Top & Bottom** – Title bar + Status bar (clean borders)
- **Maximum** – Everything (full color immersion)

### Default Search Patterns

The extension searches these locations (in order):

```json
[
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "public/favicon.ico",
  "public/favicon.png",
  "public/favicon.svg",
  "public/icon.png",
  "app/favicon.ico",
  "app/favicon.png",
  "assets/favicon.ico",
  "assets/favicon.png",
  "assets/icon.png",
  "assets/app-icon.png",
  "src/assets/favicon.png",
  "src/assets/icon.png",
  "static/favicon.ico",
  "static/favicon.png",
  "resources/favicon.ico",
  "resources/icon.png",
  "app/assets/images/favicon.ico"
]
```

## Supported Project Types

| Framework | Favicon Locations |
|-----------|-------------------|
| Next.js | `app/favicon.*`, `public/favicon.*` |
| React/Vite | `public/favicon.*`, `public/vite.svg` |
| Expo/React Native | `assets/app-icon.png`, `assets/favicon.png` |
| Rails | `app/assets/images/favicon.*`, `public/favicon.*` |
| Generic | `favicon.*`, `public/favicon.*`, `assets/icon.*` |

## Color Styles

Pick a style that matches your vibe:

- **Dominant** – Uses the color straight from your favicon
- **Vibrant** – Pumps up the saturation for a bold, eye-catching look
- **Muted** – Tones it down for a professional, subtle appearance
- **Pastel** – Soft and easy on the eyes

Use the "Regenerate with Different Strategy" command to switch styles anytime.

## Status Bar

Look for your current color code (like `#3498db`) in the bottom-right status bar. Click it to open the quick actions menu.

## FAQ

### Q: Does it work with private/corporate projects?
A: Yes. Auto Project Colors scans your local project's favicon. Nothing is sent to the cloud.

### Q: What if my project doesn't have a favicon?
A: Use "Set Custom Color from Hex Code" to pick any color, or "Pick Icon File Manually" to point at any image. See the "No favicon?" section above.

### Q: Can I customize the color?
A: Yes. While automatic detection is the default, you can manually override colors per project if needed.

### Q: How is this different from Peacock?
A: Peacock requires manual color selection for each project. Auto Project Colors automatically detects your favicon. **Zero setup.**

### Q: Why is there a color for my project?
A: Your project's favicon already has brand colors. We're just reading what's there—no guessing, no random colors.

### Q: Does it slow down VS Code?
A: No. Color detection happens once per project load and is cached.

### Q: Will it work with monorepo setups?
A: Yes. Each workspace folder can have its own favicon and color.

### Q: Can I disable it for specific projects?
A: Yes. You can disable it per-workspace or globally in settings.

## Troubleshooting

### Colors not applying automatically

**Problem**: Extension installed but colors haven't changed.

**Solution**:
1. Ensure you have a `favicon.ico` or `.ico` file in your project root
2. Restart VS Code
3. Open the project folder

If still no color appears:
- Check extension is enabled: Extensions view → Auto Project Colors → Enable
- File → Preferences → Settings → "Auto Project Colors" → Verify enabled

### Color detection seems wrong

**Problem**: Extension detected a color you didn't expect.

**Solution**:
- The extension analyzes the favicon's dominant color
- If your favicon has multiple colors, the most prevalent one is used
- You can manually override per project in workspace settings

### Performance issues

**Problem**: VS Code running slower after installing.

**Solution**:
- Extension loads colors from favicon cache
- First project open scans favicon (milliseconds)
- Subsequent opens use cache
- Performance impact: negligible

If you notice slowness, please [report an issue](https://github.com/tomcwatts/auto-project-colors/issues).

### Extension not showing in Marketplace

**Problem**: Can't find extension in VS Code extension search.

**Solutions**:
1. Search for exact name: "Auto Project Colors"
2. Search for keywords: "auto", "project", "identify", "distinguish"
3. Search for publisher name: tomwatts
4. If still not found, check you're on latest VS Code version

### SVG files aren't working

SVG support is limited. The extension looks for hex colors in fill/stroke attributes, and if that fails, tries to rasterize the SVG. If neither works, switch to a PNG version of your icon.

### Colors aren't showing up

- Make sure you have a workspace folder open (not just loose files)
- Check that `projectColor.enabled` is `true` in settings
- Look at **View → Output → Auto Project Colors** for error messages
- Verify your favicon is PNG, JPG, ICO, WebP, or SVG

## Requirements

VS Code 1.70.0 or later. That's it—everything else is bundled.

## Known Issues

- SVG color extraction can be hit-or-miss with complex graphics
- Colors might look slightly different on various monitor color profiles
- **macOS users**: Set `"window.titleBarStyle": "custom"` in your settings to see title bar colors

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Support

- **Issues**: [GitHub Issues](https://github.com/tomcwatts/auto-project-colors/issues)
- **Questions**: Check FAQ above first
- **Feature Requests**: Open a GitHub issue with label "enhancement"

## Feedback

Found a bug or want a new feature? Open an issue on [GitHub](https://github.com/tomcwatts/auto-project-colors).

---

**Made with ❤️ for developers who juggle multiple projects.**

**Enjoy!** 🎨
