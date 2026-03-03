import * as assert from 'assert';
import { buildColorCustomizations, getAllManagedColorKeys } from '../ui/uiApplier';
import { ProjectColorConfig } from '../utils/config';
import { hexToRgb, getContrastRatio, alphaBlend } from '../utils/colorValidation';
import { ColorPalette, generatePalette } from '../colors/colorGenerator';

const TEST_PALETTE: ColorPalette = {
    primary: '#3498db',
    primaryForeground: '#ffffff',
    darkened: '#1a5276',
    darkenedForeground: '#ffffff',
    lightened: '#85c1e9',
    lightenedForeground: '#000000',
    accent: '#2ecc71',
    accentForeground: '#000000'
};

function makeConfig(overrides: Partial<ProjectColorConfig>): ProjectColorConfig {
    return {
        enabled: true,
        iconSourceMode: 'auto',
        iconPath: '',
        iconSearchPatterns: [],
        paletteStrategy: 'dominant',
        contrastTarget: 4.5,
        colorTitleBar: false,
        colorActivityBar: false,
        colorStatusBar: false,
        colorTabBar: false,
        colorSideBar: false,
        notifyOnApply: false,
        maxImageSize: 5242880,
        enableAutomaticDetection: true,
        ...overrides
    };
}

suite('uiApplier - getAllManagedColorKeys', () => {
    test('returns a non-empty array', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(Array.isArray(keys));
        assert.ok(keys.length > 0, 'should have at least one managed key');
    });

    test('includes title bar keys', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('titleBar.activeBackground'));
        assert.ok(keys.includes('titleBar.activeForeground'));
        assert.ok(keys.includes('titleBar.inactiveBackground'));
        assert.ok(keys.includes('titleBar.inactiveForeground'));
    });

    test('includes activity bar keys', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('activityBar.background'));
        assert.ok(keys.includes('activityBar.foreground'));
        assert.ok(keys.includes('activityBar.inactiveForeground'));
        assert.ok(keys.includes('activityBar.activeBorder'));
    });

    test('includes status bar keys', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('statusBar.background'));
        assert.ok(keys.includes('statusBar.foreground'));
        assert.ok(keys.includes('statusBar.noFolderBackground'));
    });

    test('includes tab bar keys', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('tab.activeBackground'));
        assert.ok(keys.includes('tab.activeForeground'));
    });

    test('includes sidebar keys', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('sideBar.background'));
        assert.ok(keys.includes('sideBar.foreground'));
    });

    test('includes focusBorder', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('focusBorder'));
    });
});

