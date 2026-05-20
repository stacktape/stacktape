import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'react-feather';
import { colors, fontFamily } from '../../../styles/variables';
import { ContentTreeNode } from './ContentTreeNode';
import { buildGuidePath, flattenVisibleItems } from './guide-path';
import type { NavGroup } from './navigation-data';

const COLLAPSE_DURATION_MS = 220;

// Measures each *visible* row's center y relative to the container. ContentTreeNode renders all
// descendants unconditionally — collapsed branches stay in the DOM, clamped via
// `grid-template-rows: 0fr` and tagged `aria-hidden="true"`. We walk up each row's ancestors and
// skip it if anything between row and container is hidden, so the measurement count matches the
// flattened visible list (without this filter, collapsed grandchildren inflate the count and the
// curve fails to render). Uses getBoundingClientRect because nested expansion `<ul>` wrappers
// create their own offsetParents — bounding rects are absolute, so subtracting the container
// origin sidesteps the offsetParent chain.
const isRowVisible = (row: HTMLElement, container: HTMLElement) => {
  let el: HTMLElement | null = row.parentElement;
  while (el && el !== container) {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    el = el.parentElement;
  }
  return true;
};

const measureRows = (container: HTMLElement) => {
  const containerTop = container.getBoundingClientRect().top;
  const rows = container.querySelectorAll<HTMLElement>('[data-guide-row]');
  const centers: number[] = [];
  let totalHeight = 0;
  rows.forEach((row) => {
    if (!isRowVisible(row, container)) return;
    const r = row.getBoundingClientRect();
    centers.push(r.top + r.height / 2 - containerTop);
    totalHeight = Math.max(totalHeight, r.top + r.height - containerTop);
  });
  return { centers, totalHeight };
};

const useGuidePath = (
  containerRef: React.RefObject<HTMLDivElement>,
  flat: { depth: number }[],
  deps: unknown[]
) => {
  const [measured, setMeasured] = useState<{ centers: number[]; totalHeight: number }>({
    centers: [],
    totalHeight: 0
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setMeasured(measureRows(el));
    // ResizeObserver catches font load, scrollbar shifts, and any layout change inside the
    // container. Without it the curve can lag behind row-height changes that happen post-mount.
    const ro = new ResizeObserver(() => setMeasured(measureRows(el)));
    ro.observe(el);
    el.querySelectorAll<HTMLElement>('[data-guide-row]').forEach((row) => ro.observe(row));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useMemo(() => {
    if (flat.length === 0 || measured.centers.length !== flat.length) return null;
    return buildGuidePath(
      flat.map((it, i) => ({ depth: it.depth, centerY: measured.centers[i] })),
      measured.totalHeight
    );
  }, [flat, measured]);
};

export function ContentTreeGroup({
  group,
  expandedItems,
  toggle
}: {
  group: NavGroup;
  expandedItems: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const groupKey = `group:${group.id}`;
  const isExpanded = expandedItems[groupKey] ?? group.defaultOpen;
  const isRootGroup = group.id === '__root';

  const flat = useMemo(
    () => flattenVisibleItems(group.children, isRootGroup ? 0 : 1, expandedItems),
    [group.children, expandedItems, isRootGroup]
  );

  const childrenContainerRef = useRef<HTMLDivElement>(null);
  const guide = useGuidePath(childrenContainerRef, flat, [flat]);

  // Root group (catch-all for the index page) renders without a header and is always expanded.
  // No guide curve here — the root group is just the Introduction entry, where a guide line would
  // look out of place since there are no nested branches to organize.
  if (isRootGroup) {
    return (
      <div css={{ display: 'block', padding: 0, marginBottom: '8px' }}>
        {group.children.map((child) => (
          <ContentTreeNode key={child.key} item={child} expandedItems={expandedItems} toggle={toggle} depth={0} />
        ))}
      </div>
    );
  }

  return (
    <div css={{ display: 'block', padding: 0, position: 'relative', marginBottom: '8px' }}>
      <div
        onClick={() => toggle(groupKey)}
        css={{
          fontFamily,
          margin: '1px 8px 3px',
          padding: '8px 12px',
          minHeight: '32px',
          borderRadius: '7px',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          position: 'relative',
          color: colors.fontColorLighterGray,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background 140ms ease, box-shadow 140ms ease, color 140ms ease',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.06)',
            boxShadow: '0 6px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            color: colors.fontColorPrimary
          }
        }}
      >
        {group.icon && group.icon({ size: 16 })}
        <span css={{ flex: 1 }}>{group.title}</span>
        <ChevronRight
          size={14}
          css={{
            opacity: 0.5,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: `transform ${COLLAPSE_DURATION_MS}ms ease`
          }}
        />
      </div>
      <div
        aria-hidden={!isExpanded}
        css={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: `grid-template-rows ${COLLAPSE_DURATION_MS}ms ease`
        }}
      >
        <div
          ref={childrenContainerRef}
          css={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 0,
            marginLeft: '10px'
          }}
        >
          {guide && (
            <svg
              width={guide.width}
              height={guide.height}
              css={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}
            >
              <path d={guide.d} stroke={colors.borderColorLight} strokeWidth={1} fill="none" />
            </svg>
          )}
          {group.children.map((child) => (
            <ContentTreeNode
              key={child.key}
              item={child}
              expandedItems={expandedItems}
              toggle={toggle}
              depth={1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
