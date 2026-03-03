import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

/**
 * Checks if a directory is inside a git repository.
 * Returns the absolute .git directory path, or null if not a git repo.
 */
export async function getGitDir(workspacePath: string): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync('git', ['rev-parse', '--git-dir'], {
            cwd: workspacePath
        });
        const gitDir = stdout.trim();
        // git rev-parse --git-dir returns relative path if inside repo, absolute if outside
        return path.isAbsolute(gitDir) ? gitDir : path.resolve(workspacePath, gitDir);
    } catch {
        return null;
    }
}

/**
 * Checks if a file path is ignored by git (.gitignore, .git/info/exclude, etc).
 */
export async function isGitIgnored(workspacePath: string, filePath: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['check-ignore', '-q', filePath], {
            cwd: workspacePath
        });
        // Exit code 0 means the file is ignored
        return true;
    } catch {
        // Exit code 1 means not ignored (or git error)
        return false;
    }
}

/**
 * Checks if a file path is tracked by git (committed at least once).
 */
export async function isGitTracked(workspacePath: string, filePath: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync('git', ['ls-files', filePath], {
            cwd: workspacePath
        });
        return stdout.trim().length > 0;
    } catch {
        return false;
    }
}

/**
 * Adds a path to .git/info/exclude if not already present.
 * Creates the file/directory if needed.
 * Returns true if the pattern was added, false if already present.
 */
export async function addToGitExclude(gitDir: string, pattern: string): Promise<boolean> {
    const excludePath = path.join(gitDir, 'info', 'exclude');

    // Read existing content if file exists
    let existingContent = '';
    try {
        existingContent = await fs.promises.readFile(excludePath, 'utf8');
    } catch {
        // File doesn't exist yet, that's fine
    }

    // Check if pattern already present (exact line match)
    const lines = existingContent.split('\n');
    if (lines.some(line => line.trim() === pattern)) {
        return false;
    }

    // Ensure the info directory exists
    await fs.promises.mkdir(path.join(gitDir, 'info'), { recursive: true });

    // Append the pattern with a newline
    const suffix = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';
    await fs.promises.writeFile(excludePath, existingContent + suffix + pattern + '\n', 'utf8');

    return true;
}
