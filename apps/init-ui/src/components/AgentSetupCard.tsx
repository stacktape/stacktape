import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import type { WizardState } from '../session';
import { CopyableCommand } from './CopyableCommand';

/**
 * Connecting the coding agent the user already picked, instead of asking which one.
 *
 * It changes the agent's own configuration in the user's home directory, which nothing else on this page does, so
 * the card says that before the button and shows the terminal command that makes the same change.
 */
export function AgentSetupCard({
  setup,
  onConnect,
  isBusy
}: {
  setup: NonNullable<WizardState['codingAgentSetup']>;
  onConnect: () => void;
  isBusy: boolean;
}) {
  const { label, status, detail, command } = setup;

  if (status === 'connected') {
    return (
      <section>
        <h3 className="wizard-section-heading">Use Stacktape from {label}</h3>
        <p className="m-0 text-[var(--stp-text-muted)]">
          {label} is connected to Stacktape. {detail} Then ask it:{' '}
          <span className="text-[var(--stp-text-primary)]">“Use Stacktape to show what this project deploys.”</span>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="wizard-section-heading">Use Stacktape from {label}</h3>
      <p className="wizard-lede mb-4">
        Once connected, {label} can deploy this project, read its logs and metrics and look up Stacktape docs for you.
        It asks you before changing infrastructure. This adds the Stacktape MCP server to {label} for your user, outside
        this repository.
      </p>
      {status === 'failed' && (
        <Alert className="mb-3" tone="warning" title={`${label} was not connected`}>
          {detail}
        </Alert>
      )}
      <Button isLoading={isBusy || status === 'running'} onClick={onConnect} variant="secondary">
        {status === 'failed' ? 'Try again' : `Connect ${label}`}
      </Button>
      <p className="m-0 mt-3 mb-2 text-[0.9rem] text-[var(--stp-text-muted)]">Or run the same setup in a terminal:</p>
      <CopyableCommand command={command} />
    </section>
  );
}
