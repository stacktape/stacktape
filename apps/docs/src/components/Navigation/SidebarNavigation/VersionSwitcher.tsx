import clsx from 'clsx';
import { Fragment } from 'react';
import type { DocsVersion } from '@/site-config';
import { V3_BASE, V3_RELEASE, v3EquivalentOf, v4EquivalentOf } from '@/utils/v3-archive-routes';

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
  const options: { id: DocsVersion; label: string; hint: string }[] = [
    { id: 'v4', label: 'v4', hint: 'Current' },
    { id: 'v3', label: 'v3', hint: V3_RELEASE }
  ];

  return (
    <nav aria-label="Documentation version" className="mx-[18px] mb-[16px] max-[795px]:mx-[8px]">
      <div className="grid grid-cols-2 gap-[4px] rounded-[8px] border border-solid border-border-light bg-[rgba(0,0,0,0.22)] p-[3px]">
        {options.map((option) => {
          const className =
            'flex items-baseline justify-center gap-[6px] rounded-[6px] px-[8px] py-[5px] text-[13px] font-semibold no-underline transition-colors';
          const content = (
            <Fragment>
              {option.label}
              <span className="text-[11px] font-medium opacity-[0.7]">{option.hint}</span>
            </Fragment>
          );
          return option.id === version ? (
            <span
              key={option.id}
              aria-current="true"
              className={clsx(
                className,
                'bg-[rgba(54,190,190,0.14)] text-[rgb(54,190,190)] shadow-[inset_0_0_0_1px_rgba(54,190,190,0.36)]'
              )}
            >
              {content}
            </span>
          ) : (
            // A full page load: the other version brings its own sidebar.
            <a
              key={option.id}
              href={targets[option.id]}
              data-astro-reload
              className={clsx(className, 'text-fc-primary opacity-[0.72] hover:opacity-100')}
            >
              {content}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
