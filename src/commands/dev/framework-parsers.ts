/**
 * Framework-specific output parsers for dev servers.
 * Each parser extracts ready state, URL, compile time, and other status info.
 */

import { readJsonSync } from 'fs-extra';
import { join } from 'node:path';

export type FrameworkType =
  | 'next'
  | 'vite'
  | 'astro'
  | 'nuxt'
  | 'remix'
  | 'sveltekit'
  | 'angular'
  | 'gatsby'
  | 'cra'
  | 'webpack'
  | 'parcel'
  | 'turbopack'
  | 'rspack'
  | 'unknown';

export type ParsedOutput = {
  status?: 'ready' | 'compiling' | 'error';
  url?: string;
  port?: number;
  compileTime?: string;
  error?: string;
  hmrUpdate?: boolean;
};

/**
 * Strips ANSI escape codes from a string.
 */
export const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
};

/**
 * Detects framework from package.json in the working directory.
 */
export const detectFramework = (workingDir: string): FrameworkType => {
  try {
    const pkgPath = join(workingDir, 'package.json');
    const pkg = readJsonSync(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Order matters - check more specific frameworks first
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';
    if (deps.astro) return 'astro';
    if (deps['@sveltejs/kit']) return 'sveltekit';
    if (deps['@remix-run/dev'] || deps['@remix-run/react']) return 'remix';
    if (deps['@angular/cli'] || deps['@angular/core']) return 'angular';
    if (deps.gatsby) return 'gatsby';
    if (deps['react-scripts']) return 'cra';
    if (deps['@rspack/cli'] || deps['@rspack/core']) return 'rspack';
    if (deps.parcel || deps['parcel-bundler']) return 'parcel';
    if (deps.vite) return 'vite';
    if (deps.webpack || deps['webpack-dev-server']) return 'webpack';
    if (deps.turbopack || deps['@vercel/turbopack']) return 'turbopack';

    return 'unknown';
  } catch {
    return 'unknown';
  }
};

/**
 * Extracts port number from a URL or port string.
 */
const extractPort = (input: string): number | undefined => {
  const match = input.match(/:(\d{2,5})(?:\/|$|\s)/);
  return match ? parseInt(match[1], 10) : undefined;
};

/**
 * Normalizes time to a standard format (e.g., "407ms" or "1.5s").
 * Keeps original unit if under threshold to avoid precision loss.
 */
const normalizeTime = (value: string, unit: string): string => {
  const num = parseFloat(value);
  const lowerUnit = unit.toLowerCase();

  if (lowerUnit === 's' || lowerUnit === 'sec' || lowerUnit === 'seconds' || lowerUnit === 'second') {
    // Keep as seconds if >= 1s, otherwise convert to ms
    return num >= 1 ? `${num}s` : `${Math.round(num * 1000)}ms`;
  }
  if (lowerUnit === 'ms' || lowerUnit === 'milliseconds') {
    // Keep as ms - don't convert to seconds to preserve precision
    return `${Math.round(num)}ms`;
  }
  return `${num}${unit}`;
};

// =============================================================================
// NEXT.JS PARSER
// =============================================================================
// Output patterns (Next.js 13+, 14+, 15+):
// - "✓ Ready in 1.5s" (Next 14+)
// - "ready - started server on 0.0.0.0:3000, url: http://localhost:3000" (Next 13)
// - "- ready started server on [::]:3000, url: http://localhost:3000"
// - "○ Compiling /page ..."
// - "✓ Compiled /page in 234ms"
// - "⚠ Compiled with warnings"
// - "× Failed to compile"
// - "[HMR] Updated modules:" (turbopack)
// =============================================================================
const parseNextOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Ready patterns (multiple Next.js versions)
  // Next.js 14+: "✓ Ready in 1.5s"
  const readyTimeMatch = cleanLine.match(/ready in\s*([\d.]+)\s*(s|ms|sec)/i);
  if (readyTimeMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(readyTimeMatch[1], readyTimeMatch[2]);
  }

  // Next.js 13: "ready - started server on 0.0.0.0:3000, url: http://localhost:3000"
  // Next.js 14+: "- ready started server on [::]:3000, url: http://localhost:3000"
  const serverStartMatch = line.match(/started server on.*?(?:url:\s*)?(\bhttps?:\/\/[^\s,]+)/i);
  if (serverStartMatch) {
    result.status = 'ready';
    result.url = stripAnsi(serverStartMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
  }

  // URL extraction from various patterns
  const urlMatch = line.match(/(?:url:|local:)\s*(https?:\/\/[^\s,]+)/i);
  if (urlMatch) {
    result.url = stripAnsi(urlMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // Compiled patterns
  // "✓ Compiled /page in 234ms"
  // "✓ Compiled in 500ms"
  const compiledMatch = cleanLine.match(/compiled(?:\s+\/\S+)?\s+in\s*([\d.]+)\s*(s|ms)/i);
  if (compiledMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(compiledMatch[1], compiledMatch[2]);
  }

  // "✓ Compiled client and server successfully in 1.2s"
  if (cleanLine.includes('compiled') && cleanLine.includes('successfully')) {
    result.status = 'ready';
    const timeMatch = cleanLine.match(/in\s*([\d.]+)\s*(s|ms)/i);
    if (timeMatch) {
      result.compileTime = normalizeTime(timeMatch[1], timeMatch[2]);
    }
  }

  // Compiling patterns
  // "○ Compiling /page ..."
  // "○ Compiling ..."
  if (cleanLine.match(/^[○◐]\s*compiling/i) || cleanLine.match(/compiling\s+\/\S+/i)) {
    result.status = 'compiling';
  }

  // Error patterns
  // "× Failed to compile"
  // "⨯ Error:"
  if (
    cleanLine.includes('failed to compile') ||
    cleanLine.match(/^[×⨯]\s*(error|failed)/i) ||
    (cleanLine.includes('error') && cleanLine.includes('module not found'))
  ) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  // HMR updates (turbopack)
  if (cleanLine.includes('[hmr]') || cleanLine.includes('updated modules')) {
    result.hmrUpdate = true;
  }

  return result;
};

// =============================================================================
// VITE PARSER
// =============================================================================
// Output patterns (Vite 4+, 5+, 6+):
// - "VITE v5.0.0  ready in 407 ms"
// - "  ➜  Local:   http://localhost:5173/"
// - "  ➜  Network: http://192.168.1.1:5173/"
// - "[vite] hmr update /src/App.tsx"
// - "[vite] page reload src/main.tsx"
// - "✘ [ERROR] ..."
// - "error during build:"
// =============================================================================
const parseViteOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Main ready pattern: "VITE v5.0.0  ready in 407 ms"
  const viteReadyMatch = cleanLine.match(/vite\s+v[\d.]+\s+ready in\s*([\d.]+)\s*(ms|s)/i);
  if (viteReadyMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(viteReadyMatch[1], viteReadyMatch[2]);
  }

  // Alt ready pattern without version: "ready in 407 ms"
  if (!result.status && cleanLine.match(/^\s*ready in\s*([\d.]+)\s*(ms|s)/i)) {
    const match = cleanLine.match(/ready in\s*([\d.]+)\s*(ms|s)/i);
    if (match) {
      result.status = 'ready';
      result.compileTime = normalizeTime(match[1], match[2]);
    }
  }

  // URL patterns: "➜  Local:   http://localhost:5173/"
  // Use cleanLine (ANSI-stripped) since URLs often have ANSI codes embedded
  const strippedLine = stripAnsi(line);
  const localUrlMatch = strippedLine.match(/(?:local|➜\s*local):\s*(https?:\/\/[^\s]+)/i);
  if (localUrlMatch) {
    result.url = localUrlMatch[1].replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // Fallback URL pattern
  const httpMatch = strippedLine.match(/(https?:\/\/(?:localhost|127\.0\.0\.1):\d+)/i);
  if (httpMatch && !result.url) {
    result.url = httpMatch[1].replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
  }

  // HMR patterns
  if (cleanLine.includes('[vite] hmr update') || cleanLine.includes('[vite] page reload')) {
    result.hmrUpdate = true;
  }

  // Build/rebuild patterns
  if (cleanLine.match(/\[vite\]\s*(?:rebuilding|building)/i)) {
    result.status = 'compiling';
  }

  // Error patterns
  if (cleanLine.includes('[error]') || cleanLine.includes('error during build') || cleanLine.match(/✘\s*\[error\]/i)) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// ASTRO PARSER
// =============================================================================
// Output patterns (Astro 3+, 4+, 5+):
// - "astro  v4.0.0 ready in 1.2s"
// - "┃ Local    http://localhost:4321/"
// - "┃ Network  http://192.168.1.1:4321/"
// - "watching for file changes..."
// - "[astro] update /src/pages/index.astro"
// - "error: ..."
// =============================================================================
const parseAstroOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Ready pattern: "astro  v4.0.0 ready in 1.2s" or "astro v4.0.0 started in 892ms"
  const astroReadyMatch = cleanLine.match(/astro\s+v[\d.]+\s+(?:ready|started)\s+in\s*([\d.]+)\s*(ms|s)/i);
  if (astroReadyMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(astroReadyMatch[1], astroReadyMatch[2]);
  }

  // URL patterns: "┃ Local    http://localhost:4321/"
  const localUrlMatch = line.match(/(?:local|┃\s*local)\s+(https?:\/\/[^\s]+)/i);
  if (localUrlMatch) {
    result.url = stripAnsi(localUrlMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // "watching for file changes" indicates ready state
  if (cleanLine.includes('watching for file changes')) {
    result.status = 'ready';
  }

  // HMR/update patterns
  if (cleanLine.includes('[astro] update') || cleanLine.includes('[astro] reload')) {
    result.hmrUpdate = true;
  }

  // Building patterns
  if (cleanLine.includes('building') || cleanLine.includes('bundling')) {
    result.status = 'compiling';
  }

  // Error patterns
  if (cleanLine.match(/^error:/i) || cleanLine.includes('build failed')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// NUXT PARSER
// =============================================================================
// Output patterns (Nuxt 3+):
// - "Nuxt 3.8.0 with Nitro 2.7.0"
// - "✔ Nuxt DevTools is enabled"
// - "ℹ Vite client warmed up in 1234ms"
// - "✔ Nitro built in 567 ms"
// - "ℹ Listening on http://localhost:3000"
// - "➜ Local:   http://localhost:3000/" (newer versions)
// - "✔ Ready in 1.5s"
// - "[nuxt] page reload"
// =============================================================================
const parseNuxtOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};
  const strippedLine = stripAnsi(line);

  // Ready pattern: "✔ Ready in 1.5s" or "Nuxt ready in 1.5s"
  const readyMatch = cleanLine.match(/(?:nuxt\s+)?ready in\s*([\d.]+)\s*(ms|s)/i);
  if (readyMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(readyMatch[1], readyMatch[2]);
  }

  // Listening pattern: "ℹ Listening on http://localhost:3000"
  const listeningMatch = strippedLine.match(/listening (?:on|at)\s*(https?:\/\/[^\s]+)/i);
  if (listeningMatch) {
    result.url = listeningMatch[1].replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    result.status = 'ready';
  }

  // Local URL pattern: "➜ Local:   http://localhost:3000/" (newer Nuxt versions)
  const localMatch = strippedLine.match(/(?:local|➜\s*local):\s*(https?:\/\/[^\s]+)/i);
  if (localMatch && !result.url) {
    result.url = localMatch[1].replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    result.status = 'ready';
  }

  // Nitro built pattern: "✔ Nitro built in 567 ms" or "Nuxt Nitro server built in 951ms"
  const nitroMatch = cleanLine.match(/(?:nuxt\s+)?nitro(?:\s+server)?\s+built in\s*([\d.]+)\s*(ms|s)/i);
  if (nitroMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(nitroMatch[1], nitroMatch[2]);
  }

  // Vite warmup: "ℹ Vite client warmed up in 1234ms"
  const viteWarmupMatch = cleanLine.match(/vite.*warmed up in\s*([\d.]+)\s*(ms|s)/i);
  if (viteWarmupMatch && !result.compileTime) {
    result.compileTime = normalizeTime(viteWarmupMatch[1], viteWarmupMatch[2]);
  }

  // HMR patterns
  if (cleanLine.includes('[nuxt]') && (cleanLine.includes('reload') || cleanLine.includes('update'))) {
    result.hmrUpdate = true;
  }

  // Building patterns
  if (cleanLine.includes('building') || cleanLine.includes('bundling') || cleanLine.includes('compiling')) {
    result.status = 'compiling';
  }

  // Error patterns
  if (cleanLine.includes('[error]') || cleanLine.includes('error:') || cleanLine.includes('build failed')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// REMIX PARSER
// =============================================================================
// Output patterns (Remix 2+):
// - "[remix-serve] http://localhost:3000 (http://192.168.1.1:3000)"
// - "💿 Built in 567ms"
// - "💿 Rebuilding..."
// - "✅ app ready: http://localhost:3000"
// - "remix dev" / "remix vite:dev"
// =============================================================================
const parseRemixOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Built pattern: "💿 Built in 567ms"
  const builtMatch = cleanLine.match(/built in\s*([\d.]+)\s*(ms|s)/i);
  if (builtMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(builtMatch[1], builtMatch[2]);
  }

  // Ready pattern: "✅ app ready: http://localhost:3000"
  const appReadyMatch = line.match(/app ready[:\s]*(https?:\/\/[^\s]+)?/i);
  if (appReadyMatch) {
    result.status = 'ready';
    if (appReadyMatch[1]) {
      result.url = stripAnsi(appReadyMatch[1]).replace(/[\/\s]+$/, '');
      result.port = extractPort(result.url);
    }
  }

  // Server URL: "[remix-serve] http://localhost:3000"
  const serverMatch = line.match(/\[remix-serve\]\s*(https?:\/\/[^\s(]+)/i);
  if (serverMatch) {
    result.url = stripAnsi(serverMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    result.status = 'ready';
  }

  // Rebuilding pattern
  if (cleanLine.includes('rebuilding')) {
    result.status = 'compiling';
  }

  // Error patterns
  if (cleanLine.includes('error') && !cleanLine.includes('no errors')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// SVELTEKIT PARSER
// =============================================================================
// Output patterns (SvelteKit 1+, 2+):
// - "VITE v5.0.0  ready in 407 ms" (uses Vite under the hood)
// - "  ➜  Local:   http://localhost:5173/"
// - "SvelteKit v2.0.0"
// - "server started in 234ms"
// =============================================================================
const parseSvelteKitOutput = (line: string, cleanLine: string): ParsedOutput => {
  // SvelteKit uses Vite, so delegate to Vite parser first
  const viteResult = parseViteOutput(line, cleanLine);
  if (viteResult.status || viteResult.url) {
    return viteResult;
  }

  const result: ParsedOutput = {};

  // Server started pattern
  const serverStartMatch = cleanLine.match(/server started in\s*([\d.]+)\s*(ms|s)/i);
  if (serverStartMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(serverStartMatch[1], serverStartMatch[2]);
  }

  return result;
};

// =============================================================================
// ANGULAR PARSER
// =============================================================================
// Output patterns (Angular 15+, 16+, 17+, 18+, 19+):
// - "✔ Browser application bundle generation complete."
// - "** Angular Live Development Server is listening on localhost:4200 **"
// - "✔ Compiled successfully."
// - "Initial chunk files | Names         | Raw size"
// - "Build at: 2024-01-01T00:00:00.000Z - Hash: abc123 - Time: 5678ms"
// - "✔ Built in 1.2s"
// - With esbuild (17+): "Application bundle generation complete. [1.234 seconds]"
// =============================================================================
const parseAngularOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Listening pattern
  const listeningMatch = line.match(/listening on\s*(\S+:\d+)/i);
  if (listeningMatch) {
    const addr = listeningMatch[1];
    result.url = addr.startsWith('http') ? addr : `http://${addr}`;
    result.port = extractPort(result.url);
    result.status = 'ready';
  }

  // Compiled successfully
  if (cleanLine.includes('compiled successfully') || cleanLine.includes('bundle generation complete')) {
    result.status = 'ready';
  }

  // Built in pattern: "✔ Built in 1.2s"
  const builtMatch = cleanLine.match(/built in\s*([\d.]+)\s*(s|ms)/i);
  if (builtMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(builtMatch[1], builtMatch[2]);
  }

  // Time pattern from build output: "Time: 5678ms"
  const timeMatch = cleanLine.match(/time:\s*([\d.]+)\s*(ms|s)/i);
  if (timeMatch) {
    result.compileTime = normalizeTime(timeMatch[1], timeMatch[2]);
    result.status = 'ready';
  }

  // esbuild pattern: "Application bundle generation complete. [1.234 seconds]"
  const esbuildMatch = cleanLine.match(/complete\.\s*\[([\d.]+)\s*(seconds?|ms)\]/i);
  if (esbuildMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(esbuildMatch[1], esbuildMatch[2]);
  }

  // Compiling pattern
  if (cleanLine.includes('compiling') || cleanLine.includes('building') || cleanLine.includes('bundling')) {
    result.status = 'compiling';
  }

  // Error patterns
  if (
    cleanLine.includes('error') &&
    !cleanLine.includes('0 errors') &&
    !cleanLine.includes('no errors') &&
    !cleanLine.includes('errors: 0')
  ) {
    // Verify it's actually an error, not "X errors" where X is 0
    const errorCountMatch = cleanLine.match(/(\d+)\s*error/i);
    if (!errorCountMatch || parseInt(errorCountMatch[1], 10) > 0) {
      result.status = 'error';
      result.error = stripAnsi(line);
    }
  }

  return result;
};

// =============================================================================
// GATSBY PARSER
// =============================================================================
// Output patterns:
// - "success Building development bundle - 5.678s"
// - "You can now view gatsby-site in the browser."
// - "Local:            http://localhost:8000/"
// - "success onPreInit - 0.001s"
// =============================================================================
const parseGatsbyOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Building development bundle
  const buildMatch = cleanLine.match(/success building development bundle.*?([\d.]+)\s*(s|ms)/i);
  if (buildMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(buildMatch[1], buildMatch[2]);
  }

  // "You can now view" indicates ready
  if (cleanLine.includes('you can now view')) {
    result.status = 'ready';
  }

  // URL pattern
  const localMatch = line.match(/local:\s*(https?:\/\/[^\s]+)/i);
  if (localMatch) {
    result.url = stripAnsi(localMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // Error patterns
  if (cleanLine.includes('error') && cleanLine.includes('building')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// CREATE-REACT-APP PARSER
// =============================================================================
// Output patterns:
// - "Compiled successfully!"
// - "You can now view my-app in the browser."
// - "Local:            http://localhost:3000"
// - "Compiling..."
// - "Failed to compile."
// =============================================================================
const parseCRAOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Compiled successfully
  if (cleanLine.includes('compiled successfully')) {
    result.status = 'ready';
  }

  // "You can now view" indicates ready
  if (cleanLine.includes('you can now view')) {
    result.status = 'ready';
  }

  // URL pattern
  const localMatch = line.match(/local:\s*(https?:\/\/[^\s]+)/i);
  if (localMatch) {
    result.url = stripAnsi(localMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // Compiling
  if (cleanLine.match(/^compiling\.{0,3}$/i)) {
    result.status = 'compiling';
  }

  // Error patterns
  if (cleanLine.includes('failed to compile')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// WEBPACK PARSER
// =============================================================================
// Output patterns:
// - "webpack 5.88.0 compiled successfully in 1234 ms"
// - "webpack compiled successfully"
// - "[webpack-dev-server] Project is running at http://localhost:8080/"
// - "[webpack-dev-server] Loopback: http://localhost:8080/"
// - "Compiling..."
// - "ERROR in ..."
// =============================================================================
const parseWebpackOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Compiled successfully with time
  const compiledMatch = cleanLine.match(/webpack.*compiled successfully(?:\s+in\s*([\d.]+)\s*(ms|s))?/i);
  if (compiledMatch) {
    result.status = 'ready';
    if (compiledMatch[1]) {
      result.compileTime = normalizeTime(compiledMatch[1], compiledMatch[2]);
    }
  }

  // webpack-dev-server URL
  const serverMatch = line.match(/\[webpack-dev-server\].*?(https?:\/\/[^\s]+)/i);
  if (serverMatch) {
    result.url = stripAnsi(serverMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // Compiling
  if (cleanLine.match(/^compiling\.{0,3}$/i) || cleanLine.includes('webpack compiling')) {
    result.status = 'compiling';
  }

  // Error patterns
  if (cleanLine.match(/^error in/i) || cleanLine.includes('failed to compile')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// PARCEL PARSER
// =============================================================================
// Output patterns:
// - "Server running at http://localhost:1234"
// - "✨ Built in 567ms"
// - "🚨 Build failed."
// - "⏳ Building..."
// =============================================================================
const parseParcelOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Server running
  const serverMatch = line.match(/server running at\s*(https?:\/\/[^\s]+)/i);
  if (serverMatch) {
    result.url = stripAnsi(serverMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    result.status = 'ready';
  }

  // Built pattern
  const builtMatch = cleanLine.match(/built in\s*([\d.]+)\s*(ms|s)/i);
  if (builtMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(builtMatch[1], builtMatch[2]);
  }

  // Building
  if (cleanLine.includes('building')) {
    result.status = 'compiling';
  }

  // Error
  if (cleanLine.includes('build failed')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// RSPACK PARSER
// =============================================================================
// Output patterns (similar to webpack):
// - "Rspack compiled successfully in 234ms"
// - "[rspack] Server is running at http://localhost:8080/"
// =============================================================================
const parseRspackOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Compiled successfully
  const compiledMatch = cleanLine.match(/rspack compiled successfully(?:\s+in\s*([\d.]+)\s*(ms|s))?/i);
  if (compiledMatch) {
    result.status = 'ready';
    if (compiledMatch[1]) {
      result.compileTime = normalizeTime(compiledMatch[1], compiledMatch[2]);
    }
  }

  // Server URL
  const serverMatch = line.match(/server.*?(?:running|listening).*?(https?:\/\/[^\s]+)/i);
  if (serverMatch) {
    result.url = stripAnsi(serverMatch[1]).replace(/[\/\s]+$/, '');
    result.port = extractPort(result.url);
    if (!result.status) result.status = 'ready';
  }

  // Compiling
  if (cleanLine.includes('compiling')) {
    result.status = 'compiling';
  }

  // Error
  if (cleanLine.match(/^error/i) || cleanLine.includes('failed')) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// TURBOPACK PARSER
// =============================================================================
// Output patterns (Next.js with Turbopack):
// - Similar to Next.js but faster compilation messages
// - "[turbopack] compiling..."
// - "[turbopack] compiled in 50ms"
// =============================================================================
const parseTurbopackOutput = (line: string, cleanLine: string): ParsedOutput => {
  // Turbopack is mostly used with Next.js, so use Next.js parser as base
  const nextResult = parseNextOutput(line, cleanLine);
  if (nextResult.status || nextResult.url) {
    return nextResult;
  }

  const result: ParsedOutput = {};

  // Turbopack-specific patterns
  const turboCompiledMatch = cleanLine.match(/\[turbopack\].*compiled.*?in\s*([\d.]+)\s*(ms|s)/i);
  if (turboCompiledMatch) {
    result.status = 'ready';
    result.compileTime = normalizeTime(turboCompiledMatch[1], turboCompiledMatch[2]);
  }

  if (cleanLine.includes('[turbopack]') && cleanLine.includes('compiling')) {
    result.status = 'compiling';
  }

  return result;
};

// =============================================================================
// GENERIC/FALLBACK PARSER
// =============================================================================
const parseGenericOutput = (line: string, cleanLine: string): ParsedOutput => {
  const result: ParsedOutput = {};

  // Generic URL detection
  const urlMatch = line.match(/(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::\]):\d+)/i);
  if (urlMatch) {
    result.url = stripAnsi(urlMatch[1]).replace(/[\/\s]+$/, '');
    // Normalize various localhost representations for display
    result.url = result.url.replace(/127\.0\.0\.1|0\.0\.0\.0|\[::\]/, 'localhost');
    result.port = extractPort(result.url);
  }

  // Generic ready patterns
  if (
    cleanLine.includes('ready in') ||
    cleanLine.includes('server started') ||
    cleanLine.includes('listening on') ||
    cleanLine.includes('started server') ||
    cleanLine.includes('development server')
  ) {
    result.status = 'ready';

    // Try to extract time
    const timeMatch = cleanLine.match(/(?:ready|started|built).*?in\s*([\d.]+)\s*(ms|s|seconds?)/i);
    if (timeMatch) {
      result.compileTime = normalizeTime(timeMatch[1], timeMatch[2]);
    }
  }

  // Generic compiling patterns
  if (
    cleanLine.match(/^compiling/i) ||
    cleanLine.includes('building') ||
    cleanLine.includes('bundling') ||
    cleanLine.includes('rebuilding')
  ) {
    result.status = 'compiling';
  }

  // Generic error patterns - be careful not to match false positives
  if (
    (cleanLine.includes('error') || cleanLine.includes('failed')) &&
    !cleanLine.includes('0 error') &&
    !cleanLine.includes('no error') &&
    !cleanLine.match(/error.*0/) &&
    (cleanLine.includes('failed to') || cleanLine.includes('build failed') || cleanLine.match(/^error:/i))
  ) {
    result.status = 'error';
    result.error = stripAnsi(line);
  }

  return result;
};

// =============================================================================
// MAIN PARSER DISPATCH
// =============================================================================

const frameworkParsers: Record<FrameworkType, (line: string, cleanLine: string) => ParsedOutput> = {
  next: parseNextOutput,
  vite: parseViteOutput,
  astro: parseAstroOutput,
  nuxt: parseNuxtOutput,
  remix: parseRemixOutput,
  sveltekit: parseSvelteKitOutput,
  angular: parseAngularOutput,
  gatsby: parseGatsbyOutput,
  cra: parseCRAOutput,
  webpack: parseWebpackOutput,
  parcel: parseParcelOutput,
  rspack: parseRspackOutput,
  turbopack: parseTurbopackOutput,
  unknown: parseGenericOutput
};

/**
 * Parse dev server output line using framework-specific parser.
 */
export const parseDevServerLine = (line: string, framework: FrameworkType): ParsedOutput => {
  const cleanLine = stripAnsi(line).toLowerCase();
  const parser = frameworkParsers[framework] || parseGenericOutput;

  // Try framework-specific parser first
  const result = parser(line, cleanLine);

  // If framework parser didn't find anything, try generic parser as fallback
  if (!result.status && !result.url && framework !== 'unknown') {
    const genericResult = parseGenericOutput(line, cleanLine);
    return { ...genericResult, ...result };
  }

  return result;
};

/**
 * Creates a stateful parser that tracks accumulated state across multiple lines.
 */
export const createFrameworkParser = (framework: FrameworkType) => {
  let accumulatedUrl: string | undefined;
  let accumulatedPort: number | undefined;
  let accumulatedTime: string | undefined;

  return (line: string): ParsedOutput => {
    const result = parseDevServerLine(line, framework);

    // Accumulate URL and port across lines (Vite outputs URL on separate line from ready)
    if (result.url) accumulatedUrl = result.url;
    if (result.port) accumulatedPort = result.port;
    if (result.compileTime) accumulatedTime = result.compileTime;

    // If we got a ready status but no URL, use accumulated URL
    if (result.status === 'ready') {
      return {
        ...result,
        url: result.url || accumulatedUrl,
        port: result.port || accumulatedPort,
        compileTime: result.compileTime || accumulatedTime
      };
    }

    return result;
  };
};
