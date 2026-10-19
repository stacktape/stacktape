import { Button } from '@stacktape/ui-react/button';
import type { WizardState } from '../session';
import { CopyableCommand } from './CopyableCommand';
import { Row } from './RowList';

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
  const title = `Use Stacktape from ${label}`;

  if (status === 'connected') {
    return (
      <Row
        description={
          <>
            {label} is connected to Stacktape. {detail} Then ask it:{' '}
            <span className="text-[var(--stp-text-primary)]">“Use Stacktape to show what this project deploys.”</span>
          </>
        }
        title={
          <>
            <span aria-hidden className="wizard-check-mark is-passed">
              ✓
            </span>
            {title}
          </>
        }
      />
    );
  }

  return (
    <Row
      action={
        <Button isLoading={isBusy || status === 'running'} onClick={onConnect} variant="secondary">
          {status === 'failed' ? 'Try again' : `Connect ${label}`}
        </Button>
      }
      description={
        <>
          {label} can then deploy this project, read its logs and metrics and look up Stacktape docs. It asks before
          changing infrastructure. Adds the Stacktape MCP server to {label} for your user, not to this repository.
        </>
      }
      title={title}
    >
      {status === 'failed' && (
        <p className="m-0 mb-3 text-[0.9rem]">
          <strong>{label} was not connected.</strong> <span className="text-[var(--stp-text-muted)]">{detail}</span>
        </p>
      )}
      <p className="m-0 mb-2 text-[0.9rem] text-[var(--stp-text-muted)]">Or run the same setup in a terminal:</p>
      <CopyableCommand command={command} />
    </Row>
  );
}
