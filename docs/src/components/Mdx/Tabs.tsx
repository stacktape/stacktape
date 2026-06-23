import { useEffect, useRef, useState, type ReactNode } from 'react';
import { colors } from '../../styles/variables';

// Tab renders a labeled panel. The label travels via a data attribute so the (hydrated) Tabs
// island can read it from the slotted DOM — Astro passes island children as rendered HTML, not as
// introspectable React elements, so we can't read `child.props.label`.
export function Tab({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="stp-tab-panel" data-tab-label={label}>
      {children}
    </div>
  );
}

export function Tabs({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const panels = Array.from(ref.current.querySelectorAll<HTMLElement>(':scope > .stp-tab-panel'));
    setLabels(panels.map((panel) => panel.dataset.tabLabel || ''));
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const panels = Array.from(ref.current.querySelectorAll<HTMLElement>(':scope > .stp-tab-panel'));
    panels.forEach((panel, idx) => {
      panel.style.display = idx === activeIndex ? 'block' : 'none';
    });
  }, [activeIndex, labels]);

  return (
    <div css={{ margin: '20px 0 24px 0' }}>
      {labels.length > 0 && (
        <div
          css={{
            display: 'flex',
            gap: '0',
            borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
            marginBottom: '12px'
          }}
        >
          {labels.map((label, idx) => (
            <button
              key={`${label}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              css={{
                background: 'none',
                border: 'none',
                borderBottom: idx === activeIndex ? `2px solid ${colors.primary}` : '2px solid transparent',
                color: idx === activeIndex ? colors.fontColorPrimary : colors.fontColorTernary,
                padding: '3px 16px',
                fontSize: '14px',
                lineHeight: 1.5,
                fontWeight: idx === activeIndex ? 600 : 400,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
                '&:hover': { color: colors.fontColorPrimary }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div ref={ref}>{children}</div>
    </div>
  );
}
