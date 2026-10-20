import { useEffect, useState } from 'react';
import type { Step } from '../steps';

/**
 * The rail down the left: where you are, not where you may go.
 *
 * It is a guide, not navigation. The page is one continuous document, so the rail follows the
 * scroll rather than driving it — clicking an entry moves you there, but nothing is ever hidden
 * behind it and no step has to be "completed" to see the next one.
 *
 * That is the whole difference from the stepper this replaced. A stepper implies a gate. Reading
 * down a page implies momentum, which is what this flow is actually trying to have.
 */
const NONE_OPENED: readonly string[] = [];

export function GuideRail({ steps, openedIds = NONE_OPENED }: { steps: Step[]; openedIds?: readonly string[] }) {
  // Keyed by id rather than by object: the steps array is rebuilt on every publish, and the observer
  // only needs to be rewired when a *new* section appears. A finished step is one line on the page,
  // which is never what you are reading, so only the current step and finished ones opened again
  // are watched; otherwise the line at the top of the page would win.
  const reachable = steps
    .filter((step) => step.status === 'active' || (step.status === 'done' && openedIds.includes(step.id)))
    .map((step) => step.id)
    .join(',');
  const active = steps.find((step) => step.status === 'active')?.id;
  const [inView, setInView] = useState<string | undefined>(active);

  // A step that just became active is where the run is, and its section scrolls itself into view.
  // The observer below cannot be relied on to say so: on a page too short to scroll, or when the new
  // section starts below the top third, nothing ever "enters", and the rail kept marking a finished
  // step as the current one.
  useEffect(() => {
    if (active !== undefined) setInView(active);
  }, [active, reachable]);

  useEffect(() => {
    const sections = reachable
      .split(',')
      .map((id) => document.getElementById(`section-${id}`))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    // The top third of the viewport: a section counts as "the one you are reading" when its heading
    // is near the top, not when it is centred — which is how reading actually feels.
    // The first callback only reports where the sections are when observing starts; taking it would
    // put the marker back on a finished step at the top of the page.
    let primed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!primed) {
          primed = true;
          return;
        }
        const entered = entries.filter((entry) => entry.isIntersecting);
        if (entered.length === 0) return;
        const first = entered.toSorted((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]!;
        setInView(first.target.id.replace('section-', ''));
      },
      { rootMargin: '-8% 0px -66% 0px', threshold: 0 }
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [reachable]);

  return (
    <nav aria-label="Progress" className="wizard-rail">
      <ol>
        {steps.map((step) => {
          const arrived = step.status !== 'todo';
          const current = step.id === inView && arrived;
          return (
            <li
              className={`wizard-rail-step is-${step.status}${current ? ' is-current' : ''}`}
              key={step.id}
              {...(current ? { 'aria-current': 'step' as const } : {})}
            >
              {/* A step not reached yet is a name, not a link: there is nothing to jump to. */}
              {arrived ? (
                <a href={`#section-${step.id}`}>
                  <RailEntry step={step} />
                </a>
              ) : (
                <span className="wizard-rail-entry">
                  <RailEntry step={step} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function RailEntry({ step }: { step: Step }) {
  return (
    <>
      <span aria-hidden className="wizard-rail-marker">
        {step.status === 'done' ? '✓' : ''}
      </span>
      {/* The facts of a finished step are on its line in the page, next to the rail. */}
      <span>{step.title}</span>
    </>
  );
}
