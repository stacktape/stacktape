import type { ReactNode } from 'react';
import { Tabs as SharedTabs } from '@stacktape/ui-react/tabs';
import { useEffect, useId, useRef, useState } from 'react';

function getTabPanels(root: HTMLDivElement): HTMLElement[] {
  // Astro preserves slotted children inside an `<astro-slot>` element when the React island hydrates.
  // Direct React consumers do not have that wrapper, so support both shapes without searching into
  // nested tab groups.
  const contentRoot = root.querySelector<HTMLElement>(':scope > astro-slot') ?? root;
  return Array.from(contentRoot.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('stp-tab-panel')
  );
}

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
  const generatedId = useId();
  const tabsId = `docs-tabs-${generatedId}`;
  const ref = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const panels = getTabPanels(ref.current);
    setLabels(panels.map((panel) => panel.dataset.tabLabel || ''));
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const panels = getTabPanels(ref.current);
    panels.forEach((panel, idx) => {
      panel.id = `${tabsId}-panel-${idx}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `${tabsId}-tab-${idx}`);
      panel.style.display = idx === activeIndex ? 'block' : 'none';
    });
  }, [activeIndex, labels, tabsId]);

  return (
    <div className="mt-[20px] mr-0 mb-[24px] ml-0">
      {labels.length > 0 && (
        <SharedTabs
          appearance="underline"
          ariaLabel="Documentation section"
          className="stp-doc-tabs"
          id={tabsId}
          onValueChange={setActiveIndex}
          size="small"
          tabs={labels.map((label, index) => ({ label, value: index, panelId: `${tabsId}-panel-${index}` }))}
          value={activeIndex}
          width="fit"
        />
      )}
      <div ref={ref}>{children}</div>
    </div>
  );
}
