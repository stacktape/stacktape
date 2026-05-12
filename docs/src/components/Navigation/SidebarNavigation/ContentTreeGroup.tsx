import { ChevronRight } from 'react-feather';
import { colors, fontFamily } from '../../../styles/variables';
import { ContentTreeNode } from './ContentTreeNode';
import type { NavGroup } from './navigation-data';

const COLLAPSE_DURATION_MS = 220;

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

  // Root group (catch-all for the index page) renders without a header and is always expanded.
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
          css={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 0,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '22px',
              top: '4px',
              bottom: '4px',
              width: '1px',
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 14%, rgba(255,255,255,0.1) 86%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none'
            }
          }}
        >
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
