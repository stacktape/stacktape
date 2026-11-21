import { Button } from '@stacktape/ui-react/button';
import { Fragment } from 'react';
import type { WizardState } from '../session';
import { type AnalyzerChoice, AnalyzerPicker, useAnalyzerChoice } from './start/analyzer';

type JourneyStep = { id: 'analyze' | 'review' | 'deploy' | 'live'; name: string; time: string; text: string };

/** The four steps from here to a running app, each with a rough time and what happens in it. */
const journey = (choice: AnalyzerChoice): JourneyStep[] => [
  {
    id: 'analyze',
    name: 'Analyze',
    // Without an agent the analysis reads a handful of files and is done in seconds.
    time: choice.usesAi ? 'about 1 min' : 'a few seconds',
    text: choice.usesAi
      ? `${choice.agent?.label} analyzes your code and works out what your app needs.`
      : 'Stacktape analyzes your manifests and config files and works out what your app needs.'
  },
  {
    id: 'review',
    name: 'Review',
    time: 'a few minutes',
    text: "See the architecture and the monthly price. Change anything you don't like."
  },
  {
    id: 'deploy',
    name: 'Deploy',
    time: '10–15 min',
    text: 'Stacktape creates it all in your AWS account. Only when you click Deploy.'
  },
  { id: 'live', name: 'Live', time: 'right after', text: 'Your app runs on AWS, with a URL you can open and share.' }
];

/**
 * A project name with places to wrap after its separators: `acme-customer-portal` breaks after a dash, as a person
 * would hyphenate it, and the heading keeps one size for every name.
 */
const wrappableName = (name: string): string[] => name.split(/(?<=[-_./])/);

/**
 * The first screen: the four steps from here to a running app as a track across the page (on a phone, down it), then
 * how the project is analyzed and the button that starts it. The analyzer starts on the CLI's recommendation: the best
 * coding agent on this machine with its own model, or Stacktape without AI when there is none.
 */
export function StartStep({
  state,
  onStart,
  isBusy,
  isLocked
}: {
  state: WizardState;
  onStart: (agentId: string, modelId: string) => void;
  isBusy: boolean;
  /** Disconnected from the CLI: the analysis cannot start until it is back. */
  isLocked: boolean;
}) {
  const choice = useAnalyzerChoice(state.agents ?? []);
  return (
    <div className="w-start w-enter">
      <div className="w-start-body">
        <h1 className="w-start-title">
          Deploy{' '}
          <span className="w-start-name">
            {wrappableName(state.projectName).map((part, index) => (
              // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed name.
              <Fragment key={index}>
                {index > 0 && <wbr />}
                {part}
              </Fragment>
            ))}
          </span>{' '}
          to your AWS account
        </h1>

        <ol aria-label="From here to a running app" className="w-start-track">
          {journey(choice).map((step, index) => (
            <li className={`w-start-step${index === 0 ? ' is-next' : ''}`} key={step.id}>
              <span aria-hidden className="w-start-stop">
                {index + 1}
              </span>
              <span className="w-start-step-name">{step.name}</span>
              <span className="w-start-time">{step.time}</span>
              <p className="w-start-text">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="w-start-action">
          <AnalyzerPicker choice={choice} isDisabled={isBusy} />
          <Button
            className="w-start-button"
            disabled={isLocked}
            isLoading={isBusy}
            onClick={() => onStart(choice.agentId, choice.modelId)}
            variant="primary"
          >
            Analyze my project
          </Button>
        </div>
      </div>

      <p className="w-start-foot">
        <span className="w-start-foot-line">
          Analyzing doesn't change your code or create anything on AWS. No Stacktape account needed.
        </span>
        <span className="w-start-foot-line">
          Sends anonymous usage statistics, never code or names.{' '}
          <span className="w-code whitespace-nowrap">STP_DISABLE_TELEMETRY=1</span> turns them off.
        </span>
      </p>
    </div>
  );
}
