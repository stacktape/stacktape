import { createElement, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'react-feather';
import { colors } from '../../../styles/variables';
import { ContentTreeNode } from './ContentTreeNode';
import { useExpandedMap, useExpansionToggle, useIsExpanded } from './expansion-store';
import { buildGuidePath, flattenVisibleItems } from './guide-path';
import type { NavGroup } from './navigation-data';

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
      <div className="block p-0 mb-2">
        {group.children.map((child) => (
          <ContentTreeNode key={child.key} item={child} depth={0} />
        ))}
      </div>
    );
  }

  return (
    <div className="block p-0 relative mb-2">
      <div onClick={() => toggle(groupKey)} className="stp-nav-group-header">
        {group.icon && createElement(group.icon, { size: 16 })}
        <span className="flex-1">{group.title}</span>
        <ChevronRight
          size={14}
          className="opacity-[0.5] [transition:transform_220ms_ease]"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </div>
      <div
        aria-hidden={!isExpanded}
        className="grid [transition:grid-template-rows_220ms_ease]"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div ref={childrenContainerRef} className="relative overflow-hidden min-h-0 ml-[10px]">
          {guide && (
            <svg
              width={guide.width}
              height={guide.height}
              className="absolute left-0 top-0 pointer-events-none overflow-visible"
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
