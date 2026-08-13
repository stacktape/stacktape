import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One band of the page.
 *
 * Sections appear as the run reaches them and never disappear: what happened earlier stays above
 * you, which is what makes this a document rather than a slideshow. A section that arrives while
 * you are looking at the previous one brings itself into view, so the page advances by itself and
 * you are never left reading something that has been superseded.
 */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  isActive,
  isMuted = false
}: {
  id: string;
  eyebrow: string;
  title?: string;
  lede?: string;
  children: ReactNode;
  /** The section the run is currently on. Only this one scrolls itself into view. */
  isActive: boolean;
  /** Behind the user. Rendered quieter, still readable, never hidden. */
  isMuted?: boolean;
}) {
  const element = useRef<HTMLElement>(null);
  const announced = useRef(false);

  useEffect(() => {
    if (!isActive || announced.current) return;
    announced.current = true;
    // Not on the very first section: scrolling the page on load would fight someone who has already
    // started reading it.
    if (element.current === null || element.current.previousElementSibling === null) return;
    element.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isActive]);

  return (
    <section className={`wizard-section${isMuted ? ' is-muted' : ''}`} id={`section-${id}`} ref={element}>
      <header className="wizard-section-header">
        <p className="wizard-step-label">{eyebrow}</p>
        {title !== undefined && <h2 className="wizard-section-title">{title}</h2>}
        {lede !== undefined && <p className="wizard-lede">{lede}</p>}
      </header>
      {children}
    </section>
  );
}
