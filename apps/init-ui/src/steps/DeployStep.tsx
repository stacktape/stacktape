import { useMemo, useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { buildDeployModel, extractUrls, type DeployEvent } from '../deploy-model';
import { CopyableCommand } from '../components/CopyableCommand';
import { DeployProgress } from '../components/DeployProgress';
import { PipelineCard } from '../components/PipelineCard';
import { RegionPicker } from '../components/RegionPicker';
import type { WizardState } from '../session';

/**
 * The last step: put it on AWS.
 *
 * Three things have to be true before the button appears, and each is shown rather than assumed:
 * the configuration is on disk, this machine has AWS credentials, and the user knows which account
 * those credentials belong to. The third is the one tools usually skip, and it is the one that
 * turns "it deployed" into "it deployed *where*".
 */
export function DeployStep({
  state,
  onDeploy,
  onPipeline,
  isBusy
}: {
  state: WizardState;
  onDeploy: (stage: string, region: string) => void;
  onPipeline: (stage: string, region: string) => void;
  /** Which action is in flight, so only the button that was pressed shows a spinner. */
  isBusy: 'deploy' | 'pipeline' | undefined;
}) {
  const file = state.configFile;
  const identity = state.awsIdentity;
  const deployment = state.deployment;
  const [stage, setStage] = useState('dev');
  const [region, setRegion] = useState(
    identity !== undefined && identity.available && identity.region !== undefined ? identity.region : 'eu-west-1'
  );

  const model = useMemo(
    () =>
      deployment === undefined
        ? undefined
        : buildDeployModel(deployment.events as DeployEvent[], deployment.lines, deployment.status !== 'running'),
    [deployment]
  );

  if (file === undefined) {
    return (
      <p className="m-0 text-[var(--stp-text-muted)]">
        Write the configuration on the previous step, and this is where it goes to AWS.
      </p>
    );
  }

  if (deployment !== undefined && model !== undefined) {
    return (
      <div className="flex flex-col gap-5">
        <DeployProgress
          commandLine={deployment.commandLine}
          model={model}
          outcome={deployment.outcome}
          status={deployment.status}
          urls={deployment.status === 'succeeded' ? extractUrls(model.log) : []}
          {...(deployment.repairs === undefined ? {} : { repairs: deployment.repairs })}
        />
        {deployment.status === 'failed' && (
          <div className="flex items-center gap-4">
            <Button
              isLoading={isBusy === 'deploy'}
              onClick={() => onDeploy(deployment.stage, deployment.region)}
              variant="primary"
            >
              Try again
            </Button>
            <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">
              Same stage, same region. Fix whatever it reported first if it will just happen again.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="wizard-section-heading">Written</h3>
        <p className="m-0 text-[var(--stp-text-muted)]">
          <span className="wizard-code text-[var(--stp-text-primary)]">{file.path}</span>
        </p>
        {file.existingPath !== undefined && (
          <p className="mt-2 mb-0 text-[0.9rem] text-[var(--stp-text-subtle)]">
            Your existing <span className="wizard-code">{file.existingPath}</span> was not touched.
          </p>
        )}
      </section>

      <section>
        <h3 className="wizard-section-heading">Where this goes</h3>
        {identity === undefined ? (
          <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
            <Spinner />
            <span>Checking the AWS credentials on this machine…</span>
          </div>
        ) : identity.available ? (
          <>
            <dl className="wizard-facts">
              <div>
                <dt>AWS account</dt>
                <dd className="wizard-code">{identity.accountId}</dd>
              </div>
              <div>
                <dt>Signed in as</dt>
                <dd className="wizard-code">{identity.arn}</dd>
              </div>
            </dl>
            {state.stacktapeAccount?.signedIn === false && (
              <Alert className="mt-4" tone="warning" title="One more sign-in before deploying">
                Deploying goes through Stacktape, and this machine is not signed in to it. Run{' '}
                <span className="wizard-code">stacktape login</span> in a terminal, then come back and press Deploy —
                the file you just saved is unaffected either way.
              </Alert>
            )}
            <div className="mt-5 flex flex-wrap items-end gap-5">
              <RegionPicker onChange={setRegion} value={region} />
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.85rem] font-medium">Stage</span>
                <input
                  className="wizard-input"
                  maxLength={12}
                  onChange={(changed) => setStage(changed.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  value={stage}
                />
                <span className="text-[0.78rem] text-[var(--stp-text-subtle)]">
                  One environment. `dev` is a throwaway you can delete.
                </span>
              </label>
            </div>
          </>
        ) : (
          <Alert
            tone={identity.reason === 'no-credentials' ? 'info' : 'warning'}
            title={
              identity.reason === 'no-credentials'
                ? 'This machine has no AWS credentials yet'
                : 'AWS did not accept the credentials on this machine'
            }
          >
            {identity.reason === 'no-credentials' ? (
              <>
                Stacktape deploys with your own AWS account. Run <span className="wizard-code">aws configure</span> — or{' '}
                <span className="wizard-code">aws sso login</span> if your company uses single sign-on — then reload
                this page. Everything you have answered so far is kept.
              </>
            ) : (
              <>
                {identity.detail} Check the profile you are signed in with, then reload this page — the wizard keeps
                everything you have answered.
              </>
            )}
          </Alert>
        )}
      </section>

      {identity?.available === true && (
        <section>
          <h3 className="wizard-section-heading">Deploy</h3>
          <p className="wizard-lede mb-4">
            This creates real infrastructure in account {identity.accountId} and it costs real money. Everything it
            makes belongs to you and lives in your account, and{' '}
            <span className="wizard-code">stacktape delete --stage {stage || 'dev'}</span> removes all of it.
          </p>
          <div className="flex items-center gap-4">
            <Button
              disabled={stage === ''}
              isLoading={isBusy === 'deploy'}
              onClick={() => onDeploy(stage, region)}
              variant="primary"
            >
              Deploy to AWS
            </Button>
            <span className="text-[0.9rem] text-[var(--stp-text-subtle)]">Usually a few minutes.</span>
          </div>
        </section>
      )}

      <PipelineCard
        isBusy={isBusy === 'pipeline'}
        onWrite={onPipeline}
        region={region}
        stage={stage || 'dev'}
        state={state}
      />

      <section>
        <h3 className="wizard-section-heading">Or run it yourself</h3>
        <CopyableCommand
          command={`stacktape deploy --configPath ${file.filename} --stage ${stage || 'dev'} --region ${region}`}
        />
      </section>
    </div>
  );
}
