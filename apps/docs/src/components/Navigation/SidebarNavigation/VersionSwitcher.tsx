import clsx from 'clsx';
import { Fragment } from 'react';
import type { DocsVersion } from '@/site-config';
import { V3_BASE, v3EquivalentOf, v4EquivalentOf } from '@/utils/v3-archive-routes';

/** Where each version's tab leads from the page at `pathname`: the same topic, or that version's home. */
const targetsFor = (pathname: string, version: DocsVersion) => {
  if (version === 'v3') return { v4: v4EquivalentOf(pathname.slice(V3_BASE.length) || '/') ?? '/', v3: pathname };
  return { v4: pathname, v3: v3EquivalentOf(pathname) ?? `${V3_BASE}/` };
};

/**
 * The v4 / v3 switch at the top of the sidebar. It is the only way into the v3 archive from the
 * current docs, and leads to the page on the same topic when the other version has one. ContentTree
 * renders it so it follows the route the same way the tree does.
 */
export function VersionSwitcher({ version, pathname }: { version: DocsVersion; pathname: string }) {
  const targets = targetsFor(pathname, version);
  const options: { id: DocsVersion; label: string; hint: string; dot: string }[] = [
    { id: 'v4', label: 'v4', hint: 'Latest', dot: 'bg-[rgb(54,190,190)] shadow-[0_0_6px_rgba(54,190,190,0.7)]' },
    // The same orange as the v3 archive banner, which names the release (3.7.1); it is no longer maintained.
    { id: 'v3', label: 'v3', hint: 'Legacy', dot: 'bg-[rgb(237,139,0)] shadow-[0_0_6px_rgba(237,139,0,0.6)]' }
  ];

  // The code-block tab look. Each version is a full page load, so the static pill marks the active one.
  return (
    <nav aria-label="Documentation version" className="mx-[18px] mb-[18px] max-[795px]:mx-[8px]">
      <div className="stp-tab-container flex w-full flex-nowrap">
        {options.map((option) => {
          const isActive = option.id === version;
          const className = clsx(
            'stp-tab-button flex-1 gap-[7px] py-[8px] no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgb(54,190,190)]',
            isActive && 'is-active cursor-default'
          );
          const content = (
            <Fragment>
              <span
                aria-hidden
                className={clsx(
                  'size-[6px] shrink-0 rounded-full',
                  isActive ? option.dot : 'bg-[rgba(190,190,190,0.35)]'
                )}
              />
              <span>{option.label}</span>
              <span className="text-[11.5px] font-medium text-[rgba(190,190,190,0.6)]">{option.hint}</span>
            </Fragment>
          );
          return isActive ? (
            <span key={option.id} aria-current="true" className={className}>
              {content}
            </span>
          ) : (
            // A full page load: the other version brings its own sidebar.
            <a key={option.id} href={targets[option.id]} data-astro-reload className={className}>
              {content}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
