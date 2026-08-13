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
export function GuideRail({ steps }: { steps: Step[] }) {
  // Keyed by id rather than by object: the steps array is rebuilt on every publish, and the observer
  // only needs to be rewired when a *new* section appears.
  const reachable = steps
    .filter((step) => step.status !== 'todo')
    .map((step) => step.id)
    .join(',');
  const [inView, setInView] = useState<string | undefined>(reachable.split(',')[0]);

  useEffect(() => {
    const sections = reachable
      .split(',')
      .map((id) => document.getElementById(`section-${id}`))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    // The top third of the viewport: a section counts as "the one you are reading" when its heading
    // is near the top, not when it is centred — which is how reading actually feels.
    const observer = new IntersectionObserver(
      (entries) => {
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
              <a
                aria-disabled={!arrived}
                href={arrived ? `#section-${step.id}` : undefined}
                onClick={(event) => {
                  if (!arrived) event.preventDefault();
                }}
              >
                <span aria-hidden className="wizard-rail-marker">
                  {step.status === 'done' ? '✓' : ''}
                </span>
                <span className="wizard-rail-label">
                  {step.title}
                  {step.summary !== undefined && <span className="wizard-rail-summary">{step.summary}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
