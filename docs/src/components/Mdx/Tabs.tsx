import { useState, type ReactNode } from 'react';
import { colors } from '../../styles/variables';

export function Tabs({ children }: { children: ReactNode }) {
  // Extract Tab children
  const tabs: Array<{ label: string; children: ReactNode }> = [];

  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (child?.props?.label) {
      tabs.push({ label: child.props.label, children: child.props.children });
    }
  }

  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <div css={{ margin: '25px 0 30px 0' }}>
      <div
        css={{
          display: 'flex',
          gap: '0',
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
          marginBottom: '16px'
        }}
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => setActiveIndex(idx)}
            css={{
              background: 'none',
              border: 'none',
              borderBottom: idx === activeIndex ? `2px solid ${colors.primary}` : '2px solid transparent',
              color: idx === activeIndex ? colors.fontColorPrimary : colors.fontColorTernary,
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: idx === activeIndex ? 600 : 400,
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              '&:hover': {
                color: colors.fontColorPrimary
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[activeIndex]?.children}</div>
    </div>
  );
}

export function Tab({ children }: { label: string; children: ReactNode }) {
  return <>{children}</>;
}
