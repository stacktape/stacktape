import { existsSync, readdir } from 'fs-extra';
import { join } from 'node:path';

export type ConfigFormat = 'typescript' | 'yaml';

type ProjectLanguageIndicators = {
  typescript: number;
  javascript: number;
  other: number;
};

/**
 * Detects the best config format based on project structure.
 * Returns 'typescript' for JS/TS projects, 'yaml' for others.
 */
export const detectConfigFormat = async (cwd: string = process.cwd()): Promise<ConfigFormat> => {
  const indicators = await scanProjectLanguageIndicators(cwd);

  // If it's predominantly a JS/TS project, use TypeScript config
  const jstsScore = indicators.typescript + indicators.javascript;
  const totalScore = jstsScore + indicators.other;

  // Use TypeScript if JS/TS indicators are >= 50% of total
  if (totalScore === 0 || jstsScore >= totalScore * 0.5) {
    return 'typescript';
  }

  return 'yaml';
};

/**
 * Scans the project for language indicators
 */
const scanProjectLanguageIndicators = async (cwd: string): Promise<ProjectLanguageIndicators> => {
  const indicators: ProjectLanguageIndicators = {
    typescript: 0,
    javascript: 0,
    other: 0
  };

  // Check for TypeScript indicators
  if (existsSync(join(cwd, 'tsconfig.json'))) {
    indicators.typescript += 10;
  }
  if (existsSync(join(cwd, 'tsconfig.base.json'))) {
    indicators.typescript += 5;
  }

  // Check for package.json (indicates JS/TS project)
  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    indicators.javascript += 5;

    try {
      // eslint-disable-next-line ts/no-require-imports
      const packageJson = require(packageJsonPath);
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // TypeScript dependency
      if (allDeps.typescript) {
        indicators.typescript += 8;
      }

      // Common JS/TS frameworks
      const jsFrameworks = [
        'react',
        'vue',
        'angular',
        'next',
        'nuxt',
        'svelte',
        'express',
        'fastify',
        'nestjs',
        'hono'
      ];
      for (const framework of jsFrameworks) {
        if (allDeps[framework]) {
          indicators.javascript += 3;
          break;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check for Python indicators
  if (
    existsSync(join(cwd, 'requirements.txt')) ||
    existsSync(join(cwd, 'pyproject.toml')) ||
    existsSync(join(cwd, 'setup.py'))
  ) {
    indicators.other += 10;
  }

  // Check for Go indicators
  if (existsSync(join(cwd, 'go.mod')) || existsSync(join(cwd, 'go.sum'))) {
    indicators.other += 10;
  }

  // Check for Rust indicators
  if (existsSync(join(cwd, 'Cargo.toml'))) {
    indicators.other += 10;
  }

  // Check for Ruby indicators
  if (existsSync(join(cwd, 'Gemfile'))) {
    indicators.other += 10;
  }

  // Check for Java/Kotlin indicators
  if (
    existsSync(join(cwd, 'pom.xml')) ||
    existsSync(join(cwd, 'build.gradle')) ||
    existsSync(join(cwd, 'build.gradle.kts'))
  ) {
    indicators.other += 10;
  }

  // Check for .NET indicators
  if (existsSync(join(cwd, 'Program.cs')) || (await hasFileWithExtension(cwd, '.csproj'))) {
    indicators.other += 10;
  }

  // Sample file extensions in the root and src directories
  const extensionCounts = await countFileExtensions(cwd);

  indicators.typescript += (extensionCounts.ts + extensionCounts.tsx) * 2;
  indicators.javascript += (extensionCounts.js + extensionCounts.jsx) * 1;
  indicators.other +=
    (extensionCounts.py + extensionCounts.go + extensionCounts.rs + extensionCounts.java + extensionCounts.rb) * 2;

  return indicators;
};

/**
 * Counts file extensions in the project (shallow scan)
 */
const countFileExtensions = async (cwd: string): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {
    ts: 0,
    tsx: 0,
    js: 0,
    jsx: 0,
    py: 0,
    go: 0,
    rs: 0,
    java: 0,
    rb: 0
  };

  const dirsToScan = [cwd];
  const srcDir = join(cwd, 'src');
  if (existsSync(srcDir)) {
    dirsToScan.push(srcDir);
  }

  for (const dir of dirsToScan) {
    try {
      const files = await readdir(dir);
      for (const file of files) {
        const ext = file.split('.').pop()?.toLowerCase();
        if (ext && ext in counts) {
          counts[ext]++;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return counts;
};

/**
 * Checks if directory has any file with given extension
 */
const hasFileWithExtension = async (cwd: string, ext: string): Promise<boolean> => {
  try {
    const files = await readdir(cwd);
    return files.some((f) => f.endsWith(ext));
  } catch {
    return false;
  }
};
