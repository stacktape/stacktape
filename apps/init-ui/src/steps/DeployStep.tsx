import { requiredSecrets } from '@stacktape/config-inference/compose/required-secrets';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { useEffect, useRef, useState } from 'react';
import { BiArrowBack, BiLinkExternal } from 'react-icons/bi';
import { CopyableCommand } from '../components/CopyableCommand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { RegionPicker } from '../components/RegionPicker';
import { StatusIcon, type CheckStatus } from '../components/StatusIcon';
import { resourcesOf } from '../config-resources';
import { secretCommand, stackCommand } from '../deploy-commands';
import { gapsToList } from '../gaps';
import type { WizardState } from '../session';
import { blockedTargetCopy, stackStatusWords } from '../target-copy';
import { PriceSummary } from './ReviewStep';

type Expectation = { kind: 'check' | 'create' } | { kind: 'update'; stackId: string };

/** Container services, the only ones the local try-out can start. */
const CONTAINER_TYPES = new Set(['web-service', 'worker-service', 'private-service', 'multi-container-workload']);

/** "app depends on Drizzle Kit, but nothing we found runs "npx drizzle-kit migrate". …" → the service and command. */
export const runnableMigration = (gap: {
  subject: string;
  message: string;
}): { service: string; command: string } | undefined => {
  const service = /^(.+)\.migrations$/.exec(gap.subject)?.[1];
  const command = /depends on .+, but nothing we found runs "([^"]+)"/.exec(gap.message)?.[1];
  return service === undefined || command === undefined ? undefined : { service, command };
};

/**
 * The Deploy step: a readiness list that is honest about what is missing, then one button.
 *
 * Each row is something the deploy needs, resolved in place where the page can: the AWS account (with keys pasted
 * here if the machine has none), the secrets the app reads (set here, stored in the user's own AWS account), the
 * database migration (one click when the command is known). The read-only target check runs by itself. The button
 * says where it deploys and roughly how long it takes, and stays off until the list is green.
 */
