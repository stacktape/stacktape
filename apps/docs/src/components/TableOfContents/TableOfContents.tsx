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

/** The id of the heading being read: the last one whose top has passed the header. */
const useActiveHeading = (ids: string[]) => {
  const [activeId, setActiveId] = useState(ids[0] ?? '');
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80) + 8;
      let current = elements[0].id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top - offset > 0) break;
        current = element.id;
      }
      // At the very bottom the last sections may never reach the top: mark the last one.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = elements.at(-1)!.id;
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ids]);
  return activeId;
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
  const sections = useMemo(() => toSections(tableOfContents), [tableOfContents]);
  const ids = useMemo(() => sections.flatMap((s) => [s.id, ...s.children.map((c) => c.id)]), [sections]);
  const activeId = useActiveHeading(ids);
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

  if (sections.length === 0) return null;

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

  const activeText =
    sections.flatMap((s) => [s, ...s.children]).find((entry) => entry.id === activeId)?.item.text ??
    sections[0].item.text;

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
          {activeText}
        </span>
        <ChevronDown size={16} aria-hidden />
      </button>
      <nav id="docs-toc-panel" aria-label="On this page" className="docs-toc-bar-panel" hidden={!isOpen}>
        <OutlineList sections={sections} activeId={activeId} expandAll onNavigate={() => setIsOpen(false)} />
      </nav>
    </div>
  );
}
