import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig } from '../utils/config';
import { checkFile, resolveWorkspacePath, isImageFile, findFilesWithGlob } from '../utils/fileHelpers';
import { log, logWarning, logError } from '../utils/logger';

// Per-workspace detection caches to avoid repeated filesystem operations on every findIcon() call
const monorepoCache = new Map<string, boolean>();
const frameworkCache = new Map<string, string>();

/**
 * Clears all detection caches. Should be called when workspace folders change.
 */
export function clearDetectionCaches(): void {
    monorepoCache.clear();
    frameworkCache.clear();
}

export interface IconSearchResult {
    found: boolean;
    filePath?: string;
    relativePath?: string;
    source: 'auto' | 'manual' | 'default';
    error?: string;
}

/**
 * Framework-specific favicon locations, ordered by priority.
 * These supplement the user-configurable patterns.
 */
const FRAMEWORK_PATTERNS: Record<string, string[]> = {
    nextjs: [
        'app/favicon.png',
        'app/icon.png',
        'app/icon.svg',
        'app/favicon.svg',
        'public/favicon.png',
        'public/favicon.svg',
        'src/app/favicon.png',
        'src/app/favicon.svg',
        'app/favicon.ico',
        'public/favicon.ico',
        'src/app/favicon.ico'
    ],
    react: [
        'public/favicon.png',
        'public/favicon.svg',
        'src/favicon.png',
        'src/favicon.svg',
        'public/favicon.ico',
        'src/favicon.ico'
    ],
    expo: [
        'assets/favicon.png',
        'assets/app-icon.png',
        'assets/icon.png',
        'assets/images/icon.png',
        'assets/images/favicon.png'
    ],
    rails: [
        'app/assets/images/favicon.png',
        'app/assets/images/favicon.svg',
        'public/favicon.png',
        'public/favicon.svg',
        'app/assets/images/favicon.ico',
        'public/favicon.ico'
    ],
    vite: [
        'public/favicon.svg',
        'public/vite.svg',
        'public/favicon.png',
        'src/favicon.svg',
        'public/favicon.ico'
    ],
    generic: [
        'favicon.png',
        'favicon.svg',
        'icon.png',
        'icon.svg',
        'favicon.ico',
        'icon.ico'
    ]
};

/**
 * Size-specific and platform-specific favicon patterns.
 * These are common in modern web projects and often higher quality.
 */
const SIZE_SPECIFIC_PATTERNS: string[] = [
    // Size-specific favicons (prioritize larger for better color extraction)
    'public/android-chrome-512x512.png',
    'android-chrome-512x512.png',
    'public/android-chrome-192x192.png',
    'android-chrome-192x192.png',
    'public/apple-touch-icon.png',
    'apple-touch-icon.png',
    'public/favicon-96x96.png',
    'favicon-96x96.png',
    'public/favicon-32x32.png',
    'favicon-32x32.png',
    'public/favicon-16x16.png',
    'favicon-16x16.png',
    // Apple touch icons (various sizes)
    'public/apple-touch-icon-180x180.png',
    'apple-touch-icon-180x180.png',
    'public/apple-touch-icon-152x152.png',
    'apple-touch-icon-152x152.png',
    'public/apple-touch-icon-120x120.png',
    'apple-touch-icon-120x120.png',
    // MS Tile icons
    'public/mstile-150x150.png',
    'mstile-150x150.png',
    'public/mstile-310x310.png',
    'mstile-310x310.png',
    // Safari pinned tab
    'public/safari-pinned-tab.svg',
    'safari-pinned-tab.svg',
    // Assets folder variants
    'assets/android-chrome-512x512.png',
    'assets/android-chrome-192x192.png',
    'assets/apple-touch-icon.png',
    'assets/favicon-32x32.png',
];

/**
 * Generic logo/brand icon patterns as last resort.
 */
const LOGO_PATTERNS: string[] = [
    'public/logo.png',
    'public/logo.svg',
    'assets/logo.png',
    'assets/logo.svg',
    'src/assets/logo.png',
    'src/assets/logo.svg',
    'public/brand.png',
    'public/brand.svg',
    'assets/brand.png',
    'assets/brand.svg',
    'logo.png',
    'logo.svg',
    'brand.png',
    'brand.svg',
];

/**
 * Monorepo-specific patterns to search in common monorepo structures.
 */
