import type { CSSProperties } from 'react';
import type { DocsVersion } from '@/site-config';
import { V3_BASE, v3EquivalentOf, v4EquivalentOf } from '@/utils/v3-archive-routes';

/** Where the other version's link leads from the page at `pathname`: the same topic, or that version's home. */
const otherVersionHref = (pathname: string, version: DocsVersion) =>
  version === 'v3'
    ? (v4EquivalentOf(pathname.slice(V3_BASE.length) || '/') ?? '/')
    : (v3EquivalentOf(pathname) ?? `${V3_BASE}/`);

/**
 * The version line at the top of the sidebar: the version being read, and a link to the other one. It is navigation
 * (a full page load into the other docs), so it is a link, not a tab. It is the only way into the v3 archive.
 */
export function VersionSwitcher({ version, pathname }: { version: DocsVersion; pathname: string }) {
  const isV4 = version === 'v4';
  return (
    <nav aria-label="Documentation version" className="docs-version">
      <span
        className="docs-version-current"
        aria-current="true"
        // The v3 archive is marked with the same warning colour as its banner: it is no longer maintained.
        style={isV4 ? undefined : ({ '--docs-version-dot': 'var(--docs-warning)' } as CSSProperties)}
      >
        {isV4 ? 'v4 · Latest' : 'v3 · Legacy'}
      </span>
      <a className="docs-version-other" href={otherVersionHref(pathname, version)} data-astro-reload>
        {isV4 ? 'v3 docs' : 'Latest docs'}
      </a>
    </nav>
  );
}
