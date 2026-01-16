import { join, isAbsolute } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { exec } from '@shared/utils/exec';
import { serialize } from '@shared/utils/misc';

/**
 * Strips ANSI escape codes from a string.
 */
const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
};

type HostingBucketBuildProps = {
  name: string;
  build: {
    command: string;
    workingDirectory?: string;
  };
  progressLogger: ProgressLogger;
};

type BuildOutputInfo = {
  totalSize?: string;
  gzippedSize?: string;
  fileCount?: number;
  buildTime?: string;
  tool?: string;
};

/**
 * Parses Vite build output.
 * Example output:
 * vite v5.0.0 building for production...
 * ✓ 123 modules transformed.
 * dist/index.html                0.45 kB │ gzip:  0.29 kB
 * dist/assets/index-abc123.css   1.23 kB │ gzip:  0.58 kB
 * dist/assets/index-def456.js   45.67 kB │ gzip: 14.32 kB
 * ✓ built in 1.23s
 */
const parseViteOutput = (output: string): BuildOutputInfo | null => {
  const info: BuildOutputInfo = { tool: 'Vite' };

  // Match build time: "built in 1.23s" or "built in 123ms"
  const timeMatch = output.match(/built in ([\d.]+)(s|ms)/i);
  if (timeMatch) {
    info.buildTime = `${timeMatch[1]}${timeMatch[2]}`;
  }

  // Match file sizes and sum them up - look for lines with "kB │ gzip:" pattern
  const sizeLines = output.match(/[\d.]+\s*kB\s*│\s*gzip:\s*[\d.]+\s*kB/g);
  if (sizeLines?.length) {
    let totalKB = 0;
    let totalGzipKB = 0;
    sizeLines.forEach((line) => {
      const [size, gzip] = line.split('│').map((s) => parseFloat(s.replace(/[^\d.]/g, '')));
      if (!Number.isNaN(size)) totalKB += size;
      if (!Number.isNaN(gzip)) totalGzipKB += gzip;
    });
    info.totalSize = `${totalKB.toFixed(2)} kB`;
    info.gzippedSize = `${totalGzipKB.toFixed(2)} kB`;
    info.fileCount = sizeLines.length;
  }

  // Check if we got meaningful info
  return info.totalSize || info.buildTime ? info : null;
};

/**
 * Parses Webpack build output.
 * Example output:
 * asset main.js 125 KiB [emitted] [minimized] (name: main)
 * asset index.html 1.2 KiB [emitted]
 * webpack 5.89.0 compiled successfully in 2345 ms
 */
