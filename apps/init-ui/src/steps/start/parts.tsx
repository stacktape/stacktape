import { Button } from '@stacktape/ui-react/button';
import { Fragment } from 'react';
import type { WizardState } from '../../session';
import type { AnalyzerChoice } from './analyzer';

/** What every version of the first screen gets from the wizard. */
export type StartProps = {
  state: WizardState;
  choice: AnalyzerChoice;
  onStart: () => void;
  isBusy: boolean;
  /** Disconnected from the CLI: the analysis cannot start until it is back. */
  isLocked: boolean;
};

export type JourneyStep = { id: 'analyze' | 'review' | 'deploy' | 'live'; name: string; time: string; text: string };

/** The four steps from here to a running app, each with a rough time and what happens in it. */
export const journey = (choice: AnalyzerChoice): JourneyStep[] => [
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

export function StartTitle({ projectName, className }: { projectName: string; className?: string }) {
  return (
    <h1 className={`w-start-title${className === undefined ? '' : ` ${className}`}`}>
      Deploy{' '}
      <span className="w-start-name">
        {wrappableName(projectName).map((part, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed name.
          <Fragment key={index}>
            {index > 0 && <wbr />}
            {part}
          </Fragment>
        ))}
      </span>{' '}
      to your AWS account
    </h1>
  );
}

export function StartButton({ onStart, isBusy, isLocked }: Pick<StartProps, 'onStart' | 'isBusy' | 'isLocked'>) {
  return (
    <Button className="w-start-go" disabled={isLocked} isLoading={isBusy} onClick={onStart} variant="primary">
      Analyze my project
    </Button>
  );
}

export const NOTHING_CHANGES = "Analyzing doesn't change your code or create anything on AWS.";
export const NO_ACCOUNT = 'No Stacktape account needed.';

export function Telemetry() {
  return (
    <>
      Sends anonymous usage statistics, never code or names.{' '}
      <span className="w-code whitespace-nowrap">STP_DISABLE_TELEMETRY=1</span> turns them off.
    </>
  );
}
