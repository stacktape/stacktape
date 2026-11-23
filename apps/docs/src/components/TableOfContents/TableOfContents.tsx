import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'react-feather';
import type { TableOfContentsItem } from '@/utils/docs-data';

type Section = { item: TableOfContentsItem; id: string; children: { item: TableOfContentsItem; id: string }[] };

const idOf = (item: TableOfContentsItem) => item.href.replace(/^#/, '');

/** H2 sections with their H3s. An H3 before the first H2 becomes a section of its own. */
const toSections = (items: TableOfContentsItem[]): Section[] => {
  const sections: Section[] = [];
  for (const item of items) {
    const entry = { item, id: idOf(item) };
    const last = sections.at(-1);
    if (item.level === 3 && last) last.children.push(entry);
    else sections.push({ ...entry, children: [] });
  }
  return sections;
};

/** The line under the sticky chrome where a linked heading lands (`--docs-anchor-offset`, read from the page). */
const anchorLine = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;

/** Keys that scroll the page; pressing one hands the outline back to scroll tracking. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/**
 * The id of the heading being read: the last one whose top has reached the anchor line, the same line a heading link
 * scrolls to. Empty while the reader is still above the first section (the title and introduction).
 *
 * A heading the reader asked for (a link with its fragment, or an outline click) stays selected until the reader
 * scrolls by hand, even when it sits too close to the end of the page to reach the line. Astro's client router changes
 * the fragment of a same-page link with `history.pushState`, which fires no `hashchange`, so clicks on such links are
 * followed directly.
 */
const useActiveHeading = (ids: string[]) => {
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    let frame = 0;
    let requested = '';
    const update = () => {
      frame = 0;
      if (requested) {
        setActiveId(requested);
        return;
      }
      // A heading counts as reached a few pixels early, so sub-pixel positions after a jump never miss it.
      const line = anchorLine() + 4;
      const shown = elements.filter((element) => !element.hidden);
      let current = '';
      for (const element of shown) {
        if (element.getBoundingClientRect().top > line) break;
        current = element.id;
      }
      // At the very bottom the last sections may never reach the line: mark the last one.
      if (shown.length > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = shown.at(-1)!.id;
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const request = (hash: string) => {
      const id = decodeURIComponent(hash.slice(1));
      requested = ids.includes(id) ? id : '';
      schedule();
    };
    const followHash = () => request(window.location.hash);
    const followLink = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target) return;
      const url = new URL(link.href);
      const here = window.location;
      if (!url.hash || url.origin !== here.origin || url.pathname !== here.pathname || url.search !== here.search)
        return;
      request(url.hash);
    };
    const release = (event: Event) => {
      if (!requested) return;
      if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
      requested = '';
      schedule();
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', followHash);
    document.addEventListener('click', followLink);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchmove', release, { passive: true });
    window.addEventListener('keydown', release);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', followHash);
      window.removeEventListener('popstate', followHash);
      document.removeEventListener('click', followLink);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchmove', release);
      window.removeEventListener('keydown', release);
    };
  }, [ids]);
  return activeId;
};

/**
 * The ids of headings that are hidden right now. A page filter (the command index and resource catalog `<Directory>`)
 * hides the sections without a match; the outline leaves them out until the filter is cleared.
 */
const useHiddenIds = (ids: string[]) => {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    const read = () => {
      const next = elements.filter((element) => element.hidden).map((element) => element.id);
      setHidden((previous) =>
        previous.size === next.length && next.every((id) => previous.has(id)) ? previous : new Set(next)
      );
    };
    read();
    const observer = new MutationObserver(read);
    for (const element of elements) observer.observe(element, { attributes: true, attributeFilter: ['hidden'] });
    return () => observer.disconnect();
  }, [ids]);
  return hidden;
};

function OutlineList({
  sections,
  activeId,
  expandAll,
  onNavigate
}: {
  sections: Section[];
  activeId: string;
  /** The bar's panel lists every H3; the rail shows the H3s of the section being read. */
  expandAll: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="docs-toc-list">
      {sections.map((section) => {
        const childActive = section.children.some((child) => child.id === activeId);
        const isOpen = expandAll || section.id === activeId || childActive;
        return (
          <li key={section.id}>
            <a
              href={section.item.href}
              className={childActive ? 'docs-toc-link is-ancestor' : 'docs-toc-link'}
              aria-current={section.id === activeId ? 'location' : undefined}
              onClick={onNavigate}
            >
              {section.item.text}
            </a>
            {section.children.length > 0 && (
              <div className={isOpen ? 'docs-toc-children is-open' : 'docs-toc-children'} inert={!isOpen}>
                <ul className="docs-toc-sublist">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <a
                        href={child.item.href}
                        className="docs-toc-link"
                        aria-current={child.id === activeId ? 'location' : undefined}
                        onClick={onNavigate}
                      >
                        {child.item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "On this page". `rail` is the sticky right column on wide screens; `bar` is a sticky disclosure at the top of the
 * article for every narrower screen, showing the section being read. The layout renders both and CSS shows one.
 */
export function TableOfContents({
  tableOfContents,
  variant
}: {
  tableOfContents: TableOfContentsItem[];
  variant: 'rail' | 'bar';
}) {
  const allSections = useMemo(() => toSections(tableOfContents), [tableOfContents]);
  const ids = useMemo(() => allSections.flatMap((s) => [s.id, ...s.children.map((c) => c.id)]), [allSections]);
  const activeId = useActiveHeading(ids);
  const hiddenIds = useHiddenIds(ids);
  const sections = useMemo(
    () =>
      hiddenIds.size === 0
        ? allSections
        : allSections
            .filter((section) => !hiddenIds.has(section.id))
            .map(({ item, id, children }) => ({
              item,
              id,
              children: children.filter((child) => !hiddenIds.has(child.id))
            })),
    [allSections, hiddenIds]
  );
  const [isOpen, setIsOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && barRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [isOpen]);

  if (allSections.length === 0) return null;

  if (variant === 'rail') {
    return (
      <nav className="docs-toc" aria-labelledby="docs-toc-title">
        <p id="docs-toc-title" className="docs-toc-title">
          On this page
        </p>
        <OutlineList sections={sections} activeId={activeId} expandAll={false} />
      </nav>
    );
  }

  const activeText = sections.flatMap((s) => [s, ...s.children]).find((entry) => entry.id === activeId)?.item.text;

  return (
    <div className="docs-toc-bar" ref={barRef}>
      <button
        type="button"
        className="docs-toc-bar-button"
        aria-expanded={isOpen}
        aria-controls="docs-toc-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="docs-toc-bar-label">On this page</span>
        <span className="docs-toc-bar-current" aria-hidden>
          {activeText ??
            (hiddenIds.size > 0
              ? `${sections.length} of ${allSections.length} sections match`
              : `${sections.length} sections`)}
        </span>
        <ChevronDown size={16} aria-hidden />
      </button>
      <nav id="docs-toc-panel" aria-label="On this page" className="docs-toc-bar-panel" hidden={!isOpen}>
        <OutlineList sections={sections} activeId={activeId} expandAll onNavigate={() => setIsOpen(false)} />
      </nav>
    </div>
  );
}