const parseWebpackOutput = (output: string): BuildOutputInfo | null => {
  const info: BuildOutputInfo = { tool: 'Webpack' };

  // Match build time: "compiled successfully in 2345 ms"
  const timeMatch = output.match(/compiled\s+(?:successfully\s+)?in\s+(\d+)\s*ms/i);
  if (timeMatch) {
    const ms = parseInt(timeMatch[1], 10);
    info.buildTime = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
  }

  // Match asset sizes: "asset main.js 125 KiB" or "asset main.js 125 bytes"
  const assetMatches = output.match(/asset\s+\S+\s+([\d.]+)\s*(KiB|bytes|MiB)/gi);
  if (assetMatches?.length) {
    let totalBytes = 0;
    assetMatches.forEach((match) => {
      const sizeMatch = match.match(/([\d.]+)\s*(KiB|bytes|MiB)/i);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toLowerCase();
        if (unit === 'kib') totalBytes += size * 1024;
        else if (unit === 'mib') totalBytes += size * 1024 * 1024;
        else totalBytes += size;
      }
    });
    info.totalSize =
      totalBytes >= 1024 * 1024
        ? `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
        : `${(totalBytes / 1024).toFixed(2)} kB`;
    info.fileCount = assetMatches.length;
  }

  return info.totalSize || info.buildTime ? info : null;
};

/**
 * Parses Angular CLI build output.
 * Example output:
 * Initial chunk files | Names         | Raw size | Estimated transfer size
 * main.js             | main          | 123.45 kB | 34.56 kB
 * Application bundle generation complete. [1.234 seconds]
 */
const parseAngularOutput = (output: string): BuildOutputInfo | null => {
  const info: BuildOutputInfo = { tool: 'Angular' };

  // Match build time: "[1.234 seconds]" or "✔ Compiled successfully." with time
  const timeMatch = output.match(/\[([\d.]+)\s*seconds?\]/i) || output.match(/in\s+([\d.]+)\s*s/i);
  if (timeMatch) {
    info.buildTime = `${timeMatch[1]}s`;
  }

  // Match Initial/Lazy chunk file sizes
  // Format: "main.js | main | 123.45 kB | 34.56 kB"
  const chunkMatches = output.match(/\|\s*([\d.]+)\s*kB\s*\|\s*([\d.]+)\s*kB/g);
  if (chunkMatches?.length) {
    let totalKB = 0;
    let transferKB = 0;
    chunkMatches.forEach((match) => {
      const sizes = match.match(/[\d.]+/g);
      if (sizes?.length >= 2) {
        totalKB += parseFloat(sizes[0]);
        transferKB += parseFloat(sizes[1]);
      }
    });
    info.totalSize = `${totalKB.toFixed(2)} kB`;
    info.gzippedSize = `${transferKB.toFixed(2)} kB`;
    info.fileCount = chunkMatches.length;
  }

  return info.totalSize || info.buildTime ? info : null;
};

/**
 * Parses Vue CLI / Vite (Vue) build output.
 * Similar to Vite output since Vue 3+ uses Vite by default.
 */
const parseVueOutput = (output: string): BuildOutputInfo | null => {
  // Try Vite parser first (Vue 3+ with Vite)
  const viteResult = parseViteOutput(output);
  if (viteResult) {
    viteResult.tool = 'Vue';
    return viteResult;
  }

  // Legacy Vue CLI output: "File Size Gzipped"
  const info: BuildOutputInfo = { tool: 'Vue CLI' };

  const sizeMatches = output.match(/dist\/\S+\s+([\d.]+)\s*(KiB|kB)\s+([\d.]+)\s*(KiB|kB)/g);
  if (sizeMatches?.length) {
    let totalKB = 0;
    let gzipKB = 0;
    sizeMatches.forEach((match) => {
      const nums = match.match(/[\d.]+/g);
      if (nums?.length >= 2) {
        totalKB += parseFloat(nums[0]);
        gzipKB += parseFloat(nums[1]);
      }
    });
    info.totalSize = `${totalKB.toFixed(2)} kB`;
    info.gzippedSize = `${gzipKB.toFixed(2)} kB`;
    info.fileCount = sizeMatches.length;
  }

  return info.totalSize ? info : null;
};

/**
 * Parses Create React App build output.
 * Example output:
 * File sizes after gzip:
 *   47.86 kB  build/static/js/main.abc123.js
 *   1.78 kB   build/static/css/main.def456.css
 */
const parseCRAOutput = (output: string): BuildOutputInfo | null => {
  const info: BuildOutputInfo = { tool: 'Create React App' };

  // Match "File sizes after gzip:" section
  if (!output.includes('File sizes after gzip')) {
    return null;
  }

  // Match gzipped sizes: "47.86 kB  build/static/js/main.abc123.js"
  const sizeMatches = output.match(/([\d.]+)\s*(kB|KB|B)\s+build\//gi);
  if (sizeMatches?.length) {
    let totalKB = 0;
    sizeMatches.forEach((match) => {
      const sizeMatch = match.match(/([\d.]+)\s*(kB|KB|B)/i);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toLowerCase();
        if (unit === 'b') totalKB += size / 1024;
        else totalKB += size;
      }
    });
    info.gzippedSize = `${totalKB.toFixed(2)} kB`;
    info.fileCount = sizeMatches.length;
  }

  return info.gzippedSize ? info : null;
};

/**
 * Parses SvelteKit / Svelte build output.
 * Example output:
 * vite v5.0.0 building SSR bundle for production...
 * .svelte-kit/output/client/_app/immutable/chunks/index.abc123.js  12.34 kB │ gzip: 4.56 kB
 */
const parseSvelteOutput = (output: string): BuildOutputInfo | null => {
  // SvelteKit uses Vite, so try Vite parser
  const viteResult = parseViteOutput(output);
  if (viteResult) {
    viteResult.tool = output.includes('svelte') || output.includes('.svelte-kit') ? 'SvelteKit' : viteResult.tool;
    return viteResult;
  }
  return null;
};

/**
 * Parses generic build output - tries to extract any size/time info.
 */
const parseGenericOutput = (output: string): BuildOutputInfo | null => {
  const info: BuildOutputInfo = {};

  // Try to find build time patterns
  const timePatterns = [
    /built?\s+in\s+([\d.]+)\s*(s|ms|seconds?|milliseconds?)/i,
    /completed?\s+in\s+([\d.]+)\s*(s|ms|seconds?|milliseconds?)/i,
    /finished?\s+in\s+([\d.]+)\s*(s|ms|seconds?|milliseconds?)/i,
    /took\s+([\d.]+)\s*(s|ms|seconds?|milliseconds?)/i,
    /\[([\d.]+)\s*(s|ms)\]/i
  ];

  for (const pattern of timePatterns) {
    const match = output.match(pattern);
    if (match) {
      const time = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('ms') || unit.startsWith('milli')) {
        info.buildTime = time >= 1000 ? `${(time / 1000).toFixed(2)}s` : `${time}ms`;
      } else {
        info.buildTime = `${time}s`;
      }
      break;
    }
  }

  return info.buildTime ? info : null;
};

/**
 * Parses build output from various tools and returns structured info.
 */
export const parseBuildOutput = (output: string): BuildOutputInfo | null => {
  // Try each parser in order of specificity
  const parsers = [
    parseViteOutput,
    parseWebpackOutput,
    parseAngularOutput,
    parseVueOutput,
    parseCRAOutput,
    parseSvelteOutput,
    parseGenericOutput
  ];

  for (const parser of parsers) {
    const result = parser(output);
    if (result) return result;
  }

  return null;
};

/**
 * Formats build info into a final message for the progress logger.
 */
const formatFinalMessage = (info: BuildOutputInfo | null): string => {
  if (!info) return 'Build completed';

  const parts: string[] = [];

  if (info.tool) {
    parts.push(info.tool);
  }

  if (info.gzippedSize) {
    parts.push(`${info.gzippedSize} gzipped`);
  } else if (info.totalSize) {
    parts.push(info.totalSize);
  }

  if (info.fileCount) {
    parts.push(`${info.fileCount} files`);
  }

  if (info.buildTime) {
    parts.push(info.buildTime);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Build completed';
};

/**
 * Builds hosting bucket frontend assets.
 */
export const buildHostingBucket = async ({
  name,
  build,
  progressLogger
}: HostingBucketBuildProps): Promise<{ success: boolean; finalMessage: string }> => {
  await progressLogger.startEvent({
    eventType: 'BUILD_HOSTING_BUCKET',
    description: `Building ${name}`
  });

  const workingDir = build.workingDirectory
    ? isAbsolute(build.workingDirectory)
      ? build.workingDirectory
      : join(globalStateManager.workingDir, build.workingDirectory)
    : globalStateManager.workingDir;

  // Parse command - split by spaces but respect quotes
  const commandParts = build.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [build.command];
  const [command, ...args] = commandParts.map((part) => part.replace(/^"|"$/g, ''));

  // Collect output for parsing
  let outputBuffer = '';

  try {
    await exec(command, args, {
      cwd: workingDir,
      env: { ...serialize(process.env), FORCE_COLOR: '1' },
      onOutputLine: (line) => {
        outputBuffer += line + '\n';
      }
    });

    const cleanedOutput = stripAnsi(outputBuffer);
    const buildInfo = parseBuildOutput(cleanedOutput);
    const finalMessage = formatFinalMessage(buildInfo);

    await progressLogger.finishEvent({
      eventType: 'BUILD_HOSTING_BUCKET',
      finalMessage
    });

    return { success: true, finalMessage };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await progressLogger.finishEvent({
      eventType: 'BUILD_HOSTING_BUCKET',
      finalMessage: `Build failed: ${errorMessage.split('\n')[0]}`
    });

    throw err;
  }
};
