import { memo } from 'react';
import { ChevronRight } from 'react-feather';
import { Link } from '@/components/Mdx/Link';
import { colors, fontFamily } from '@/styles/variables';
import { useExpansionToggle, useIsActiveUrl, useIsExpanded } from './expansion-store';
import type { NavItem } from './navigation-data';

const COLLAPSE_DURATION_MS = 220;

// Layout constants. Rows render as rounded pills with a horizontal gutter; `ROW_OUTER_MARGIN_X`
// is the space between the pill edge and the sidebar edge. Each depth step adds extra left
// padding so children visually nest under their parent. The chevron lives on the right edge
// of subsection rows, matching the top-level group header style.
const ROW_OUTER_MARGIN_X = 8;
const ROW_BASE_INDENT = 10;
const CHEVRON_SIZE = 14;
const DEPTH_STEP = 12;
const ROW_PADDING_RIGHT = 12;
const ROW_PADDING_Y = 7;
const ROW_MIN_HEIGHT = 32;
const ROW_BORDER_RADIUS = 7;

// Static portions of the row styles — hoisted out of render so Emotion only serializes them once
// rather than once per node per render. Dynamic bits (depth offset, active state) are merged in
// the small `interactiveRowStyles` spread below.
const rowStyleBase = {
  fontFamily,
  position: 'relative' as const,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minHeight: `${ROW_MIN_HEIGHT}px`,
  paddingTop: `${ROW_PADDING_Y}px`,
  paddingBottom: `${ROW_PADDING_Y}px`,
  paddingLeft: `${ROW_BASE_INDENT}px`,
  paddingRight: `${ROW_PADDING_RIGHT}px`,
  borderRadius: `${ROW_BORDER_RADIUS}px`,
  color: colors.fontColorPrimary,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background 140ms ease, box-shadow 140ms ease, color 140ms ease'
} as const;

const rowActiveStyle = {
  background: 'linear-gradient(135deg, rgb(60, 64, 64), rgb(44, 47, 47))',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(190, 190, 190, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  '&:hover': {
    boxShadow: '0 5px 14px rgba(0, 0, 0, 0.49), 0 0 0 1px rgba(220, 220, 220, 0.17), inset 0 1px 0 rgba(255, 255, 255, 0.11)'
  }
} as const;

const rowInactiveHoverStyle = {
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.06)',
    boxShadow: '0 6px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  }
} as const;

const labelBaseStyles = {
  flex: 1,
  minWidth: 0,
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const
} as const;

const labelSubgroupStyles = {
  ...labelBaseStyles,
  color: colors.lightGray,
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const
} as const;

const labelLeafStyles = {
  ...labelBaseStyles,
  color: colors.fontColorPrimary,
  fontSize: '13.5px',
  fontWeight: 400,
  letterSpacing: '0.02em',
  textTransform: 'none' as const
} as const;

const iconWrapStyles = { flexShrink: 0, display: 'inline-flex', opacity: 0.85 } as const;
const listItemRowStyles = { listStyle: 'none' as const, display: 'block', padding: 0, margin: 0 } as const;
const listItemInnerListStyles = {
  position: 'relative' as const,
  overflow: 'hidden',
  minHeight: 0,
  padding: 0,
  margin: 0
} as const;
const chevronBaseStyles = { flexShrink: 0, opacity: 0.5, transition: `transform ${COLLAPSE_DURATION_MS}ms ease` };

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

  // Only the truly dynamic slice is constructed per render. The rest is hoisted at module scope.
  const interactiveRowStyles = {
    ...rowStyleBase,
    margin: `1px ${ROW_OUTER_MARGIN_X}px 1px ${rowMarginLeft}px`,
    ...(showActive ? rowActiveStyle : rowInactiveHoverStyle)
  };

  const labelStyles = isSubgroup ? labelSubgroupStyles : labelLeafStyles;

  // Chevron lives on the right edge — matches the top-level group header so every expandable
  // row uses the same indicator regardless of depth. Leaves don't render one.
  const chevronEl = hasChildren ? (
    <ChevronRight
      size={CHEVRON_SIZE}
      css={{ ...chevronBaseStyles, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
    />
  ) : null;

  // Subgroup icon — only rendered on virtual subgroup nodes that have a configured icon
  // (e.g. Resources/Compute, Packaging/Containers). Real pages and unconfigured virtual nodes
  // skip it.
  const iconEl = item.icon ? <span css={iconWrapStyles}>{item.icon({ size: 14 })}</span> : null;

  return (
    <>
      <li data-guide-row="true" css={listItemRowStyles}>
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
            css={interactiveRowStyles}
          >
            {iconEl}
            <span css={labelStyles}>{item.title}</span>
            {chevronEl}
          </div>
        ) : (
          <Link href={item.url || '/'} rootCss={interactiveRowStyles}>
            <span css={labelStyles}>{item.title}</span>
          </Link>
        )}
      </li>

      {hasChildren && (
        <li
          aria-hidden={!isExpanded}
          css={{
            listStyle: 'none',
            display: 'grid',
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
            transition: `grid-template-rows ${COLLAPSE_DURATION_MS}ms ease`
          }}
        >
          <ul css={listItemInnerListStyles}>
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
