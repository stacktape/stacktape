/**
 * Validate the built documentation site.
 *
 * The build is a static export with no server, so everything that can be wrong about it is visible
 * in `dist/`. This script is the gate: it derives the expected route set from the canonical content
 * rather than accepting whatever the build happened to emit, then checks the per-page contract
 * (metadata, structured data, indexability), that every internal link/fragment/asset resolves, and
 * that the generated discovery corpus was copied through byte-for-byte.
 *
 * Run by `pnpm --filter @stacktape/docs run build`; also available on its own as `validate:site`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLI_LLM_DOCS_DIR, LLM_DISCOVERY_FILES } from '../src/build/cli-generated-inputs.ts';
import { entryToUrlSlug } from '../src/utils/route-slugs.ts';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = resolve(APP_ROOT, 'dist');
const CONTENT_DIR = resolve(APP_ROOT, 'content');
const SITE_ORIGIN = 'https://docs.stacktape.com';
const ERROR_PAGE = '404.html';

const errors: string[] = [];
const fail = (message: string) => errors.push(message);

const normalize = (value: string) => value.replace(/\\/g, '/');
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

if (!existsSync(OUT_DIR)) {
  console.error(`[site-validation] ${OUT_DIR} does not exist. Run \`astro build\` first.`);
  process.exit(1);
}

/* -------------------------------------------------------------------------------------------- *
 * Route set — derived from the canonical corpus, not from the build output.
 * -------------------------------------------------------------------------------------------- */

const contentFiles = walk(CONTENT_DIR)
  .filter((path) => path.endsWith('.mdx'))
  .map((path) => normalize(relative(CONTENT_DIR, path)));

const expectedHtmlFiles = new Set([
  ERROR_PAGE,
  ...contentFiles.map((file) => {
    const slug = entryToUrlSlug(file.replace(/\.mdx$/, ''));
    return slug.length === 0 ? 'index.html' : `${slug.join('/')}/index.html`;
  })
]);

const htmlFiles = walk(OUT_DIR).filter((path) => path.endsWith('.html'));
const actualHtmlFiles = new Set(htmlFiles.map((path) => normalize(relative(OUT_DIR, path))));

for (const expected of expectedHtmlFiles) {
  if (!actualHtmlFiles.has(expected)) fail(`missing expected page ${expected}`);
}
for (const actual of actualHtmlFiles) {
  if (!expectedHtmlFiles.has(actual)) fail(`unexpected page ${actual} is not derived from content/`);
}
if (contentFiles.length === 0) fail('found no canonical MDX pages in content/');

/* -------------------------------------------------------------------------------------------- *
 * Per-page contract.
 * -------------------------------------------------------------------------------------------- */

const htmlByFile = new Map(htmlFiles.map((path) => [path, readFileSync(path, 'utf8')]));

const captureAll = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].map((match) => match[1]);
const idsFor = (html: string) => new Set(captureAll(html, /\s(?:id|name)="([^"]+)"/g));

/**
 * The URL an output file is served at, and therefore the only correct canonical for it. The site
 * builds with `trailingSlash: 'always'`, so `index.html` is `/` and `a/b/index.html` is `/a/b/`.
 */
