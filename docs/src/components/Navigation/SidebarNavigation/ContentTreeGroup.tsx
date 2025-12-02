import type { IconType } from 'react-icons';
import { colors } from '../../../styles/variables';
import { ContentTreeNode } from './ContentTreeNode';

export function ContentTreeGroup({
  title,
  icon,
  children,
  expandedNavItems,
  setExpandedNavItems
}: {
  title: string;
  icon: IconType;
  children: any[];
  expandedNavItems: any[];
  setExpandedNavItems: any[];
}) {
  return (
    <div
      css={{
        display: 'block',
        padding: '0',
        position: 'relative',
        marginBottom: '12px'
      }}
    >
      {title && (
        <p
          css={{
            padding: '5px 16px',
            fontSize: '12.5px',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            position: 'relative',
            color: colors.lightGray,
            marginBottom: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px'
          }}
        >
          {icon({ size: 20 })}
          <span>{title}</span>
        </p>
      )}
      <div>
        {children.map((child) => (
          <ContentTreeNode
            expandedNavItems={expandedNavItems}
            setExpandedNavItems={setExpandedNavItems}
            key={child.url}
            {...child}
          />
        ))}
      </div>
    </div>
  );
}