const MONOREPO_PATTERNS: string[] = [
    // Turborepo / common monorepo structures (PNG/SVG prioritized)
    'apps/*/public/favicon.png',
    'apps/*/public/favicon.svg',
    'apps/*/app/favicon.png',
    'apps/*/app/icon.png',
    'apps/*/app/icon.svg',
    'apps/web/public/favicon.png',
    'apps/web/public/favicon.svg',
    'apps/web/app/favicon.png',
    'apps/frontend/public/favicon.png',
    'apps/client/public/favicon.png',
    'apps/*/public/favicon.ico',
    'apps/*/app/favicon.ico',
    'apps/web/public/favicon.ico',
    'apps/web/app/favicon.ico',
    'apps/frontend/public/favicon.ico',
    'apps/client/public/favicon.ico',
    // Nx workspaces
    'packages/*/public/favicon.png',
    'packages/*/public/favicon.svg',
    'packages/*/assets/favicon.png',
    'packages/web/public/favicon.png',
    'packages/app/public/favicon.png',
    'packages/*/public/favicon.ico',
    'packages/*/assets/favicon.ico',
    'packages/web/public/favicon.ico',
    'packages/app/public/favicon.ico',
    // Lerna / yarn workspaces
    'modules/*/public/favicon.png',
    'services/*/public/favicon.png',
    'modules/*/public/favicon.ico',
    'services/*/public/favicon.ico',
    // Deep nested
    'src/*/public/favicon.png',
    'src/*/app/favicon.png',
    'src/*/public/favicon.ico',
    'src/*/app/favicon.ico',
];

/**
 * Detects the framework type based on project files.
 * Results are cached per workspace root path.
 */
async function detectFramework(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const rootPath = workspaceFolder.uri.fsPath;

    const cached = frameworkCache.get(rootPath);
    if (cached !== undefined) {
        return cached;
    }

    const result = await detectFrameworkImpl(workspaceFolder);
    frameworkCache.set(rootPath, result);
    return result;
}

async function detectFrameworkImpl(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const rootPath = workspaceFolder.uri.fsPath;

    // Check for Next.js
    const nextConfigPatterns = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
    for (const pattern of nextConfigPatterns) {
        const checkResult = await checkFile(path.join(rootPath, pattern));
        if (checkResult.exists) {
            log(`Detected Next.js project`);
            return 'nextjs';
        }
    }

    // Check for Expo
    const appJsonPath = path.join(rootPath, 'app.json');
    const appJsonResult = await checkFile(appJsonPath);
    if (appJsonResult.exists) {
        try {
            const fs = await import('fs');
            const content = await fs.promises.readFile(appJsonPath, 'utf-8');
            const appJson = JSON.parse(content);
            if (appJson.expo) {
                log(`Detected Expo project`);
                return 'expo';
            }
        } catch {
            // Not valid JSON or no expo key
        }
    }

    // Check for Rails
    const gemfilePath = path.join(rootPath, 'Gemfile');
    const gemfileResult = await checkFile(gemfilePath);
    if (gemfileResult.exists) {
        log(`Detected Rails project`);
        return 'rails';
    }

    // Check for Vite
    const viteConfigPatterns = ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'];
    for (const pattern of viteConfigPatterns) {
        const checkResult = await checkFile(path.join(rootPath, pattern));
        if (checkResult.exists) {
            log(`Detected Vite project`);
            return 'vite';
        }
    }

    // Check for React (Create React App or similar)
    const packageJsonPath = path.join(rootPath, 'package.json');
    const packageJsonResult = await checkFile(packageJsonPath);
    if (packageJsonResult.exists) {
        try {
            const fs = await import('fs');
            const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(content);
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (deps.react) {
                log(`Detected React project`);
                return 'react';
            }
        } catch {
            // Not valid JSON
        }
    }

    return 'generic';
}

/**
 * Checks if the workspace appears to be a monorepo.
 * Results are cached per workspace root path.
 */
async function isMonorepo(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    const rootPath = workspaceFolder.uri.fsPath;

    if (monorepoCache.has(rootPath)) {
        return monorepoCache.get(rootPath)!;
    }

    const result = await isMonorepoImpl(workspaceFolder);
    monorepoCache.set(rootPath, result);
    return result;
}

async function isMonorepoImpl(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
    const rootPath = workspaceFolder.uri.fsPath;
    const fs = await import('fs');

    // Check for common monorepo indicator files in parallel
    const indicators = [
        'pnpm-workspace.yaml',
        'lerna.json',
        'turbo.json',
        'nx.json',
        'rush.json'
    ];

    const indicatorChecks = await Promise.allSettled(
        indicators.map(f => fs.promises.access(path.join(rootPath, f)))
    );
    if (indicatorChecks.some(r => r.status === 'fulfilled')) {
        return true;
    }

    // Check package.json for workspaces field
    try {
        const packageJsonPath = path.join(rootPath, 'package.json');
        const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        if (packageJson.workspaces) {
            return true;
        }
    } catch {
        // No package.json or invalid JSON
    }

    // Check for apps/ or packages/ directories in parallel
    const monorepoFolders = ['apps', 'packages', 'modules'];
    const dirChecks = await Promise.allSettled(
        monorepoFolders.map(folder => fs.promises.stat(path.join(rootPath, folder)))
    );
    for (let i = 0; i < dirChecks.length; i++) {
        const check = dirChecks[i];
        if (check.status === 'fulfilled' && check.value.isDirectory()) {
            return true;
        }
    }

    return false;
}

