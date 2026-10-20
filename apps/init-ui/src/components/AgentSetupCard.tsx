import { Alert } from '@stacktape/ui-react/alert';
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
        isDone
        title={title}
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
      {/* The terminal command is the way past a failure, so it appears with one; before that the
          button is the whole offer. */}
      {status === 'failed' && (
        <div className="flex flex-col gap-3">
          <Alert tone="danger" title={`${label} was not connected`}>
            {detail}
          </Alert>
          <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">Or run the same setup in a terminal:</p>
          <CopyableCommand command={command} />
        </div>
      )}
    </Row>
  );
}
