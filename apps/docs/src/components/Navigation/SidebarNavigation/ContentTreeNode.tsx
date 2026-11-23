import { createContext, createElement, memo, useContext, type CSSProperties } from 'react';
import { ChevronRight } from 'react-feather';
import { ensureTrailingSlash } from '@/utils/seo';
import { useExpansionToggle, useIsActiveUrl, useIsExpanded } from './expansion-store';
import type { NavItem } from './navigation-data';

/** Prefix of the disclosure IDs, so the desktop sidebar and the phone drawer render distinct `aria-controls` targets. */
export const NavIdPrefixContext = createContext('docs-nav');

const INDENT_BASE = 12;
const INDENT_STEP = 20;

/** Rows indent by depth; the tree guide of a nested list runs under its parent's icon. */
export const navIndentStyle = (depth: number) =>
  ({ '--docs-nav-indent': `${INDENT_BASE + depth * INDENT_STEP}px` }) as CSSProperties;

const guideStyle = (depth: number) =>
  ({ '--docs-guide-x': `${INDENT_BASE + (depth - 1) * INDENT_STEP + 7}px` }) as CSSProperties;

function ContentTreeNodeInner({ item, depth }: { item: NavItem; depth: number }) {
  const toggle = useExpansionToggle();
  const hasChildren = item.children.length > 0;
  // Per-key store selectors: only this row re-renders when its own slice changes.
  const isExpanded = useIsExpanded(item.key);
  // A link to another group's page is not where the page sits, so it is never marked as the current page.
  const isActive = useIsActiveUrl(item.crossLink ? null : item.url);
  const childrenId = `${useContext(NavIdPrefixContext)}-${item.key.replace(/[^a-z0-9]+/gi, '-')}`;
  // Top-level rows (the docs home) use the section icons' size, so their labels line up with the sections'.
  const icon = item.icon ? (
    <span className="docs-nav-icon">{createElement(item.icon, { size: depth === 0 ? 16 : 15 })}</span>
  ) : null;
  const chevron = <ChevronRight size={14} className="docs-nav-chevron" aria-hidden />;

  let row;
  if (!hasChildren) {
    row = (
      <a
        href={ensureTrailingSlash(item.url || '/')}
        className={depth === 0 ? 'docs-nav-row is-root' : 'docs-nav-row'}
        aria-current={isActive ? 'page' : undefined}
        style={navIndentStyle(depth)}
      >
        {icon}
        <span className="docs-nav-label">{item.title}</span>
      </a>
    );
  } else if (item.url) {
    // A page that also has child pages: the label opens the page, the chevron toggles the children.
    row = (
      <div className="relative flex items-center">
        <a
          href={ensureTrailingSlash(item.url)}
          className="docs-nav-row is-branch pr-[36px]"
          aria-current={isActive ? 'page' : undefined}
          style={navIndentStyle(depth)}
        >
          {icon}
          <span className="docs-nav-label">{item.title}</span>
        </a>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={childrenId}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`}
          onClick={() => toggle(item.key)}
          className="absolute right-[2px] flex h-[28px] w-[28px] items-center justify-center rounded-[6px] hover:bg-[var(--docs-bg-hover)]"
        >
          {chevron}
        </button>
      </div>
    );
  } else {
    row = (
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={childrenId}
        onClick={() => toggle(item.key)}
        className="docs-nav-row is-branch"
        style={navIndentStyle(depth)}
      >
        {icon}
        <span className="docs-nav-label">{item.title}</span>
        {chevron}
      </button>
    );
  }

  return (
    <li>
      {row}
      {hasChildren && (
        <div
          id={childrenId}
          className={isExpanded ? 'docs-nav-children is-open' : 'docs-nav-children'}
          inert={!isExpanded}
        >
          <ul className="docs-nav-list" style={guideStyle(depth + 1)}>
            {item.children.map((child) => (
              <ContentTreeNode key={child.key} item={child} depth={depth + 1} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

// memo so a parent re-render doesn't ripple through unchanged subtrees. `item` is a stable reference from the
// memoized navigation tree.
export const ContentTreeNode = memo(ContentTreeNodeInner);
