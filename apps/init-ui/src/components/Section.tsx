import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One band of the page.
 *
 * Sections appear as the run reaches them and never disappear: what happened earlier stays above
 * you, which is what makes this a document rather than a slideshow. A section that arrives while
 * you are looking at the previous one brings itself into view, so the page advances by itself and
 * you are never left reading something that has been superseded.
 *
 * A finished band shrinks to one checked line: what came of it, with the same mark the rail puts on
 * the step. The work is behind you, and at full size it pushed the step you are on far down the
 * page. Its content is one click away.
 *
 * The band you are on carries no label of its own: the page title names it and the rail marks it.
 * A third label between those two was the same word a third time.
 */
export function Section({
  id,
  label,
  children,
  isActive,
  isMuted = false,
  summary,
  isExpanded = false,
  onToggle,
  toggleLabel,
  hideLabel,
  scrollKey
}: {
  id: string;
  /** The step's name, for assistive technology; the rail shows it. */
  label: string;
  children?: ReactNode;
  /** The section the run is currently on. Only this one scrolls itself into view. */
  isActive: boolean;
  /** Behind the user. Rendered quieter, still readable, never hidden. */
  isMuted?: boolean;
  /** Set when the band is finished: the one line it collapses to. */
  summary?: ReactNode;
  /** A collapsed band whose content the user opened again. */
  isExpanded?: boolean;
  /** Opens or closes the content of a collapsed band. Without it, the summary is all there is. */
  onToggle?: () => void;
  /** What the toggle says while the content is closed, and while it is open. */
  toggleLabel?: string;
  hideLabel?: string;
  /** Brings an active band back into view whenever this changes, such as when a deploy starts or ends. */
  scrollKey?: string;
}) {
  const element = useRef<HTMLElement>(null);
  const announced = useRef<string | undefined>(undefined);

  useEffect(() => {
    const key = `${scrollKey ?? ''}`;
    if (!isActive || announced.current === key) return;
    const first = announced.current === undefined;
    announced.current = key;
    // Not on the very first section: scrolling the page on load would fight someone who has already
    // started reading it.
    if (element.current === null || (first && element.current.previousElementSibling === null)) return;
    element.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isActive, scrollKey]);

  const collapsed = summary !== undefined;
  const className = [
    'wizard-section',
    isMuted && !isExpanded ? 'is-muted' : '',
    collapsed ? 'is-collapsed' : '',
    collapsed && isExpanded ? 'is-expanded' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section aria-label={label} className={className} id={`section-${id}`} ref={element}>
      {collapsed ? (
        <header className="wizard-section-summary">
          <span aria-hidden className="wizard-section-check">
            ✓
          </span>
          <div className="wizard-section-summary-text">
            {summary}
            {onToggle !== undefined && (
              <button
                aria-controls={`section-${id}-content`}
                aria-expanded={isExpanded}
                className="wizard-disclosure"
                onClick={onToggle}
                type="button"
              >
                {isExpanded ? (hideLabel ?? 'Hide') : (toggleLabel ?? 'Show')}
              </button>
            )}
          </div>
        </header>
      ) : null}
      {(!collapsed || isExpanded) && children !== undefined && (
        <div className={collapsed ? 'wizard-section-reopened' : undefined} id={`section-${id}-content`}>
          {children}
        </div>
      )}
    </section>
  );
}
