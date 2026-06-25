import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

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
    <div className="mt-[20px] mr-0 mb-[24px] ml-0">
      {labels.length > 0 && (
        <div className="flex gap-0 border-b border-b-[rgba(255,255,255,0.1)] mb-[12px]">
          {labels.map((label, idx) => (
            <button
              key={`${label}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={clsx(
                'bg-none border-none py-[3px] px-[16px] text-[14px] leading-[1.5] cursor-pointer [transition:color_0.15s,border-color_0.15s] hover:text-fc-primary',
                idx === activeIndex
                  ? 'border-b-2 border-b-primary text-fc-primary font-semibold'
                  : 'border-b-2 border-b-transparent text-fc-ternary font-normal'
              )}
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
