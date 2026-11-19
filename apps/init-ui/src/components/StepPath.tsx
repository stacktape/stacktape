import { SlidingIndicator } from '@stacktape/ui-react/tabs';
import { useRef } from 'react';
import { BiCheck } from 'react-icons/bi';

export type PathStepId = 'analyze' | 'review' | 'deploy' | 'live';
export type PathStepStatus = 'pending' | 'current' | 'working' | 'done' | 'failed';
export type PathStep = {
  id: PathStepId;
  title: string;
  status: PathStepStatus;
  /** A done step that can be opened again (Review, while on Deploy). Makes the step a button. */
  onSelect?: (() => void) | undefined;
};

const STATUS_WORDS: Record<PathStepStatus, string> = {
  pending: '',
  current: ', current step',
  working: ', in progress',
  done: ', done',
  failed: ', stopped here'
};

const isActive = (step: PathStep) => step.status === 'current' || step.status === 'working' || step.status === 'failed';

/**
 * The four steps in the header, as words.
 *
 * The current step is strong, with a 2 px underline on the header's bottom border that slides to the next step when the
 * page moves on (ui-react's `SlidingIndicator`, so it has the Tabs indicator's timing). A done step is muted with a
 * check, and a button when it can be opened again; an upcoming one is faint. On a narrow screen the four words become
 * one: "Review · 2 of 4".
 */
export function StepPath({ steps }: { steps: readonly PathStep[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const slots = useRef<Partial<Record<PathStepId, HTMLSpanElement | null>>>({});
  const activeIndex = steps.findIndex(isActive);
  const active = steps[activeIndex];

  return (
    <nav aria-label="Progress" className="w-nav-wrap">
      <ol className="w-nav" ref={listRef}>
        {steps.map((step) => {
          const content = (
            <>
              {step.status === 'done' && <BiCheck aria-hidden className="w-nav-check" size={15} />}
              <span className="w-nav-label" data-text={step.title}>
                <span>{step.title}</span>
                <span
                  aria-hidden
                  className="w-nav-slot"
                  ref={(element) => {
                    slots.current[step.id] = element;
                  }}
                />
              </span>
              <span className="sr-only">{STATUS_WORDS[step.status]}</span>
            </>
          );
          const className = `w-nav-item is-${step.status}`;
          return (
            <li aria-current={isActive(step) ? 'step' : undefined} key={step.id}>
              {step.onSelect === undefined ? (
                <span className={className}>{content}</span>
              ) : (
                <button className={className} onClick={step.onSelect} title={`Back to ${step.title}`} type="button">
                  {content}
                </button>
              )}
            </li>
          );
        })}
        <SlidingIndicator
          activeKey={active?.id}
          className={`w-nav-underline${active?.status === 'failed' ? ' is-failed' : ''}`}
          containerRef={listRef}
          getTarget={() => (active === undefined ? null : slots.current[active.id])}
        />
      </ol>
      {active !== undefined && (
        <p aria-hidden className="w-nav-compact">
          {active.title}{' '}
          <span>
            · {activeIndex + 1} of {steps.length}
          </span>
        </p>
      )}
    </nav>
  );
}
