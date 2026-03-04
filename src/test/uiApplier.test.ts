import * as assert from 'assert';
import { buildColorCustomizations, getAllManagedColorKeys } from '../ui/uiApplier';
import { ProjectColorConfig } from '../utils/config';
import { hexToRgb, getContrastRatio, alphaBlend } from '../utils/colorValidation';
import { ColorPalette, generatePalette } from '../colors/colorGenerator';

const CONTRAST_TARGET = 4.5;
const WHITE_HEX = '#ffffff';

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

function assertWhiteContrast(backgroundHex: string, label: string): void {
    const bgRgb = hexToRgb(backgroundHex)!;
    const whiteRgb = hexToRgb(WHITE_HEX)!;
    const ratio = getContrastRatio(bgRgb, whiteRgb);
    assert.ok(
        ratio >= CONTRAST_TARGET,
        `${label} contrast is ${ratio.toFixed(2)}, expected >= ${CONTRAST_TARGET}`
    );
}

function assertAlphaForegroundContrast(
    foregroundHex: string,
    backgroundHex: string,
    label: string
): void {
    const baseHex = foregroundHex.slice(0, 7);
    const alpha = parseInt(foregroundHex.slice(7, 9), 16) / 255;
    const fgRgb = hexToRgb(baseHex)!;
    const bgRgb = hexToRgb(backgroundHex)!;
    const blended = alphaBlend(fgRgb, bgRgb, alpha);
    const ratio = getContrastRatio(blended, bgRgb);
    assert.ok(
        ratio >= CONTRAST_TARGET,
        `${label} blended contrast is ${ratio.toFixed(2)}, expected >= ${CONTRAST_TARGET}`
    );
}

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
        assert.ok(keys.includes('activityBarBadge.background'));
        assert.ok(keys.includes('activityBarBadge.foreground'));
    });

    test('includes status bar keys', () => {
        const keys = getAllManagedColorKeys();
        assert.ok(keys.includes('statusBar.background'));
        assert.ok(keys.includes('statusBar.foreground'));
        assert.ok(keys.includes('statusBar.noFolderBackground'));
        assert.ok(keys.includes('statusBarItem.remoteBackground'));
        assert.ok(keys.includes('statusBarItem.remoteForeground'));
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
        assert.ok(keys.includes('sideBarTitle.foreground'));
        assert.ok(keys.includes('sideBarSectionHeader.foreground'));
        assert.ok(keys.includes('icon.foreground'));
        assert.ok(keys.includes('list.activeSelectionForeground'));
        assert.ok(keys.includes('list.inactiveSelectionForeground'));
        assert.ok(keys.includes('list.hoverForeground'));
        assert.ok(keys.includes('list.focusForeground'));
        assert.ok(keys.includes('list.focusHighlightForeground'));
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

    test('activity bar background meets 4.5:1 contrast with white on mid-luminance palette', () => {
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

        assertWhiteContrast(result['activityBar.background'], 'Activity bar background');
        assert.ok(
            result['activityBar.foreground'].startsWith(WHITE_HEX),
            'Activity bar foreground should be white'
        );
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
        assertAlphaForegroundContrast(
            inactiveFg,
            result['activityBar.background'],
            'Activity bar inactive foreground'
        );
    });

    test('status bar background meets 4.5:1 contrast with white on tricky palette', () => {
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

        assertWhiteContrast(result['statusBar.background'], 'Status bar background');
        assert.ok(
            result['statusBar.foreground'].startsWith(WHITE_HEX),
            'Status bar foreground should be white'
        );
    });

    test('sidebar background meets 4.5:1 contrast with white', () => {
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

        assertWhiteContrast(result['sideBar.background'], 'Side bar background');
        assert.ok(
            result['sideBar.foreground'].startsWith(WHITE_HEX),
            'Side bar foreground should be white'
        );
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
        assertAlphaForegroundContrast(
            inactiveFg,
            result['titleBar.inactiveBackground'],
            'Title bar inactive foreground'
        );
    });

    test('all section backgrounds meet 4.5:1 with white across tricky palettes', () => {
        const trickyColors = ['#ff8c00', '#808080', '#e74c3c', '#2ecc71', '#3498db', '#f39c12'];
        const backgroundKeys = [
            'titleBar.activeBackground',
            'activityBar.background',
            'statusBar.background',
            'tab.activeBackground',
            'sideBar.background',
            'activityBarBadge.background',
            'statusBarItem.remoteBackground'
        ];

        for (const baseColor of trickyColors) {
            const palette = generatePalette(baseColor, 'dominant', 4.5);
            const config = makeConfig({
                colorTitleBar: true,
                colorActivityBar: true,
                colorStatusBar: true,
                colorTabBar: true,
                colorSideBar: true
            });
            const result = buildColorCustomizations(palette, config);

            for (const key of backgroundKeys) {
                const bg = result[key];
                if (!bg) { continue; }
                assertWhiteContrast(bg, `${key} on base ${baseColor}`);
            }
        }
    });

    test('new sub-element foreground keys are white for colored side bar', () => {
        const config = makeConfig({ colorSideBar: true });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        const keys = [
            'sideBar.foreground',
            'sideBarTitle.foreground',
            'sideBarSectionHeader.foreground',
            'icon.foreground',
            'list.activeSelectionForeground',
            'list.inactiveSelectionForeground',
            'list.hoverForeground',
            'list.focusForeground',
            'list.focusHighlightForeground'
        ];

        for (const key of keys) {
            assert.ok(result[key].startsWith(WHITE_HEX), `${key} should be white`);
        }
    });

    test('badge and remote foreground keys are white when sections are colored', () => {
        const config = makeConfig({ colorActivityBar: true, colorStatusBar: true });
        const result = buildColorCustomizations(TEST_PALETTE, config);

        const keys = [
            'activityBarBadge.foreground',
            'statusBarItem.remoteForeground'
        ];

        for (const key of keys) {
            assert.ok(result[key].startsWith(WHITE_HEX), `${key} should be white`);
        }
    });
});
