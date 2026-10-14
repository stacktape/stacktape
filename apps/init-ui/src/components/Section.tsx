import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One band of the page.
 *
 * Sections appear as the run reaches them and never disappear: what happened earlier stays above
 * you, which is what makes this a document rather than a slideshow. A section that arrives while
 * you are looking at the previous one brings itself into view, so the page advances by itself and
 * you are never left reading something that has been superseded.
 *
 * A finished band shrinks to one line: its name and what came of it. The work is behind you, and
 * at full size it pushed the step you are on far down the page. Its content is one click away.
 */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  isActive,
  isMuted = false,
  summary,
  isExpanded = false,
  onToggle,
  toggleLabel,
  scrollKey
}: {
  id: string;
  eyebrow: string;
  title?: string;
  lede?: string;
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
  /** What the toggle says while the content is closed. */
  toggleLabel?: string;
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
    <section className={className} id={`section-${id}`} ref={element}>
      {collapsed ? (
        <header className="wizard-section-summary">
          <p className="wizard-step-label">{eyebrow}</p>
          <div className="wizard-section-summary-text">{summary}</div>
          {onToggle !== undefined && (
            <button
              aria-controls={`section-${id}-content`}
              aria-expanded={isExpanded}
              className="wizard-disclosure"
              onClick={onToggle}
              type="button"
            >
              {isExpanded ? 'Hide' : (toggleLabel ?? 'Show')}
            </button>
          )}
        </header>
      ) : (
        <header className="wizard-section-header">
          <p className="wizard-step-label">{eyebrow}</p>
          {title !== undefined && <h2 className="wizard-section-title">{title}</h2>}
          {lede !== undefined && <p className="wizard-lede">{lede}</p>}
        </header>
      )}
      {(!collapsed || isExpanded) && children !== undefined && (
        <div className={collapsed ? 'wizard-section-reopened' : undefined} id={`section-${id}-content`}>
          {children}
        </div>
      )}
    </section>
  );
}
