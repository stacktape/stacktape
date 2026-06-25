import { createElement, memo } from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'react-feather';
import { Link } from '@/components/Mdx/Link';
import { useExpansionToggle, useIsActiveUrl, useIsExpanded } from './expansion-store';
import type { NavItem } from './navigation-data';

// Layout constants. Rows render as rounded pills with a horizontal gutter; `ROW_OUTER_MARGIN_X`
// is the space between the pill edge and the sidebar edge. Each depth step adds extra left
// padding so children visually nest under their parent. The chevron lives on the right edge
// of subsection rows, matching the top-level group header style.
const ROW_OUTER_MARGIN_X = 8;
const CHEVRON_SIZE = 14;
const DEPTH_STEP = 12;

// Static row styling lives in the `.stp-nav-row` (+ `.is-active`) class in global.css. Only the
// per-depth left margin (dynamic) is applied inline.
const labelBase = 'flex-1 min-w-0 leading-[1.4] truncate select-none';
const labelSubgroup = clsx(labelBase, 'text-light-gray text-[12px] font-semibold tracking-[0.5px] uppercase');
const labelLeaf = clsx(labelBase, 'text-fc-primary text-[13.5px] font-normal tracking-[0.02em] normal-case');
const iconWrapClass = 'shrink-0 inline-flex opacity-[0.85]';
const listItemRowClass = 'list-none block p-0 m-0';
const listItemInnerListClass = 'relative overflow-hidden min-h-0 p-0 m-0';
const chevronBaseClass = 'shrink-0 opacity-[0.5] [transition:transform_220ms_ease]';

function ContentTreeNodeInner({ item, depth }: { item: NavItem; depth: number }) {
  const toggle = useExpansionToggle();
  const hasChildren = item.children.length > 0;

  // Per-key store selectors — only this component re-renders when its own slice changes.
  // Sibling/cousin toggles and unrelated route changes don't reach us. `useIsActiveUrl`'s SSR
  // snapshot returns false, so SSR HTML never shows an active pill — hydration matches.
  const isExpanded = useIsExpanded(item.key);
  const showActive = useIsActiveUrl(item.url);

  const isSubgroup = hasChildren;
  // Push the pill itself inward with depth so the hover/active background gets narrower as
  // items nest deeper — visually reinforces hierarchy and avoids a wall of full-width pills.
  const rowMarginLeft = ROW_OUTER_MARGIN_X + depth * DEPTH_STEP;
  const rowClassName = clsx('stp-nav-row', showActive && 'is-active');
  const rowStyle = { margin: `1px ${ROW_OUTER_MARGIN_X}px 1px ${rowMarginLeft}px` };

  const labelClassName = isSubgroup ? labelSubgroup : labelLeaf;

  // Chevron lives on the right edge — matches the top-level group header so every expandable
  // row uses the same indicator regardless of depth. Leaves don't render one.
  const chevronEl = hasChildren ? (
    <ChevronRight
      size={CHEVRON_SIZE}
      className={chevronBaseClass}
      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
    />
  ) : null;

  // Subgroup icon — only rendered on virtual subgroup nodes that have a configured icon
  // (e.g. Resources/Compute, Packaging/Containers). Real pages and unconfigured virtual nodes
  // skip it.
  const iconEl = item.icon ? <span className={iconWrapClass}>{createElement(item.icon, { size: 14 })}</span> : null;

  return (
    <>
      <li data-guide-row="true" className={listItemRowClass}>
        {hasChildren ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggle(item.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(item.key);
              }
            }}
            className={rowClassName}
            style={rowStyle}
          >
            {iconEl}
            <span className={labelClassName}>{item.title}</span>
            {chevronEl}
          </div>
        ) : (
          <Link href={item.url || '/'} className={rowClassName} style={rowStyle}>
            <span className={labelClassName}>{item.title}</span>
          </Link>
        )}
      </li>

      {hasChildren && (
        <li
          aria-hidden={!isExpanded}
          className="list-none grid [transition:grid-template-rows_220ms_ease]"
          style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
        >
          <ul className={listItemInnerListClass}>
            {item.children.map((child) => (
              <ContentTreeNode key={child.key} item={child} depth={depth + 1} />
            ))}
          </ul>
        </li>
      )}
    </>
  );
}

// memo so a parent re-render (e.g. ContentTreeGroup recomputing its guide path) doesn't ripple
// through unchanged subtrees. `item` is a stable reference from the memoized navigation tree, so
// default shallow equality is enough.
export const ContentTreeNode = memo(ContentTreeNodeInner);
