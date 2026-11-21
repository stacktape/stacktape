import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { BiCheck, BiGitBranch } from 'react-icons/bi';
import type { WizardState } from '../session';
import { Row } from './RowList';

const HOST_NAMES: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket'
};

const HOST_LABELS: Record<string, string> = {
  github: 'GitHub Actions',
  gitlab: 'GitLab CI/CD',
  bitbucket: 'Bitbucket Pipelines'
};

/**
 * Deploying on every push, instead of from here.
 *
 * A row of the next steps after the first deploy. Offered only when the repository's remote says which host would run
 * it — a GitHub Actions workflow in a GitLab project is litter. The file is written; the credentials it needs are
 * listed and left to the user, because a tool that quietly creates deployment credentials is one nobody can audit.
 */
export function PipelineCard({
  state,
  onWrite,
  isBusy,
  stage,
  region
}: {
  state: WizardState;
  onWrite: (stage: string, region: string) => void;
  isBusy: boolean;
  stage: string;
  region: string;
}) {
  const host = state.gitHost;
  const written = state.pipeline;

  if (host === undefined && written === undefined) return null;

  if (written !== undefined) {
    return (
      <Row
        description={
          <>
            Written to <span className="wizard-code">{written.filename}</span>. Commit it, and add{' '}
            {written.requiredSecrets.length === 1 ? 'this secret' : 'these secrets'} in{' '}
            {HOST_LABELS[written.host] ?? written.host}.
          </>
        }
        icon={<BiGitBranch size={17} />}
        title={
          <span className="inline-flex items-center gap-2">
            Deploy on every push
            <span className="w-saved">
              <BiCheck aria-hidden size={16} /> Added
            </span>
          </span>
        }
      >
        {written.existingPath !== undefined && (
          <Alert tone="info" title="You already had a pipeline">
            <span className="wizard-code">{written.existingPath}</span> was left as it is. Merge the two yourself, or
            delete the one you do not want.
          </Alert>
        )}
        <ul className="w-well m-0 flex list-none flex-col gap-3 px-4 py-3">
          {written.requiredSecrets.map((secret) => (
            <li key={secret.name}>
              <span className="wizard-code">{secret.name}</span>
              <span className="w-quiet mt-1 block">{secret.description}</span>
            </li>
          ))}
        </ul>
        <p className="w-quiet">
          {written.authSummary} It deploys <span className="wizard-code">{stage}</span> on every push to the default
          branch.
        </p>
      </Row>
    );
  }

  return (
    <Row
      action={
        <Button isLoading={isBusy} onClick={() => onWrite(stage, region)} variant="secondary">
          Add a {HOST_LABELS[host!] ?? host} pipeline
        </Button>
      }
      description={
        <>
          This project pushes to {HOST_NAMES[host!] ?? host}. Deploy <span className="wizard-code">{stage}</span> when
          the default branch changes.
        </>
      }
      icon={<BiGitBranch size={17} />}
      title="Deploy on every push"
    />
  );
}