/**
 * Gets the search patterns for a workspace, combining framework-specific
 * patterns with user-configured patterns.
 */
async function getSearchPatterns(workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const config = getConfig(workspaceFolder);
    const framework = await detectFramework(workspaceFolder);
    const monorepo = await isMonorepo(workspaceFolder);

    // Combine framework patterns with user patterns
    const frameworkPatterns = FRAMEWORK_PATTERNS[framework] ?? FRAMEWORK_PATTERNS.generic;
    let allPatterns = [...frameworkPatterns, ...config.iconSearchPatterns];

    // Add monorepo patterns if detected
    if (monorepo) {
        log('Detected monorepo structure, adding monorepo search patterns');
        allPatterns = [...allPatterns, ...MONOREPO_PATTERNS];
    }

    // Remove duplicates while preserving order
    return [...new Set(allPatterns)];
}

/**
 * Searches for a favicon in the workspace using configured patterns.
 */
async function searchForIcon(workspaceFolder: vscode.WorkspaceFolder): Promise<IconSearchResult> {
    const config = getConfig(workspaceFolder);
    const patterns = await getSearchPatterns(workspaceFolder);

    log(`Searching for favicon in ${workspaceFolder.name} with ${patterns.length} patterns`);

    // Helper function to search through a list of patterns
    const searchPatternList = async (patternList: string[], listName: string): Promise<IconSearchResult | null> => {
        for (const pattern of patternList) {
            try {
                // Handle glob patterns
                if (pattern.includes('*')) {
                    const files = await findFilesWithGlob(workspaceFolder, pattern, 1);
                    if (files.length > 0) {
                        const filePath = files[0].fsPath;
                        if (isImageFile(filePath)) {
                            const fileCheck = await checkFile(filePath);
                            if (fileCheck.exists && fileCheck.readable && fileCheck.size <= config.maxImageSize) {
                                log(`Found favicon via ${listName}: ${pattern} -> ${filePath}`);
                                return {
                                    found: true,
                                    filePath,
                                    relativePath: pattern,
                                    source: 'auto'
                                };
                            }
                        }
                    }
                } else {
                    // Direct path
                    const fullPath = resolveWorkspacePath(workspaceFolder, pattern);
                    if (isImageFile(fullPath)) {
                        const fileCheck = await checkFile(fullPath);
                        if (fileCheck.exists && fileCheck.readable) {
                            if (fileCheck.size > config.maxImageSize) {
                                logWarning(`Favicon ${pattern} exceeds size limit (${fileCheck.size} bytes)`);
                                continue;
                            }
                            log(`Found favicon via ${listName}: ${pattern}`);
                            return {
                                found: true,
                                filePath: fullPath,
                                relativePath: pattern,
                                source: 'auto'
                            };
                        }
                    }
                }
            } catch (error) {
                logError(`Error checking pattern ${pattern}`, error);
            }
        }
        return null;
    };

    // Search primary patterns (framework + monorepo + user-configured)
    const primaryResult = await searchPatternList(patterns, 'primary patterns');
    if (primaryResult) {
        return primaryResult;
    }

    // Search size-specific patterns (favicon-32x32.png, apple-touch-icon.png, etc.)
    log('No standard favicon found, trying size-specific patterns...');
    const sizeResult = await searchPatternList(SIZE_SPECIFIC_PATTERNS, 'size-specific patterns');
    if (sizeResult) {
        return sizeResult;
    }

    // Search generic logo patterns
    log('No size-specific icon found, trying generic logo patterns...');
    const logoResult = await searchPatternList(LOGO_PATTERNS, 'logo patterns');
    if (logoResult) {
        return logoResult;
    }

    // Fallback: deep wildcard search for any favicon file (PNG/SVG prioritized over ICO)
    log('No logo found, trying deep wildcard search...');
    const deepPatterns = [
        // Size-specific favicons (prioritize larger sizes)
        '**/android-chrome-512x512.png',
        '**/android-chrome-192x192.png',
        '**/apple-touch-icon*.png',
        '**/favicon-32x32.png',
        '**/favicon-16x16.png',
        // Standard favicons
        '**/favicon.png',
        '**/favicon.svg',
        '**/icon.png',
        '**/app-icon.png',
        '**/logo.png',
        '**/logo.svg',
        // ICO as last resort
        '**/favicon.ico'
    ];

    for (const deepPattern of deepPatterns) {
        try {
            const files = await findFilesWithGlob(workspaceFolder, deepPattern, 5);
            // Filter out node_modules and other unwanted directories
            const validFiles = files.filter(f => {
                const relativePath = path.relative(workspaceFolder.uri.fsPath, f.fsPath);
                return !relativePath.includes('node_modules') &&
                       !relativePath.includes('.git') &&
                       !relativePath.includes('dist') &&
                       !relativePath.includes('build') &&
                       !relativePath.includes('.next');
            });

            if (validFiles.length > 0) {
                const filePath = validFiles[0].fsPath;
                const fileCheck = await checkFile(filePath);
                if (fileCheck.exists && fileCheck.readable && fileCheck.size <= config.maxImageSize) {
                    const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
                    log(`Found favicon via deep search: ${relativePath}`);
                    return {
                        found: true,
                        filePath,
                        relativePath,
                        source: 'auto'
                    };
                }
            }
        } catch (error) {
            logError(`Error in deep search for ${deepPattern}`, error);
        }
    }

    logWarning(`No favicon found in ${workspaceFolder.name}`);
    return {
        found: false,
        source: 'auto',
        error: 'No favicon found in workspace'
    };
}

