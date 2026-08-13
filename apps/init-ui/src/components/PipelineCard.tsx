import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import type { WizardState } from '../session';

const HOST_LABELS: Record<string, string> = {
  github: 'GitHub Actions',
  gitlab: 'GitLab CI/CD',
  bitbucket: 'Bitbucket Pipelines'
};

/**
 * Deploying on every push, instead of from here.
 *
 * Offered only when the repository's remote says which host would run it — a GitHub Actions workflow
 * in a GitLab project is litter. The file is written; the credentials it needs are listed and left to
 * the user, because a tool that quietly creates deployment credentials is one nobody can audit.
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
      <section>
        <h3 className="wizard-section-heading">Deploy on every push</h3>
        <p className="m-0 mb-3 text-[var(--stp-text-muted)]">
          Written to <span className="wizard-code text-[var(--stp-text-primary)]">{written.filename}</span>.{' '}
          {written.authSummary}
        </p>

        {written.existingPath !== undefined && (
          <Alert className="mb-3" tone="info" title="You already had a pipeline">
            <span className="wizard-code">{written.existingPath}</span> was left exactly as it is. Merge the two
            yourself, or delete whichever you do not want.
          </Alert>
        )}

        <p className="m-0 mb-2 text-[0.9rem] text-[var(--stp-text-muted)]">
          It will not run until you add {written.requiredSecrets.length === 1 ? 'this' : 'these'} on{' '}
          {HOST_LABELS[written.host] ?? written.host}:
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {written.requiredSecrets.map((secret) => (
            <li key={secret.name}>
              <span className="wizard-code text-[var(--stp-text-primary)]">{secret.name}</span>
              <span className="ml-2 text-[0.9rem] text-[var(--stp-text-subtle)]">{secret.description}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      <h3 className="wizard-section-heading">Deploy on every push</h3>
      <p className="wizard-lede mb-4">
        This project pushes to {HOST_LABELS[host!] ?? host}. We can write a pipeline that deploys{' '}
        <span className="wizard-code">{stage}</span> whenever the default branch changes. It names the credentials it
        needs and never creates any.
      </p>
      <Button isLoading={isBusy} onClick={() => onWrite(stage, region)} variant="secondary">
        Add a {HOST_LABELS[host!] ?? host} pipeline
      </Button>
    </section>
  );
}