const canonicalUrlFor = (outputPath: string) =>
  outputPath === 'index.html' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}/${outputPath.replace(/index\.html$/, '')}`;

const outputFileForPath = (pathname: string): string | undefined => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  const relativePath = decoded.replace(/^\/+/, '');
  const candidates = decoded.endsWith('/')
    ? [join(OUT_DIR, relativePath, 'index.html')]
    : extname(decoded)
      ? [join(OUT_DIR, relativePath)]
      : [join(OUT_DIR, relativePath, 'index.html'), join(OUT_DIR, `${relativePath}.html`)];
  return candidates.find(existsSync);
};

const descriptions = new Map<string, string[]>();

for (const [filePath, html] of htmlByFile) {
  const shownPath = normalize(relative(OUT_DIR, filePath));
  const isErrorPage = shownPath === ERROR_PAGE;

  const titles = captureAll(html, /<title>([\s\S]*?)<\/title>/g);
  const metaDescriptions = captureAll(html, /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>(?:<\/meta>)?/g);
  const canonicals = captureAll(html, /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>(?:<\/link>)?/g);
  const h1Count = (html.match(/<h1\b/g) || []).length;

  if (titles.length !== 1 || !titles[0].trim()) fail(`${shownPath}: expected one non-empty <title>`);
  if (metaDescriptions.length !== 1 || !metaDescriptions[0].trim()) {
    fail(`${shownPath}: expected one non-empty meta description`);
  } else {
    descriptions.set(metaDescriptions[0], [...(descriptions.get(metaDescriptions[0]) || []), shownPath]);
  }
  if (h1Count !== 1) fail(`${shownPath}: expected one H1, found ${h1Count}`);

  const hasNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  if (isErrorPage) {
    if (canonicals.length !== 0) fail(`${shownPath}: noindex error page must not declare a canonical URL`);
    if (!hasNoindex) fail(`${shownPath}: error page must be noindex`);
  } else {
    // The canonical must be the URL this very file is served at — same-origin is not enough. A
    // page advertising a different (or redirecting) URL splits its own ranking signals.
    const expectedCanonical = canonicalUrlFor(shownPath);
    if (canonicals.length !== 1) {
      fail(`${shownPath}: expected exactly one canonical URL, found ${canonicals.length}`);
    } else if (canonicals[0] !== expectedCanonical) {
      fail(`${shownPath}: canonical is ${canonicals[0]}, expected ${expectedCanonical}`);
    }
    if (hasNoindex) fail(`${shownPath}: documentation page is unexpectedly noindex`);
  }

  const structuredData = captureAll(html, /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (!isErrorPage && structuredData.length === 0) fail(`${shownPath}: expected JSON-LD structured data`);
  for (const json of structuredData) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object' || typeof parsed['@type'] !== 'string') {
        fail(`${shownPath}: JSON-LD block has no @type`);
      }
    } catch (error) {
      fail(`${shownPath}: invalid JSON-LD (${error instanceof Error ? error.message : 'parse error'})`);
    }
  }

  for (const imageTag of html.match(/<img\b[^>]*>/g) || []) {
    const alt = imageTag.match(/\salt="([^"]*)"/);
    if (!alt) fail(`${shownPath}: image is missing an alt attribute`);
    else if (!alt[1].trim()) fail(`${shownPath}: image has an empty alt attribute`);
  }

  for (const rawReference of captureAll(html, /\s(?:href|src)="([^"]+)"/g)) {
    if (/^(?:data:|mailto:|tel:|javascript:)/i.test(rawReference)) continue;

    let url: URL;
    try {
      url = new URL(rawReference, `${SITE_ORIGIN}/${shownPath}`);
    } catch {
      fail(`${shownPath}: invalid URL ${rawReference}`);
      continue;
    }
    if (url.origin !== SITE_ORIGIN) continue;

    const targetFile = outputFileForPath(url.pathname);
    if (!targetFile) {
      fail(`${shownPath}: broken internal reference ${rawReference}`);
      continue;
    }

    if (url.hash && targetFile.endsWith('.html')) {
      const targetHtml = htmlByFile.get(targetFile) ?? readFileSync(targetFile, 'utf8');
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (fragment && !idsFor(targetHtml).has(fragment)) fail(`${shownPath}: missing fragment ${rawReference}`);
    }
  }
}

for (const [description, pages] of descriptions) {
  if (pages.length > 1) fail(`duplicate meta description on ${pages.join(', ')}: ${description}`);
}

/* -------------------------------------------------------------------------------------------- *
 * Discovery files and the generated LLM corpus.
 * -------------------------------------------------------------------------------------------- */

for (const requiredFile of ['robots.txt', 'sitemap-index.xml', 'sitemap-0.xml']) {
  const path = join(OUT_DIR, requiredFile);
  if (!existsSync(path) || statSync(path).size === 0) fail(`missing or empty ${requiredFile}`);
}

const sitemapPath = join(OUT_DIR, 'sitemap-0.xml');
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const listed = new Set(captureAll(sitemap, /<loc>([^<]+)<\/loc>/g));
  for (const page of expectedHtmlFiles) {
    if (page === ERROR_PAGE) continue;
    const path = page === 'index.html' ? '/' : `/${page.replace(/index\.html$/, '')}`;
    if (!listed.has(`${SITE_ORIGIN}${path}`)) fail(`sitemap is missing ${path}`);
  }
  if (listed.has(`${SITE_ORIGIN}/404/`)) fail('sitemap must not list the noindex error page');
}

// The CLI owns the LLM corpus; this site republishes it. A transformed copy would make the served
// corpus disagree with the one the CLI ships, so require byte equality rather than mere presence.
for (const name of LLM_DISCOVERY_FILES) {
  const servedPath = join(OUT_DIR, name);
  const sourcePath = join(CLI_LLM_DOCS_DIR, name);
  if (!existsSync(servedPath)) {
    fail(`missing ${name} in the built output`);
    continue;
  }
  if (!existsSync(sourcePath)) {
    fail(`generated source for ${name} is missing at ${sourcePath}`);
    continue;
  }
  const served = readFileSync(servedPath);
  const source = readFileSync(sourcePath);
  if (served.length === 0) fail(`${name} is empty`);
  else if (!served.equals(source)) fail(`${name} differs from the generated corpus at ${sourcePath}`);
}

/* -------------------------------------------------------------------------------------------- */

if (errors.length > 0) {
  console.error(`[site-validation] Found ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.info(
  `[site-validation] ${htmlFiles.length} pages (${contentFiles.length} from content/ plus the error page): route set, ` +
    'metadata, JSON-LD, H1s, image alts, internal links, fragments, local assets, sitemap, robots, and the LLM ' +
    'discovery corpus all passed.'
);