/**
 * Gets the icon path from manual configuration.
 */
async function getManualIconPath(workspaceFolder: vscode.WorkspaceFolder): Promise<IconSearchResult> {
    const config = getConfig(workspaceFolder);

    if (!config.iconPath) {
        return {
            found: false,
            source: 'manual',
            error: 'No icon path configured (projectColor.iconPath is empty)'
        };
    }

    try {
        const fullPath = resolveWorkspacePath(workspaceFolder, config.iconPath);

        if (!isImageFile(fullPath)) {
            return {
                found: false,
                source: 'manual',
                error: `Configured path is not an image file: ${config.iconPath}`
            };
        }

        const fileCheck = await checkFile(fullPath);

        if (!fileCheck.exists) {
            return {
                found: false,
                source: 'manual',
                error: `Configured icon file does not exist: ${config.iconPath}`
            };
        }

        if (!fileCheck.readable) {
            return {
                found: false,
                source: 'manual',
                error: `Cannot read configured icon file: ${config.iconPath}`
            };
        }

        if (fileCheck.size > config.maxImageSize) {
            return {
                found: false,
                source: 'manual',
                error: `Configured icon file exceeds size limit: ${config.iconPath}`
            };
        }

        log(`Using manually configured icon: ${config.iconPath}`);
        return {
            found: true,
            filePath: fullPath,
            relativePath: config.iconPath,
            source: 'manual'
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            found: false,
            source: 'manual',
            error: `Error accessing configured icon: ${errorMessage}`
        };
    }
}

/**
 * Main function to find the project icon.
 * Respects configuration for auto vs manual mode.
 */
export async function findIcon(workspaceFolder: vscode.WorkspaceFolder): Promise<IconSearchResult> {
    const config = getConfig(workspaceFolder);

    if (!config.enabled) {
        return {
            found: false,
            source: 'default',
            error: 'Project Color is disabled for this workspace'
        };
    }

    if (config.iconSourceMode === 'manual') {
        return getManualIconPath(workspaceFolder);
    }

    return searchForIcon(workspaceFolder);
}

/**
 * Validates that a given file path is a valid icon.
 */
export async function validateIconPath(
    filePath: string,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<IconSearchResult> {
    const config = getConfig(workspaceFolder);

    if (!isImageFile(filePath)) {
        return {
            found: false,
            source: 'manual',
            error: 'File is not a supported image format'
        };
    }

    const fileCheck = await checkFile(filePath);

    if (!fileCheck.exists) {
        return {
            found: false,
            source: 'manual',
            error: 'File does not exist'
        };
    }

    if (!fileCheck.readable) {
        return {
            found: false,
            source: 'manual',
            error: fileCheck.error ?? 'File is not readable'
        };
    }

    if (fileCheck.size > config.maxImageSize) {
        return {
            found: false,
            source: 'manual',
            error: `File exceeds size limit (${fileCheck.size} > ${config.maxImageSize} bytes)`
        };
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);

    return {
        found: true,
        filePath,
        relativePath,
        source: 'manual'
    };
}
