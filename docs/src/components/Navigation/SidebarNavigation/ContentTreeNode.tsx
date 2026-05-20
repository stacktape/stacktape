import { useRouter } from 'next/router';
import { useSyncExternalStore } from 'react';
import { ChevronRight } from 'react-feather';
import { Link } from '@/components/Mdx/Link';
import { colors, fontFamily } from '@/styles/variables';
import config from '../../../../config';
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

export function ContentTreeNode({
  item,
  expandedItems,
  toggle,
  depth
}: {
  item: NavItem;
  expandedItems: Record<string, boolean>;
  toggle: (key: string) => void;
  depth: number;
}) {
  const router = useRouter();
  const hasChildren = item.children.length > 0;
  const isVirtual = item.url === null;

  const normalizedPath = (router.asPath || '/').split('?')[0].replace(/\/$/, '') || '/';
  const normalizedUrl = (item.url || '/').replace(/\/$/, '') || '/';
  const isActive = !isVirtual && (normalizedPath === normalizedUrl || normalizedPath === config.metadata.pathPrefix + normalizedUrl);

  const isExpanded = expandedItems[item.key] ?? false;

  // Only show active styles after client mount to avoid hydration mismatch.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const showActive = isClient && isActive;

  const isSubgroup = hasChildren;
  // Push the pill itself inward with depth so the hover/active background gets narrower as
  // items nest deeper — visually reinforces hierarchy and avoids a wall of full-width pills.
  // Padding only carries the base indent; the depth-based offset rides on the left margin so
  // the label still lands in the same column.
  const rowMarginLeft = ROW_OUTER_MARGIN_X + depth * DEPTH_STEP;
  const indent = ROW_BASE_INDENT;

  // Whole-row interactive surface. Rounded pill with horizontal margin so it doesn't touch the
  // sidebar edge. Active state shows a small rounded indicator bar via `::before`. Hover/active
  // styles AND the click handler live here so the hover background exactly matches what's
  // clickable, and clicks land regardless of whether the pointer is over the chevron, the gap,
  // or the label.
  const interactiveRowStyles = {
    fontFamily,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: `${ROW_MIN_HEIGHT}px`,
    margin: `1px ${ROW_OUTER_MARGIN_X}px 1px ${rowMarginLeft}px`,
    paddingTop: `${ROW_PADDING_Y}px`,
    paddingBottom: `${ROW_PADDING_Y}px`,
    paddingLeft: `${indent}px`,
    paddingRight: `${ROW_PADDING_RIGHT}px`,
    borderRadius: `${ROW_BORDER_RADIUS}px`,
    background: showActive ? 'linear-gradient(135deg, rgb(60, 64, 64), rgb(44, 47, 47))' : 'transparent',
    boxShadow: showActive
      ? '0 4px 12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(190, 190, 190, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : 'none',
    color: colors.fontColorPrimary,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 140ms ease, box-shadow 140ms ease, color 140ms ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '6px',
      top: '20%',
      width: '3px',
      height: '60%',
      borderRadius: '999px',
      background: colors.fontColorPrimary,
      opacity: showActive ? 1 : 0,
      transition: 'opacity 150ms ease'
    },
    '&:hover': showActive
      ? {
          boxShadow:
            '0 5px 14px rgba(0, 0, 0, 0.49), 0 0 0 1px rgba(220, 220, 220, 0.17), inset 0 1px 0 rgba(255, 255, 255, 0.11)'
        }
      : {
          background: 'rgba(255, 255, 255, 0.06)',
          boxShadow: '0 6px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        },
    '&:hover::before': showActive ? undefined : { opacity: 0.4 }
  } as const;

  const labelStyles = {
    flex: 1,
    minWidth: 0,
    color: isSubgroup ? colors.lightGray : colors.fontColorPrimary,
    fontSize: isSubgroup ? '12px' : '13.5px',
    fontWeight: isSubgroup ? 600 : 400,
    letterSpacing: isSubgroup ? '0.5px' : '0.02em',
    textTransform: isSubgroup ? ('uppercase' as const) : ('none' as const),
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const
  } as const;

  // Chevron lives on the right edge — matches the top-level group header so every expandable
  // row uses the same indicator regardless of depth. Leaves don't render one.
  const chevronEl = hasChildren ? (
    <ChevronRight
      size={CHEVRON_SIZE}
      css={{
        flexShrink: 0,
        opacity: 0.5,
        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: `transform ${COLLAPSE_DURATION_MS}ms ease`
      }}
    />
  ) : null;

  // Subgroup icon — only rendered on virtual subgroup nodes that have a configured icon
  // (e.g. Resources/Compute, Packaging/Containers). Real pages and unconfigured virtual nodes
  // skip it. The icon sits before the label and uses a slightly smaller size than the top-level
  // group icon so the hierarchy reads visually.
  const iconEl = item.icon ? (
    <span css={{ flexShrink: 0, display: 'inline-flex', opacity: 0.85 }}>{item.icon({ size: 14 })}</span>
  ) : null;

  return (
    <>
      <li data-guide-row="true" css={{ listStyle: 'none', display: 'block', padding: 0, margin: 0 }}>
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
          <ul
            css={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: 0,
              padding: 0,
              margin: 0
            }}
          >
            {item.children.map((child) => (
              <ContentTreeNode
                key={child.key}
                item={child}
                expandedItems={expandedItems}
                toggle={toggle}
                depth={depth + 1}
              />
            ))}
          </ul>
        </li>
      )}
    </>
  );
}