suite('uiApplier - buildColorCustomizations', () => {
    test('minimal preset: only title bar and focusBorder', () => {
        const config = makeConfig({ colorTitleBar: true });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        assert.ok('titleBar.activeBackground' in result, 'missing title bar background');
        assert.ok('titleBar.activeForeground' in result, 'missing title bar foreground');
        assert.ok('focusBorder' in result, 'missing focusBorder');

        assert.ok(!('activityBar.background' in result), 'activity bar should be absent');
        assert.ok(!('statusBar.background' in result), 'status bar should be absent');
        assert.ok(!('tab.activeBackground' in result), 'tab bar should be absent');
        assert.ok(!('sideBar.background' in result), 'sidebar should be absent');
    });

    test('maximum preset: all UI sections present', () => {
        const config = makeConfig({
            colorTitleBar: true,
            colorActivityBar: true,
            colorStatusBar: true,
            colorTabBar: true,
            colorSideBar: true
        });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        assert.ok('titleBar.activeBackground' in result);
        assert.ok('activityBar.background' in result);
        assert.ok('statusBar.background' in result);
        assert.ok('tab.activeBackground' in result);
        assert.ok('sideBar.background' in result);
        assert.ok('focusBorder' in result);
    });

    test('switching from maximum to minimal removes non-title sections', () => {
        // This simulates the clear-before-apply requirement: buildColorCustomizations
        // with minimal config must NOT include keys for disabled sections
        const minimalConfig = makeConfig({ colorTitleBar: true });
        const result = buildColorCustomizations(TEST_PALETTE, minimalConfig);

        // These must be absent so the caller can safely clear-then-set without stale keys
        assert.ok(!('activityBar.background' in result), 'activity bar must not be in minimal result');
        assert.ok(!('statusBar.background' in result), 'status bar must not be in minimal result');
        assert.ok(!('tab.activeBackground' in result), 'tab bar must not be in minimal result');
        assert.ok(!('sideBar.background' in result), 'sidebar must not be in minimal result');
    });

    test('topBottom preset: title bar and status bar only', () => {
        const config = makeConfig({ colorTitleBar: true, colorStatusBar: true });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        assert.ok('titleBar.activeBackground' in result);
        assert.ok('statusBar.background' in result);
        assert.ok(!('activityBar.background' in result));
        assert.ok(!('tab.activeBackground' in result));
        assert.ok(!('sideBar.background' in result));
    });

    test('all values are non-empty strings', () => {
        const config = makeConfig({
            colorTitleBar: true,
            colorActivityBar: true,
            colorStatusBar: true,
            colorTabBar: true,
            colorSideBar: true
        });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        for (const [key, value] of Object.entries(result)) {
            assert.strictEqual(typeof value, 'string', `${key} should be a string`);
            assert.ok(value.length > 0, `${key} should be non-empty`);
        }
    });

    test('focusBorder is always applied regardless of section flags', () => {
        const config = makeConfig({}); // all sections false
        const result = buildColorCustomizations(TEST_PALETTE, config);

        assert.ok('focusBorder' in result, 'focusBorder should always be set');
        assert.strictEqual(result['focusBorder'], TEST_PALETTE.primary);
    });

    test('inactive title bar has alpha suffix for transparency', () => {
        const config = makeConfig({ colorTitleBar: true });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        assert.ok('titleBar.inactiveForeground' in result);
        assert.ok(
            result['titleBar.inactiveForeground'].length === 9,
            'inactive foreground should be 8-char hex with alpha (# + 6 + 2 = 9 chars)'
        );
    });

    test('activity bar icon foreground meets 4.5:1 contrast on mid-luminance palette', () => {
        const midPalette: ColorPalette = {
            primary: '#808080',
            primaryForeground: '#000000',
            darkened: '#6b6b6b',
            darkenedForeground: '#ffffff',
            lightened: '#959595',
            lightenedForeground: '#000000',
            accent: '#808080',
            accentForeground: '#000000'
        };
        const config = makeConfig({ colorActivityBar: true });
        const result = buildColorCustomizations(midPalette, config);

        const fgRgb = hexToRgb(result['activityBar.foreground'])!;
        const bgRgb = hexToRgb(result['activityBar.background'])!;
        const ratio = getContrastRatio(fgRgb, bgRgb);
        assert.ok(ratio >= 4.5, `Activity bar foreground contrast is ${ratio.toFixed(2)}, expected >= 4.5`);
    });

    test('activity bar inactive foreground meets 4.5:1 when alpha-blended', () => {
        const midPalette: ColorPalette = {
            primary: '#808080',
            primaryForeground: '#000000',
            darkened: '#6b6b6b',
            darkenedForeground: '#ffffff',
            lightened: '#959595',
            lightenedForeground: '#000000',
            accent: '#808080',
            accentForeground: '#000000'
        };
        const config = makeConfig({ colorActivityBar: true });
        const result = buildColorCustomizations(midPalette, config);

        const inactiveFg = result['activityBar.inactiveForeground'];
        assert.ok(inactiveFg.length === 9, 'inactive foreground should have alpha suffix');

        const baseHex = inactiveFg.slice(0, 7);
        const alpha = parseInt(inactiveFg.slice(7, 9), 16) / 255;
        const fgRgb = hexToRgb(baseHex)!;
        const bgRgb = hexToRgb(result['activityBar.background'])!;
        const blended = alphaBlend(fgRgb, bgRgb, alpha);
        const ratio = getContrastRatio(blended, bgRgb);
        assert.ok(ratio >= 4.5, `Activity bar inactive blended contrast is ${ratio.toFixed(2)}, expected >= 4.5`);
    });

    test('status bar foreground meets 4.5:1 contrast on tricky palette', () => {
        const trickPalette: ColorPalette = {
            primary: '#6b7b8d',
            primaryForeground: '#ffffff',
            darkened: '#4d5f71',
            darkenedForeground: '#ffffff',
            lightened: '#8999a9',
            lightenedForeground: '#000000',
            accent: '#8d7b6b',
            accentForeground: '#000000'
        };
        const config = makeConfig({ colorStatusBar: true });
        const result = buildColorCustomizations(trickPalette, config);

        const fgRgb = hexToRgb(result['statusBar.foreground'])!;
        const bgRgb = hexToRgb(result['statusBar.background'])!;
        const ratio = getContrastRatio(fgRgb, bgRgb);
        assert.ok(ratio >= 4.5, `Status bar foreground contrast is ${ratio.toFixed(2)}, expected >= 4.5`);
    });

    test('sidebar foreground meets 4.5:1 contrast', () => {
        const midPalette: ColorPalette = {
            primary: '#808080',
            primaryForeground: '#000000',
            darkened: '#6b6b6b',
            darkenedForeground: '#ffffff',
            lightened: '#959595',
            lightenedForeground: '#000000',
            accent: '#808080',
            accentForeground: '#000000'
        };
        const config = makeConfig({ colorSideBar: true });
        const result = buildColorCustomizations(midPalette, config);

        const fgRgb = hexToRgb(result['sideBar.foreground'])!;
        const bgRgb = hexToRgb(result['sideBar.background'])!;
        const ratio = getContrastRatio(fgRgb, bgRgb);
        assert.ok(ratio >= 4.5, `Sidebar foreground contrast is ${ratio.toFixed(2)}, expected >= 4.5`);
    });

    test('title bar inactive foreground meets 4.5:1 when alpha-blended', () => {
        const midPalette: ColorPalette = {
            primary: '#808080',
            primaryForeground: '#000000',
            darkened: '#6b6b6b',
            darkenedForeground: '#ffffff',
            lightened: '#959595',
            lightenedForeground: '#000000',
            accent: '#808080',
            accentForeground: '#000000'
        };
        const config = makeConfig({ colorTitleBar: true });
        const result = buildColorCustomizations(midPalette, config);

        const inactiveFg = result['titleBar.inactiveForeground'];
        assert.ok(inactiveFg.length === 9, 'inactive foreground should have alpha suffix');

        const baseHex = inactiveFg.slice(0, 7);
        const alpha = parseInt(inactiveFg.slice(7, 9), 16) / 255;
        const fgRgb = hexToRgb(baseHex)!;
        const bgRgb = hexToRgb(result['titleBar.inactiveBackground'])!;
        const blended = alphaBlend(fgRgb, bgRgb, alpha);
        const ratio = getContrastRatio(blended, bgRgb);
        assert.ok(ratio >= 4.5, `Title bar inactive blended contrast is ${ratio.toFixed(2)}, expected >= 4.5`);
    });

    test('all foreground/background pairs meet 4.5:1 across multiple palettes', () => {
        const trickyColors = ['#808080', '#555555', '#aaaaaa', '#e74c3c', '#2ecc71', '#3498db', '#f39c12'];
        const fgBgPairs: Array<{ key: string; fgKey: string; bgKey: string }> = [
            { key: 'activityBar', fgKey: 'activityBar.foreground', bgKey: 'activityBar.background' },
            { key: 'statusBar', fgKey: 'statusBar.foreground', bgKey: 'statusBar.background' },
            { key: 'sideBar', fgKey: 'sideBar.foreground', bgKey: 'sideBar.background' },
        ];

        for (const baseColor of trickyColors) {
            const palette = generatePalette(baseColor, 'dominant', 4.5);
            const config = makeConfig({
                colorActivityBar: true,
                colorStatusBar: true,
                colorSideBar: true
            });
            const result = buildColorCustomizations(palette, config);

            for (const pair of fgBgPairs) {
                const fg = result[pair.fgKey];
                const bg = result[pair.bgKey];
                if (!fg || !bg) { continue; }

                const fgRgb = hexToRgb(fg.slice(0, 7))!;
                const bgRgb = hexToRgb(bg)!;
                const ratio = getContrastRatio(fgRgb, bgRgb);
                assert.ok(
                    ratio >= 4.5,
                    `${pair.fgKey} contrast on base ${baseColor} is ${ratio.toFixed(2)}, expected >= 4.5`
                );
            }
        }
    });
});
