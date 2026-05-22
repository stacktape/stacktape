import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'react-feather';
import { colors, fontFamily } from '../../../styles/variables';
import { ContentTreeNode } from './ContentTreeNode';
import { useExpandedMap, useExpansionToggle, useIsExpanded } from './expansion-store';
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

// Cheap equality for measurement state — avoids setState (and the React re-render + Emotion
// serialization storm of the whole sub-tree) when ResizeObserver fires with the same values.
const sameMeasurement = (
  a: { centers: number[]; totalHeight: number },
  b: { centers: number[]; totalHeight: number }
) => {
  if (a.totalHeight !== b.totalHeight || a.centers.length !== b.centers.length) return false;
  for (let i = 0; i < a.centers.length; i += 1) {
    if (a.centers[i] !== b.centers[i]) return false;
  }
  return true;
};

const useGuidePath = (
  containerRef: React.RefObject<HTMLDivElement>,
  flat: { depth: number }[]
) => {
  const [measured, setMeasured] = useState<{ centers: number[]; totalHeight: number }>({
    centers: [],
    totalHeight: 0
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setMeasured((prev) => {
      const next = measureRows(el);
      return sameMeasurement(prev, next) ? prev : next;
    });

    // Observe ONLY the container. During the 220ms expand animation, the container's content
    // box resizes continuously as the grid track grows — that's enough signal to drive
    // re-measure. Previously we observed every `[data-guide-row]` row as well, which made the
    // observer fire N times per frame and triggered a forced layout (`getBoundingClientRect`
    // on every row) for each fire. With one observer + an rAF guard, we coalesce to at most
    // one measurement per frame. Set up exactly once per group mount — re-creating the
    // observer on every toggle (the old deps=[flat] behavior) was pure waste.
    let raf = 0;
    const ro = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setMeasured((prev) => {
          const next = measureRows(el);
          return sameMeasurement(prev, next) ? prev : next;
        });
      });
    });
    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [containerRef]);

  return useMemo(() => {
    if (flat.length === 0 || measured.centers.length !== flat.length) return null;
    return buildGuidePath(
      flat.map((it, i) => ({ depth: it.depth, centerY: measured.centers[i] })),
      measured.totalHeight
    );
  }, [flat, measured]);
};

export function ContentTreeGroup({ group }: { group: NavGroup }) {
  const groupKey = `group:${group.id}`;
  const isExpanded = useIsExpanded(groupKey);
  const toggle = useExpansionToggle();
  const expandedItems = useExpandedMap();
  const isRootGroup = group.id === '__root';

  const flat = useMemo(
    () => flattenVisibleItems(group.children, isRootGroup ? 0 : 1, expandedItems),
    [group.children, expandedItems, isRootGroup]
  );

  const childrenContainerRef = useRef<HTMLDivElement>(null);
  const guide = useGuidePath(childrenContainerRef, flat);

  // Root group (catch-all for the index page) renders without a header and is always expanded.
  // No guide curve here — the root group is just the Introduction entry, where a guide line would
  // look out of place since there are no nested branches to organize.
  if (isRootGroup) {
    return (
      <div css={{ display: 'block', padding: 0, marginBottom: '8px' }}>
        {group.children.map((child) => (
          <ContentTreeNode key={child.key} item={child} depth={0} />
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
            <ContentTreeNode key={child.key} item={child} depth={1} />
          ))}
        </div>
      </div>
    </div>
  );
}
