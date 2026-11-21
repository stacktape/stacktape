import type { CSSProperties } from 'react';

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
 * The four steps in the header, as a timeline track: one 2 px line through four stops, the label under each.
 *
 * The line is filled in the brand colour up to the current stop, and the soft ring sits on that stop; both slide to the
 * next stop when the page moves on. Done stops are filled with a check (a button when the step can be opened again), the
 * current one is an outlined circle with a dot, upcoming ones are outlined in the border colour. On a phone the track is
 * smaller and only the current label shows.
 */
export function StepPath({ steps }: { steps: readonly PathStep[] }) {
  const activeIndex = steps.findIndex(isActive);
  const at = activeIndex === -1 ? steps.length - 1 : activeIndex;
  const failed = steps[at]?.status === 'failed';
  const track = { '--w-track-count': steps.length, '--w-track-at': at } as CSSProperties;

  return (
    <nav aria-label="Progress" className={`w-track${failed ? ' is-failed' : ''}`} style={track}>
      <span aria-hidden className="w-track-rail" />
      <span aria-hidden className="w-track-fill" />
      <span aria-hidden className="w-track-ring" />
      <ol className="w-track-stops">
        {steps.map((step) => {
          const content = (
            <>
              <span aria-hidden className="w-stop-dot">
                {step.status === 'done' && (
                  <svg viewBox="0 0 12 12">
                    <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                  </svg>
                )}
              </span>
              <span className="w-stop-label">{step.title}</span>
              <span className="sr-only">{STATUS_WORDS[step.status]}</span>
            </>
          );
          const className = `w-stop is-${step.status}`;
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
      </ol>
    </nav>
  );
}