export function DeployStep({
  state,
  busy,
  isLocked,
  stage,
  onStageChange,
  onBack,
  onCheckTarget,
  onDeploy,
  onSecret,
  onConfirmSecrets,
  onAwsKeys,
  onRecheck,
  onDecision,
  onRegion,
  onVerify,
  onDismissVerification
}: {
  state: WizardState;
  busy: string | undefined;
  isLocked: boolean;
  stage: string;
  onStageChange: (stage: string) => void;
  onBack: () => void;
  onCheckTarget: (stage: string, region: string) => Promise<void>;
  onDeploy: (stage: string, region: string, expected: Expectation) => void;
  onSecret: (name: string, value: string) => Promise<boolean>;
  onConfirmSecrets: () => void;
  onAwsKeys: (accessKeyId: string, secretAccessKey: string) => void;
  onRecheck: () => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onVerify: () => void;
  onDismissVerification: () => void;
}) {
  const file = state.configFile;
  const identity = state.awsIdentity;
  const region = file?.region ?? state.region ?? 'eu-west-1';
  const resources = resourcesOf(state);
  const resourceCount = Object.keys(resources).length;
  const hasDatabase = Object.values(resources).some((resource) => resource.type === 'relational-database');
  const target =
    state.deployTarget?.stage === stage && state.deployTarget.region === region ? state.deployTarget : undefined;
  const [checking, setChecking] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(false);

  // The read-only target check runs by itself once there is a file and an AWS identity, and again after the stage
  // changes (after a pause, so typing a stage name does not fire a check per letter).
  const checkedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (file === undefined || identity?.available !== true || stage === '' || isLocked) return;
    const key = `${file.path}|${stage}|${region}|${identity.accountId}`;
    if (target !== undefined && checkedFor.current === key) return;
    if (target !== undefined) {
      checkedFor.current = key;
      return;
    }
    const timer = setTimeout(() => {
      checkedFor.current = key;
      setChecking(true);
      void onCheckTarget(stage, region).finally(() => setChecking(false));
    }, 450);
    return () => clearTimeout(timer);
  }, [file, identity, stage, region, target, isLocked, onCheckTarget]);

  const secretNames = requiredSecrets(resources);
  const secretsAvailable = state.secrets !== undefined;
  const secretsSet = new Set(state.secrets?.set ?? []);
  const secretsDone =
    secretNames.length === 0 || state.secrets?.confirmed === true || secretNames.every((name) => secretsSet.has(name));

  const gaps = gapsToList(state.composition?.gaps ?? [], state.facts?.existingDeployments ?? []);
  const migration = gaps.map(runnableMigration).find((entry) => entry !== undefined);
  const migrationDecision = (state.facts?.decisions ?? []).find(
    (decision) => decision.kind === 'migration-timing-unknown'
  );
  const otherGaps = gaps.filter((gap) => runnableMigration(gap) === undefined);
  const unsetNames = [...new Set((state.composition?.unsetSettings ?? []).map((setting) => setting.variableName))];

  const verification = state.verification;
  const canTryOut =
    Object.values(resources).some((resource) => CONTAINER_TYPES.has(resource.type)) &&
    verification?.status !== 'unavailable';
  const verificationBlocks =
    verification?.status === 'running' ||
    verification?.status === 'repairing' ||
    (verification?.status === 'completed' && (verification.services ?? []).some((entry) => entry.status === 'failed'));

  const awsStatus: CheckStatus =
    identity === undefined || checking || state.awsKeys?.status === 'saving'
      ? 'busy'
      : !identity.available
        ? 'todo'
        : target === undefined
          ? 'busy'
          : target.status === 'blocked' || target.status === 'unverified'
            ? 'error'
            : 'ok';

  const blockers = [
    ...(file === undefined ? ['saving the file'] : []),
    ...(identity?.available !== true ? ['an AWS account'] : []),
    ...(identity?.available === true && awsStatus !== 'ok' ? ['the stack check'] : []),
    ...(secretsDone ? [] : ['the secrets']),
    ...(verificationBlocks ? ['the local try-out'] : []),
    ...(state.composition?.deployable === true ? [] : ['a gap in the configuration']),
    ...(stage === '' ? ['a stage name'] : [])
  ];
  const ready = blockers.length === 0;
  const expectation: Expectation =
    target?.status === 'absent'
      ? { kind: 'create' }
      : target?.status === 'updateable'
        ? { kind: 'update', stackId: target.stackId }
        : { kind: 'check' };
  const estimate = target?.status === 'updateable' ? 'usually a few minutes' : hasDatabase ? '10–15 min' : '3–6 min';
  const commandTarget = {
    configPath: file?.filename ?? 'stacktape.yml',
    projectName: state.projectName,
    stage: stage || 'dev',
    region,
    awsAccount: state.awsAccount
  };

  return (
    <div className="w-enter">
      <header className="w-hero">
        <button className="w-textbutton mb-4" onClick={onBack} type="button">
          <BiArrowBack size={14} /> Back to review
        </button>
        <p className="w-eyebrow">Deploy</p>
        <h1 className="w-title">{ready ? `Ready to deploy to ${stage}` : 'Before you deploy'}</h1>
        <p className="w-lede">
          {ready
            ? 'The checks below passed. Pressing Deploy creates the resources in your AWS account.'
            : 'A few things the deploy needs. Each can be done right here.'}
        </p>
        {file !== undefined && (
          <p className="w-receipt">
            <span className="w-receipt-item">
              Saved <span className="w-code">{file.filename}</span>
              {file.existingPath === undefined ? '' : `, beside your ${file.existingPath.split(/[\\/]/).at(-1)}`}
            </span>
          </p>
        )}
      </header>

      <div className="w-deploy">
        <section aria-label="Readiness" className="w-card">
          <ul className="w-checks">
            <li className="w-check">
              <StatusIcon status={awsStatus} />
              <div className="min-w-0">
                <div className="w-check-head">
                  <h2 className="w-check-title">
                    {identity?.available === false ? 'Connect an AWS account' : 'AWS account'}
                  </h2>
                </div>
                {identity === undefined && <p className="w-check-meta">Checking the credentials on this machine…</p>}
                {identity?.available === false && (
                  <AwsConnect
                    identity={identity}
                    onAwsKeys={onAwsKeys}
                    onRecheck={onRecheck}
                    state={state}
                    busy={busy}
                  />
                )}
                {identity?.available === true && (
                  <>
                    <div className="w-target">
                      <span className="w-pill" title={identity.arn}>
                        Account <strong>{identity.accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</strong>
                      </span>
                      <span className="w-pill" title={identity.arn}>
                        as{' '}
                        <strong>
                          {identity.arn
                            .split(':')
                            .at(-1)
                            ?.replace(/^(user|assumed-role)\//, '')}
                        </strong>
                      </span>
                      {editingRegion && file?.region === undefined ? null : (
                        <button
                          className="w-pill"
                          disabled={isLocked || state.configEdit !== undefined}
                          onClick={() => setEditingRegion(true)}
                          title={
                            state.configEdit !== undefined
                              ? 'Your edited file declares the region. Change it there.'
                              : 'Change the region'
                          }
                          type="button"
                        >
                          Region <strong>{region}</strong>
                        </button>
                      )}
                      <label className="w-pill">
                        Stage
                        <input
                          aria-label="Stage"
                          maxLength={12}
                          onChange={(event) =>
                            onStageChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                          }
                          value={stage}
                        />
                      </label>
                    </div>
                    {editingRegion && (
                      <div className="mt-3 flex max-w-[360px] flex-col gap-2">
                        <RegionPicker
                          onChange={(next) => {
                            setEditingRegion(false);
                            onRegion(next);
                          }}
                          value={region}
                        />
                        <p className="w-setting-help">The file is saved again with the new region.</p>
                      </div>
                    )}
                    <TargetLine
                      checking={checking}
                      commandTarget={commandTarget}
                      onRecheck={onRecheck}
                      target={target}
                    />
                  </>
                )}
              </div>
            </li>

            {secretNames.length > 0 && (
              <li className="w-check">
                <StatusIcon status={secretsDone ? 'ok' : 'todo'} />
                <div className="min-w-0">
                  <div className="w-check-head">
                    <h2 className="w-check-title">
                      {secretNames.length === 1
                        ? 'One secret your app reads'
                        : `${secretNames.length} secrets your app reads`}
                    </h2>
                    {!secretsDone && secretsAvailable && (
                      <button className="w-link w-textbutton" onClick={onConfirmSecrets} type="button">
                        I already saved these in AWS
                      </button>
                    )}
                  </div>
                  <p className="w-check-meta">
                    {secretsAvailable && identity?.available !== true
                      ? 'Connect an AWS account first: secrets are saved there.'
                      : secretsAvailable
                        ? `Your app reads each as an environment variable. Saved in AWS Secrets Manager in your account (${region}); values go from this page to the CLI on this machine, never to Stacktape.`
                        : `Create them in ${region} from a terminal; each command asks for the value.`}
                  </p>
                  <div className="w-check-body">
                    {secretsAvailable ? (
                      secretNames.map((name) => (
                        <SecretRow
                          isDisabled={identity?.available !== true}
                          failure={state.secrets?.failure?.name === name ? state.secrets.failure.detail : undefined}
                          isSet={secretsSet.has(name)}
                          key={name}
                          name={name}
                          onSave={(value) => onSecret(name, value)}
                        />
                      ))
                    ) : (
                      <CopyableCommand
                        command={secretNames.map((name) => secretCommand(name, region, state.awsAccount)).join('\n')}
                      />
                    )}
                  </div>
                </div>
              </li>
            )}

            {(migration !== undefined || migrationDecision !== undefined) && (
              <li className="w-check">
                <StatusIcon
                  status={migrationDecision?.chosen === 'deploy-hook' ? 'ok' : migration !== undefined ? 'warn' : 'ok'}
                />
                <div className="min-w-0">
                  <div className="w-check-head">
                    <h2 className="w-check-title">Database tables</h2>
                    {migrationDecision?.chosen === 'deploy-hook' &&
                      migrationDecision.id.startsWith('migration-timing:') && (
                        <button
                          className="w-textbutton"
                          disabled={isLocked || busy !== undefined}
                          onClick={() => onDecision(migrationDecision.id, 'manual')}
                          type="button"
                        >
                          Undo
                        </button>
                      )}
                  </div>
                  {migrationDecision?.chosen === 'deploy-hook' ? (
                    <p className="w-check-meta">
                      <span className="w-code">{String(migrationDecision.parameters.command ?? 'The migration')}</span>{' '}
                      runs after each deploy, so the database has its tables before traffic arrives.
                    </p>
                  ) : migration !== undefined ? (
                    <>
                      <p className="w-check-meta">
                        Your app uses migrations, but nothing runs <span className="w-code">{migration.command}</span>.
                        Without it the new database starts empty.
                      </p>
                      <div className="w-check-body">
                        <div>
                          <Button
                            disabled={isLocked || state.configEdit !== undefined}
                            isLoading={busy === `migration-timing:${migration.service}`}
                            onClick={() => onDecision(`migration-timing:${migration.service}`, 'deploy-hook')}
                            variant="secondary"
                          >
                            Run it after each deploy
                          </Button>
                        </div>
                        {state.configEdit !== undefined && (
                          <p className="w-setting-help">Your file is edited by hand: add the hook there instead.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="w-check-meta">
                      {String(migrationDecision?.parameters.command ?? 'The migration')} runs{' '}
                      {migrationDecision?.chosen === 'service-startup'
                        ? 'when the app starts'
                        : 'when you run it yourself'}
                      .
                    </p>
                  )}
                </div>
              </li>
            )}

            {(otherGaps.length > 0 || unsetNames.length > 0) && (
              <li className="w-check">
                <StatusIcon status="warn" />
                <div className="min-w-0">
                  <h2 className="w-check-title">Worth a look</h2>
                  <ul className="w-detail-list mt-2">
                    {otherGaps.map((gap) => (
                      <li key={gap.subject}>
                        <span>{gap.message}</span>
                      </li>
                    ))}
                    {unsetNames.length > 0 && (
                      <li>
                        <span>
                          Your code reads{' '}
                          {unsetNames.map((name, index) => (
                            <span key={name}>
                              {index > 0 && ', '}
                              <span className="w-code">{name}</span>
                            </span>
                          ))}{' '}
                          and nothing sets {unsetNames.length === 1 ? 'it' : 'them'}. If the app needs{' '}
                          {unsetNames.length === 1 ? 'it' : 'one'} to start, add it under{' '}
                          <span className="w-code">environment</span> in the file.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </li>
            )}

            {canTryOut && (
              <TryOut
                busy={busy}
                onDismiss={onDismissVerification}
                onVerify={onVerify}
                verification={verification}
                verificationBlocks={verificationBlocks}
              />
            )}
          </ul>
        </section>

        <aside className="w-side">
          <section aria-label="Deploy" className="w-card w-summary-card">
            <PriceSummary state={state} />
            <ul className="w-summary-rows">
              <li>
                Creates <strong>{resourceCount === 1 ? '1 resource' : `${resourceCount} resources`}</strong>
              </li>
              <li>
                Where <strong>{region}</strong>
              </li>
              <li>
                Takes <strong>{estimate}</strong>
              </li>
            </ul>
            <div className="w-deploy-cta">
              <Button
                className="w-big"
                disabled={!ready || isLocked || (busy !== undefined && busy !== 'deploy')}
                isLoading={busy === 'deploy'}
                onClick={() => onDeploy(stage, region, expectation)}
                variant="primary"
              >
                Deploy to {stage || 'dev'}
              </Button>
              <p className="w-blocker">
                {ready
                  ? 'Creates real resources in your AWS account, billed by AWS from now on.'
                  : `Still needed: ${blockers.join(', ')}.`}
              </p>
            </div>
          </section>
          <div>
            <button
              aria-expanded={showTerminal}
              className="w-textbutton"
              onClick={() => setShowTerminal(!showTerminal)}
              type="button"
            >
              {showTerminal ? 'Hide the terminal command' : 'Prefer the terminal?'}
            </button>
            {showTerminal && (
              <div className="mt-3">
                <CopyableCommand command={stackCommand('deploy', commandTarget)} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TargetLine({
  target,
  checking,
  commandTarget,
  onRecheck
}: {
  target: WizardState['deployTarget'];
  checking: boolean;
  commandTarget: Parameters<typeof stackCommand>[1];
  onRecheck: () => void;
}) {
  if (checking || target === undefined) {
    return (
      <p className="w-check-meta mt-3 flex items-center gap-2">
        <Spinner /> Checking the stack, read-only…
      </p>
    );
  }
  if (target.status === 'absent') {
    return (
      <p className="w-check-meta mt-3">
        A new stack, <span className="w-code">{target.stackName}</span>, will be created. Nothing is there yet.
      </p>
    );
  }
  if (target.status === 'updateable') {
    return (
      <p className="w-check-meta mt-3">
        Updates <span className="w-code">{target.stackName}</span>, which exists and{' '}
        {stackStatusWords(target.stackStatus)}. Anything in it that the file no longer has is removed.
      </p>
    );
  }
  if (target.status === 'unverified') {
    return (
      <div className="w-check-body">
        <p className="m-0 text-[13px] text-[var(--w-error)]">{target.detail}</p>
        <div>
          <Button onClick={onRecheck} variant="secondary">
            Check again
          </Button>
        </div>
      </div>
    );
  }
  const copy = blockedTargetCopy(target);
  return (
    <div className="w-check-body">
      <p className="m-0 font-semibold">{copy.title}</p>
      <p className="m-0 text-[13px] text-[var(--w-muted)]">{copy.body}</p>
      {copy.fix !== undefined && (
        <CopyableCommand command={stackCommand(copy.fix === 'delete' ? 'delete' : 'stack recover', commandTarget)} />
      )}
      <div>
        <Button onClick={onRecheck} variant="secondary">
          Check again
        </Button>
      </div>
    </div>
  );
}

function SecretRow({
  name,
  isSet,
  isDisabled,
  failure,
  onSave
}: {
  isDisabled: boolean;
  name: string;
  isSet: boolean;
  failure: string | undefined;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!isSet);
  const save = async () => {
    if (value === '') return;
    setSaving(true);
    const ok = await onSave(value);
    setSaving(false);
    if (ok) {
      setValue('');
      setEditing(false);
    }
  };
  return (
    <div>
      <form
        className="w-secret"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <span className="w-secret-name" title={`Read by your app as ${name.toUpperCase()}`}>
          {name}
        </span>
        {isSet && !editing ? (
          <>
            <span className="w-saved">✓ Saved in your AWS account</span>
            <button className="w-textbutton justify-self-end" onClick={() => setEditing(true)} type="button">
              Replace
            </button>
          </>
        ) : (
          <>
            <input
              aria-label={`Value for ${name}`}
              autoComplete="off"
              className="w-input"
              disabled={isDisabled}
              onChange={(event) => setValue(event.target.value)}
              placeholder={`${name.toUpperCase()} in your app`}
              spellCheck={false}
              type="password"
              value={value}
            />
            <Button disabled={value === ''} isLoading={saving} type="submit" variant="secondary">
              Save
            </Button>
          </>
        )}
      </form>
      {failure !== undefined && <p className="mt-2 mb-0 text-[12.5px] text-[var(--w-error)]">{failure}</p>}
    </div>
  );
}

/** No working AWS credentials: the three situations people are in, each with its own way forward. */
function AwsConnect({
  state,
  identity,
  busy,
  onAwsKeys,
  onRecheck
}: {
  state: WizardState;
  identity: Extract<NonNullable<WizardState['awsIdentity']>, { available: false }>;
  busy: string | undefined;
  onAwsKeys: (accessKeyId: string, secretAccessKey: string) => void;
  onRecheck: () => void;
}) {
  const [path, setPath] = useState<'keys' | 'sso' | 'none' | undefined>(undefined);
  const [keyId, setKeyId] = useState('');
  const [secret, setSecret] = useState('');
  const explained = identity.reason === 'rejected' ? explainFailure(identity.detail) : [];
  return (
    <div className="w-check-body">
      <p className="w-check-meta">
        {identity.reason === 'no-credentials' ? (
          'This machine has no AWS credentials yet. Pick what fits you; everything on this page is kept.'
        ) : explained.length > 0 ? (
          <FailureExplanationText explanations={explained} />
        ) : (
          `AWS did not accept the credentials on this machine${identity.profile === undefined ? '' : ` (profile ${identity.profile})`}: ${identity.detail}`
        )}
      </p>
      <fieldset aria-label="How you sign in to AWS" className="w-choice-tabs">
        <button aria-pressed={path === 'sso'} onClick={() => setPath('sso')} type="button">
          My company uses AWS SSO
        </button>
        <button aria-pressed={path === 'keys'} onClick={() => setPath('keys')} type="button">
          I have access keys
        </button>
        <button aria-pressed={path === 'none'} onClick={() => setPath('none')} type="button">
          I don't have an AWS account
        </button>
      </fieldset>
      {path === 'keys' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onAwsKeys(keyId.trim(), secret.trim());
          }}
        >
          <p className="w-setting-help">
            Keys of an IAM user that may create resources (for a personal account, one with AdministratorAccess). In the
            AWS console: IAM → Users → your user → Security credentials → Create access key.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Access key ID"
              autoComplete="off"
              className="w-input"
              onChange={(event) => setKeyId(event.target.value)}
              placeholder="Access key ID (AKIA…)"
              spellCheck={false}
              value={keyId}
            />
            <input
              aria-label="Secret access key"
              autoComplete="off"
              className="w-input"
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Secret access key"
              spellCheck={false}
              type="password"
              value={secret}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={keyId === '' || secret === ''}
              isLoading={busy === 'aws-keys' || state.awsKeys?.status === 'saving'}
              type="submit"
              variant="primary"
            >
              Save on this machine
            </Button>
            <span className="w-setting-help">
              Saved to <span className="w-code">~/.aws/credentials</span> as{' '}
              {identity.profile === undefined ? 'the default profile' : `profile ${identity.profile}`}, as{' '}
              <span className="w-code">stacktape aws-profile:create</span> does. Never sent to Stacktape.
            </span>
          </div>
          {state.awsKeys?.status === 'failed' && (
            <p className="m-0 text-[12.5px] text-[var(--w-error)]">{state.awsKeys.detail}</p>
          )}
          {state.awsKeys?.status === 'saved' && identity.reason === 'rejected' && (
            <p className="m-0 text-[12.5px] text-[var(--w-error)]">
              Saved, but AWS did not accept these keys. Check they are active in the IAM console.
            </p>
          )}
        </form>
      )}
      {path === 'sso' && (
        <ol className="w-steps-list">
          <li>
            <div className="flex w-full flex-col gap-2">
              Set up the profile once (it asks for your SSO start URL):
              <CopyableCommand command="aws configure sso" />
            </div>
          </li>
          <li>
            <div className="flex w-full flex-col gap-2">
              Sign in. Do this again when the session expires:
              <CopyableCommand command="aws sso login" />
            </div>
          </li>
          <li>
            <div className="flex flex-wrap items-center gap-3">
              Then check again. If you named the profile, start init with{' '}
              <span className="w-code">AWS_PROFILE=name</span>.
              <Button isLoading={busy === 'recheck'} onClick={onRecheck} variant="secondary">
                Check again
              </Button>
            </div>
          </li>
        </ol>
      )}
      {path === 'none' && (
        <ol className="w-steps-list">
          <li>
            <span>
              Create an AWS account. It needs a card; nothing is charged until you deploy.{' '}
              <a
                className="w-link inline-flex items-center gap-1"
                href="https://portal.aws.amazon.com/billing/signup"
                rel="noreferrer"
                target="_blank"
              >
                Create an AWS account <BiLinkExternal size={12} />
              </a>
            </span>
          </li>
          <li>
            <span>
              In the AWS console, create access keys for your user.{' '}
              <a
                className="w-link inline-flex items-center gap-1"
                href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                rel="noreferrer"
                target="_blank"
              >
                How <BiLinkExternal size={12} />
              </a>
            </span>
          </li>
          <li>
            <span>
              Paste them under{' '}
              <button className="w-link w-textbutton" onClick={() => setPath('keys')} type="button">
                I have access keys
              </button>
              .
            </span>
          </li>
        </ol>
      )}
    </div>
  );
}

function TryOut({
  verification,
  verificationBlocks,
  busy,
  onVerify,
  onDismiss
}: {
  verification: WizardState['verification'];
  verificationBlocks: boolean;
  busy: string | undefined;
  onVerify: () => void;
  onDismiss: () => void;
}) {
  const services = verification?.services ?? [];
  const failed = services.filter((entry) => entry.status === 'failed');
  const status: CheckStatus =
    verification === undefined || verification.status === 'dismissed'
      ? 'idle'
      : verification.status === 'running' || verification.status === 'repairing'
        ? 'busy'
        : failed.length > 0
          ? 'error'
          : 'ok';
  return (
    <li className="w-check">
      <StatusIcon status={status} />
      <div className="min-w-0">
        <div className="w-check-head">
          <h2 className="w-check-title">Try it on this machine first</h2>
          <span className="w-subtle w-small">Optional</span>
        </div>
        <p className="w-check-meta">
          {verification === undefined
            ? 'Builds your app in Docker and starts it offline with placeholder settings, to catch one that will not start. It runs your project’s code.'
            : verification.status === 'running'
              ? 'Building and starting your app… a first build can take a few minutes.'
              : verification.status === 'repairing'
                ? 'It did not start. Working out what we got wrong, then trying again.'
                : verification.status === 'dismissed'
                  ? 'Set aside. Deploying is enabled again.'
                  : failed.length > 0
                    ? `${failed.map((entry) => entry.serviceName).join(', ')} did not start: ${failed[0]!.reason}`
                    : 'It started and listened as expected.'}
        </p>
        {failed[0] !== undefined && failed[0].observations.missingEnvironmentVariables.length > 0 && (
          <p className="w-check-meta">
            It read <span className="w-code">{failed[0].observations.missingEnvironmentVariables.join(', ')}</span> and
            nothing sets it. Add it under <span className="w-code">environment</span> in the file, or as a secret.
          </p>
        )}
        {failed[0] !== undefined && failed[0].observations.logTail.length > 0 && (
          <pre className="w-log">{failed[0].observations.logTail.slice(-8).join('\n')}</pre>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          {(verification === undefined || verificationBlocks || verification.status === 'dismissed') &&
            verification?.status !== 'running' &&
            verification?.status !== 'repairing' && (
              <Button isLoading={busy === 'verify'} onClick={onVerify} variant="secondary">
                {verification === undefined ? 'Build and start it here' : 'Try again'}
              </Button>
            )}
          {verificationBlocks && verification?.status === 'completed' && (
            <Button onClick={onDismiss} variant="secondary">
              Deploy anyway
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
