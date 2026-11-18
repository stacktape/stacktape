import { BiCheck, BiX } from 'react-icons/bi';

export type PathStepId = 'analyze' | 'review' | 'deploy' | 'live';
export type PathStepStatus = 'pending' | 'current' | 'working' | 'done' | 'failed';
export type PathStep = { id: PathStepId; title: string; status: PathStepStatus };

const STATUS_WORDS: Record<PathStepStatus, string> = {
  pending: '',
  current: ', current step',
  working: ', in progress',
  done: ', done',
  failed: ', stopped here'
};

/** The four steps across the top bar: a ring each, a check once behind you, a turning arc while the run works alone. */
export function StepPath({ steps }: { steps: readonly PathStep[] }) {
  return (
    <ol aria-label="Progress" className="w-path">
      {steps.map((step, index) => (
        <li
          aria-current={step.status === 'current' || step.status === 'working' ? 'step' : undefined}
          className={`w-path-step is-${step.status}`}
          key={step.id}
        >
          <span aria-hidden className="w-path-node">
            {step.status === 'done' ? <BiCheck size={15} /> : step.status === 'failed' ? <BiX size={15} /> : index + 1}
          </span>
          <span className="w-path-label">
            {step.title}
            <span className="sr-only">{STATUS_WORDS[step.status]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
