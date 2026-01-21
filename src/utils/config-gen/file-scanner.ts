import { join, basename, extname } from 'node:path';
import { readdir, readFile, stat } from 'fs-extra';
import { stringMatchesGlob } from '@shared/utils/misc';

// ============ Default Ignore Patterns ============

export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
  '**/target/**',
  '**/*.lock',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lockb',
  '**/.env',
  '**/.env.*',
  '**/*.log',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map'
];

// ============ File Listing ============

/**
 * Recursively lists all files in a directory.
 * Returns paths relative to the directory root.
 */
export const listAllFilesInDirectory = async (
  directoryPath: string,
  ignoreGlobPatterns: string[] = DEFAULT_IGNORE_PATTERNS
): Promise<string[]> => {
  const fileList: string[] = [];

  async function readDirRecursive(currentPath: string, relativePath: string = '') {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return; // Skip directories we can't read
    }

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      // Check if should be ignored
      if (ignoreGlobPatterns.some((pattern) => stringMatchesGlob(relPath, pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        await readDirRecursive(fullPath, relPath);
      } else if (entry.isFile()) {
        fileList.push(relPath);
      }
    }
  }

  await readDirRecursive(directoryPath);
  return fileList;
};

// ============ Pretty Print File Tree ============

/**
 * Creates a pretty-printed file tree string for display.
 * Limits files per extension per directory to avoid overwhelming output.
 */
export const getPrettyPrintedFiles = (files: string[], maxPerExtension: number = 3): string => {
  const filteredFiles = filterFilesByExtensionLimit(files, maxPerExtension);
  const fileTree: Record<string, any> = {};

  // Build tree structure
  for (const filepath of filteredFiles) {
    const parts = filepath.split('/');
    let current = fileTree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // File
        current[part] = null;
      } else {
        // Directory
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  // Format tree to string
  const formatTree = (node: Record<string, any>, indent: string = ''): string => {
    return Object.entries(node)
      .sort(([a, aVal], [b, bVal]) => {
        // Directories first
        const aIsDir = aVal !== null;
        const bIsDir = bVal !== null;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      })
      .map(([name, children]) => {
        const isFolder = children !== null;
        const icon = isFolder ? '\u{1F4C1}' : '\u{1F4C4}';
        const line = `${indent}${icon} ${name}`;
        const childLines = isFolder ? `\n${formatTree(children, `${indent}  `)}` : '';
        return line + childLines;
      })
      .join('\n');
  };

  return formatTree(fileTree);
};

/**
 * Limits the number of files per extension per directory.
 */
const filterFilesByExtensionLimit = (filePaths: string[], limit: number = 3): string[] => {
  const fileMap: Map<string, Record<string, number>> = new Map();
  const result: string[] = [];

  for (const filePath of filePaths) {
    const parts = filePath.split('/');
    const directory = parts.slice(0, -1).join('/') || '.';
    const fileName = parts[parts.length - 1];
    const extension = fileName.includes('.') ? fileName.split('.').pop()! : '';

    if (!fileMap.has(directory)) {
      fileMap.set(directory, {});
    }

    const dirExtensions = fileMap.get(directory)!;
    if (!dirExtensions[extension]) {
      dirExtensions[extension] = 0;
    }

    if (dirExtensions[extension] < limit) {
      result.push(filePath);
      dirExtensions[extension]++;
    }
  }

  return result;
};

// ============ File Content Reading ============

/**
 * Reads a file and intelligently truncates its content based on file type.
 */
export const tryGetContentTruncated = async (filePath: string, repoRoot: string): Promise<string> => {
  try {
    const absolutePath = join(repoRoot, filePath);
    
    // Check file size first
    const stats = await stat(absolutePath);
    if (stats.size > 1024 * 1024) {
      // Skip files > 1MB
      return '[File too large - skipped]';
    }

    const content = await readFile(absolutePath, 'utf8');
    const fileName = basename(filePath);

    // For package.json, extract only relevant sections
    if (fileName === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        const extracted = {
          name: pkg.name,
          version: pkg.version,
          scripts: pkg.scripts,
          dependencies: pkg.dependencies,
          devDependencies: pkg.devDependencies,
          main: pkg.main,
          type: pkg.type,
          engines: pkg.engines
        };
        return JSON.stringify(extracted, null, 2);
      } catch {
        // If parsing fails, continue with normal truncation
      }
    }

    // Skip lock files
    if (
      fileName.endsWith('-lock.json') ||
      fileName === 'package-lock.json' ||
      fileName === 'yarn.lock' ||
      fileName === 'pnpm-lock.yaml' ||
      fileName === 'bun.lockb'
    ) {
      return '[Lock file - skipped for brevity]';
    }

    // Python requirements - show all if small
    if (fileName === 'requirements.txt' || fileName === 'Pipfile' || fileName === 'pyproject.toml') {
      return content.length > 5000 ? `${content.substring(0, 5000)}\n... (truncated)` : content;
    }

    // Config files (JSON, YAML, TOML) - keep all if reasonable size
    if (/\.(json|ya?ml|toml)$/.test(fileName)) {
      if (content.length < 10000) {
        return content;
      }
      const lines = content.split('\n');
      if (lines.length > 300) {
        return `${lines.slice(0, 300).join('\n')}\n\n... (truncated ${lines.length - 300} lines)`;
      }
      return content;
    }

    // Code files - limit to 200 lines
    if (/\.(ts|tsx|js|jsx|py|java|go|rb|rs|php|cs)$/.test(fileName)) {
      const lines = content.split('\n');
      if (lines.length > 200) {
        return `${lines.slice(0, 200).join('\n')}\n\n... (truncated ${lines.length - 200} lines)`;
      }
      return content;
    }

    // Dockerfiles - keep all (usually small)
    if (/^Dockerfile/i.test(fileName) || /docker-compose/.test(fileName)) {
      return content;
    }

    // README files - truncate if very long
    if (/^README/i.test(fileName)) {
      const lines = content.split('\n');
      if (lines.length > 100) {
        return `${lines.slice(0, 100).join('\n')}\n\n... (truncated ${lines.length - 100} lines)`;
      }
      return content;
    }

    // Other files - conservative truncation
    const lines = content.split('\n');
    if (lines.length > 150) {
      return `${lines.slice(0, 150).join('\n')}\n\n... (truncated ${lines.length - 150} lines)`;
    }

    return content;
  } catch (error) {
    return `[Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
};

// ============ Utilities ============

/**
 * Gets the total count of files, excluding ignored patterns.
 */
export const getFileCount = async (
  directoryPath: string,
  ignorePatterns: string[] = DEFAULT_IGNORE_PATTERNS
): Promise<number> => {
  const files = await listAllFilesInDirectory(directoryPath, ignorePatterns);
  return files.length;
};
