import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const OUT_DIR = join(process.cwd(), 'out');
const SITE_ORIGIN = 'https://docs.stacktape.com';
const errors: string[] = [];

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const normalize = (value: string) => value.replace(/\\/g, '/');
const displayPath = (filePath: string) => normalize(relative(OUT_DIR, filePath));
const htmlFiles = walk(OUT_DIR).filter((filePath) => filePath.endsWith('.html'));
const htmlByFile = new Map(htmlFiles.map((filePath) => [filePath, readFileSync(filePath, 'utf8')]));

const captureAll = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].map((match) => match[1]);
const idsFor = (html: string) => new Set(captureAll(html, /\s(?:id|name)="([^"]+)"/g));

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
  const shownPath = displayPath(filePath);
  const titles = captureAll(html, /<title>([\s\S]*?)<\/title>/g);
  const metaDescriptions = captureAll(html, /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>(?:<\/meta>)?/g);
  const canonicals = captureAll(html, /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>(?:<\/link>)?/g);
  const h1Count = (html.match(/<h1\b/g) || []).length;

  if (titles.length !== 1 || !titles[0].trim()) errors.push(`${shownPath}: expected one non-empty <title>`);
  if (metaDescriptions.length !== 1 || !metaDescriptions[0].trim()) {
    errors.push(`${shownPath}: expected one non-empty meta description`);
  } else {
    const pages = descriptions.get(metaDescriptions[0]) || [];
    pages.push(shownPath);
    descriptions.set(metaDescriptions[0], pages);
  }
  if (shownPath === '404.html') {
    if (canonicals.length !== 0) errors.push(`${shownPath}: noindex error page must not declare a canonical URL`);
  } else if (canonicals.length !== 1 || !canonicals[0].startsWith(`${SITE_ORIGIN}/`)) {
    errors.push(`${shownPath}: expected one canonical URL on ${SITE_ORIGIN}`);
  }
  if (h1Count !== 1) errors.push(`${shownPath}: expected one H1, found ${h1Count}`);

  const is404 = shownPath === '404.html';
  const hasNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  if (is404 && !hasNoindex) errors.push(`${shownPath}: 404 page must be noindex`);
  if (!is404 && hasNoindex) errors.push(`${shownPath}: documentation page is unexpectedly noindex`);

  for (const json of captureAll(html, /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch (error) {
      errors.push(`${shownPath}: invalid JSON-LD (${error instanceof Error ? error.message : 'parse error'})`);
    }
  }

  for (const imageTag of html.match(/<img\b[^>]*>/g) || []) {
    if (!/\salt="[^"]*"/.test(imageTag)) errors.push(`${shownPath}: image is missing alt text`);
  }

  const references = captureAll(html, /\s(?:href|src)="([^"]+)"/g);
  for (const rawReference of references) {
    if (/^(?:data:|mailto:|tel:|javascript:)/i.test(rawReference)) continue;

    let url: URL;
    try {
      url = new URL(rawReference, `${SITE_ORIGIN}/${shownPath}`);
    } catch {
      errors.push(`${shownPath}: invalid URL ${rawReference}`);
      continue;
    }
    if (url.origin !== SITE_ORIGIN) continue;

    const targetFile = outputFileForPath(url.pathname);
    if (!targetFile) {
      errors.push(`${shownPath}: broken internal reference ${rawReference}`);
      continue;
    }

    if (url.hash && targetFile.endsWith('.html')) {
      const targetHtml = htmlByFile.get(targetFile) || readFileSync(targetFile, 'utf8');
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (fragment && !idsFor(targetHtml).has(fragment)) {
        errors.push(`${shownPath}: missing fragment ${rawReference}`);
      }
    }
  }
}

for (const [description, pages] of descriptions) {
  if (pages.length > 1) errors.push(`duplicate meta description on ${pages.join(', ')}: ${description}`);
}

for (const requiredFile of ['robots.txt', 'sitemap-index.xml', 'llms.txt', 'llms-full.txt', 'llms-api-reference.txt']) {
  const filePath = join(OUT_DIR, requiredFile);
  if (!existsSync(filePath) || statSync(filePath).size === 0) errors.push(`missing or empty ${requiredFile}`);
}

if (errors.length > 0) {
  console.error(`[site-validation] Found ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.info(
  `[site-validation] Checked ${htmlFiles.length} HTML pages: metadata, JSON-LD, H1s, images, internal links, fragments, sitemap, robots, and LLM discovery files all passed.`
);
