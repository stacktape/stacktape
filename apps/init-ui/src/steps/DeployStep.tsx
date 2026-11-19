import { requiredSecrets } from '@stacktape/config-inference/compose/required-secrets';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Switch } from '@stacktape/ui-react/switch';
import { Tabs } from '@stacktape/ui-react/tabs';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BiCheck, BiLinkExternal } from 'react-icons/bi';
import { ActionBar, BarPrice } from '../components/ActionBar';
import { CopyableCommand } from '../components/CopyableCommand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { InfoTip } from '../components/InfoTip';
import { RegionPicker } from '../components/RegionPicker';
import { StatusIcon, type CheckStatus } from '../components/StatusIcon';
import { resourcesOf } from '../config-resources';
import { secretCommand, stackCommand } from '../deploy-commands';
import { gapsToList } from '../gaps';
import type { WizardState } from '../session';
import { blockedTargetCopy, stackStatusWords } from '../target-copy';
import { splitMonthly } from './review-model';

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

/** An AWS account ID as people read it off the AWS console: "4815 1623 4200". */
const groupedAccount = (accountId: string) => accountId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');

/** The name after the last slash of an IAM ARN: the user or role this machine deploys as. */
const identityName = (arn: string) =>
  arn
    .split(':')
    .at(-1)
    ?.replace(/^(user|assumed-role)\//, '') ?? arn;

/** The bar's price: the fixed monthly amount, and what the estimate covers behind the help mark. */
export function DeployPrice({ state }: { state: WizardState }) {
  const price = state.composition?.price;
  if (price === undefined) {
    return <BarPrice amount={undefined} pending={state.composition?.priceUnavailable !== true} />;
  }
  const { amount, usage } = splitMonthly(price.monthly);
  return (
    <BarPrice
      amount={amount ?? price.monthly}
      help={
        <>
          AWS list prices in {price.region}, for what runs all month.
          {usage ? ' Traffic, requests and storage are billed on top, by use.' : ''}
        </>
      }
      suffix={amount === undefined ? undefined : `/month${usage ? ' + usage' : ''}`}
    />
  );
}

/**
 * The Deploy step: a readiness list that is honest about what is missing, then one button in the bottom bar.
 *
 * Each row is something the deploy needs, resolved in place where the page can: the AWS account (with keys pasted
 * here if the machine has none), the secrets the app reads (saved in the user's own AWS account), the database
 * migration (a switch when the command is known). The read-only target check runs by itself. The button says where it
 * deploys, and stays off until the list is done, with what is missing beside it.
 */
export function DeployStep({
  state,
  busy,
  isLocked,
  stage,
  onStageChange,
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
  const hasDatabase = Object.values(resources).some((resource) => resource.type === 'relational-database');
  const target =
    state.deployTarget?.stage === stage && state.deployTarget.region === region ? state.deployTarget : undefined;
  const [checking, setChecking] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  /** The user runs the migration some other way, and said so. */
  const [skipMigration, setSkipMigration] = useState(false);

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
        ? identity.reason === 'rejected'
          ? 'error'
          : 'todo'
        : target === undefined
          ? 'busy'
          : target.status === 'blocked' || target.status === 'unverified'
            ? 'error'
            : 'ok';

  const migrationOn = migrationDecision?.chosen === 'deploy-hook';
  const blockers = [
    ...(file === undefined ? ['saving the file'] : []),
    ...(identity?.available !== true ? ['an AWS account'] : []),
    ...(identity?.available === true && awsStatus === 'busy' ? ['the stack check'] : []),
    ...(identity?.available === true && awsStatus === 'error' ? ['a stack Stacktape can deploy to'] : []),
    ...(secretsDone ? [] : ['the secrets']),
    ...(migration !== undefined && !migrationOn && !skipMigration ? ['the database migrations'] : []),
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
  const estimate = target?.status === 'updateable' ? 'a few minutes' : hasDatabase ? '10–15 min' : '3–6 min';
  const commandTarget = {
    configPath: file?.filename ?? 'stacktape.yml',
    projectName: state.projectName,
    stage: stage || 'dev',
    region,
    awsAccount: state.awsAccount
  };
  const regionLocked = isLocked || state.configEdit !== undefined;

  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">Deploy to {stage || 'dev'}</h1>
        <p className="w-lede">
          {file === undefined ? (
            'Saving the file to your project…'
          ) : (
            <>
              <span className="w-code">{file.filename}</span> is saved in your project
              {file.existingPath === undefined ? '' : `, beside your ${file.existingPath.split(/[\\/]/).at(-1)}`}. Check
              these, then deploy.
            </>
          )}
        </p>
      </header>

      <section aria-label="Readiness" className="w-card">
        <ul className="w-checks">
          <li className="w-check">
            <StatusIcon status={awsStatus} />
            <div className="min-w-0">
              {identity?.available === false ? (
                <AwsConnect busy={busy} identity={identity} onAwsKeys={onAwsKeys} onRecheck={onRecheck} state={state} />
              ) : (
                <>
                  <div className="w-check-head">
                    <h2 className="w-check-title">AWS account</h2>
                    {identity?.available === true && (
                      <button
                        aria-expanded={editingTarget}
                        className="w-link w-small"
                        onClick={() => setEditingTarget(!editingTarget)}
                        type="button"
                      >
                        {editingTarget ? 'Done' : 'Change'}
                      </button>
                    )}
                  </div>
                  {identity === undefined ? (
                    <p className="w-check-meta">Checking the AWS credentials on this machine…</p>
                  ) : (
                    <>
                      <p className="w-account">
                        <span>
                          Account <strong>{groupedAccount(identity.accountId)}</strong>
                        </span>
                        <span>
                          as <strong>{identityName(identity.arn)}</strong>
                        </span>
                        <span aria-hidden className="w-account-dot">
                          ·
                        </span>
                        <strong>{region}</strong>
                        <span aria-hidden className="w-account-dot">
                          ·
                        </span>
                        <span>
                          stage <strong>{stage || '—'}</strong>
                        </span>
                        <InfoTip about="the AWS account">
                          The credentials on this machine
                          {identity.profile === undefined ? '' : ` (profile ${identity.profile})`} decide the account.
                          To deploy to another one, start <span className="w-code">stacktape init</span> with{' '}
                          <span className="w-code">AWS_PROFILE=name</span>.
                        </InfoTip>
                      </p>
                      {editingTarget && (
                        <div className="w-target-edit">
                          <Tooltip
                            content="Your edited file declares the region. Change it there."
                            disabled={state.configEdit === undefined}
                          >
                            <div>
                              <RegionPicker isDisabled={regionLocked} onChange={onRegion} value={region} />
                            </div>
                          </Tooltip>
                          <TextField
                            label="Stage"
                            labelDetail={
                              <InfoTip about="stages">A separate copy of the app, such as dev or production.</InfoTip>
                            }
                            maxLength={12}
                            onChange={(event) =>
                              onStageChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                            }
                            reserveMessageSpace={false}
                            spellCheck={false}
                            value={stage}
                          />
                        </div>
                      )}
                      <TargetLine
                        checking={checking}
                        commandTarget={commandTarget}
                        isRechecking={busy === 'recheck'}
                        onRecheck={onRecheck}
                        target={target}
                      />
                    </>
                  )}
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
                    <InfoTip about="secrets">
                      Your app reads each one as an environment variable. The values go from this page to the CLI on
                      this machine, and into AWS Secrets Manager in your account ({region}). Stacktape never sees them.
                    </InfoTip>
                  </h2>
                  {!secretsDone && secretsAvailable && identity?.available === true && (
                    <button className="w-link w-small" onClick={onConfirmSecrets} type="button">
                      I already saved these in AWS
                    </button>
                  )}
                </div>
                <p className="w-check-meta">
                  {secretsAvailable && identity?.available !== true
                    ? 'Connect an AWS account first. Secrets are saved there.'
                    : secretsAvailable
                      ? 'Saved in your AWS account, never sent to Stacktape.'
                      : `Create them in ${region} from a terminal. Each command asks for the value.`}
                </p>
                {(identity?.available === true || !secretsAvailable) && (
                  <div className="w-check-body">
                    {secretsAvailable ? (
                      secretNames.map((name) => (
                        <SecretRow
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
                )}
              </div>
            </li>
          )}

          {(migration !== undefined || migrationDecision !== undefined) && (
            <MigrationRow
              busy={busy}
              isHandEdited={state.configEdit !== undefined}
              isLocked={isLocked}
              migration={migration}
              migrationDecision={migrationDecision}
              onDecision={onDecision}
              onSkip={setSkipMigration}
              skipped={skipMigration}
            />
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

      <div className="w-terminal">
        <button
          aria-expanded={showTerminal}
          className="w-link w-small text-[var(--w-subtle)]"
          onClick={() => setShowTerminal(!showTerminal)}
          type="button"
        >
          {showTerminal ? 'Hide the terminal command' : 'Deploy from a terminal instead'}
        </button>
        {showTerminal && <CopyableCommand command={stackCommand('deploy', commandTarget)} />}
      </div>

      <ActionBar
        note={
          ready ? `About ${estimate}. AWS bills the resources from then on.` : `Still needed: ${blockers.join(', ')}.`
        }
        price={<DeployPrice state={state} />}
      >
        <Button
          className="w-big"
          disabled={!ready || isLocked || (busy !== undefined && busy !== 'deploy')}
          isLoading={busy === 'deploy'}
          onClick={() => onDeploy(stage, region, expectation)}
          variant="primary"
        >
          Deploy to {stage || 'dev'}
        </Button>
      </ActionBar>
    </div>
  );
}

function TargetLine({
  target,
  checking,
  commandTarget,
  isRechecking,
  onRecheck
}: {
  target: WizardState['deployTarget'];
  checking: boolean;
  commandTarget: Parameters<typeof stackCommand>[1];
  isRechecking: boolean;
  onRecheck: () => void;
}) {
  if (checking || target === undefined) {
    return (
      <p className="w-target-line">
        <Spinner /> Checking the stack, read-only…
      </p>
    );
  }
  if (target.status === 'absent') {
    return (
      <p className="w-target-line">
        Creates the stack <span className="w-code">{target.stackName}</span>. Nothing is there yet.
      </p>
    );
  }
  if (target.status === 'updateable') {
    return (
      <p className="w-target-line">
        Updates <span className="w-code">{target.stackName}</span>: {stackStatusWords(target.stackStatus)}.
        <InfoTip about="updating a stack">Anything in the stack that the file no longer has is removed.</InfoTip>
      </p>
    );
  }
  if (target.status === 'unverified') {
    return (
      <div className="w-problem">
        <p className="w-problem-text">{target.detail}</p>
        <div>
          <Button isLoading={isRechecking} onClick={onRecheck} variant="secondary">
            Check again
          </Button>
        </div>
      </div>
    );
  }
  const copy = blockedTargetCopy(target);
  return (
    <div className="w-problem">
      <div>
        <p className="w-problem-title">{copy.title}</p>
        <p className="w-problem-text">{copy.body}</p>
      </div>
      {copy.fix !== undefined && (
        <CopyableCommand command={stackCommand(copy.fix === 'delete' ? 'delete' : 'stack recover', commandTarget)} />
      )}
      <div>
        <Button isLoading={isRechecking} onClick={onRecheck} variant="secondary">
          Check again
        </Button>
      </div>
    </div>
  );
}

function SecretRow({
  name,
  isSet,
  failure,
  onSave
}: {
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
          <span className="w-secret-saved [grid-column:span_2]">
            <span className="w-saved">
              <BiCheck aria-hidden size={16} /> Saved
            </span>
            <button className="w-link w-small" onClick={() => setEditing(true)} type="button">
              Replace
            </button>
          </span>
        ) : (
          <>
            <TextField
              aria-label={`Value for ${name}`}
              autoComplete="off"
              onChange={(event) => setValue(event.target.value)}
              placeholder="Value"
              reserveMessageSpace={false}
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
      {failure !== undefined && <p className="w-error-text mt-2">{failure}</p>}
    </div>
  );
}

/** Whether the database gets its tables: a switch for the migration command the analysis found. */
function MigrationRow({
  migration,
  migrationDecision,
  skipped,
  isHandEdited,
  isLocked,
  busy,
  onDecision,
  onSkip
}: {
  migration: { service: string; command: string } | undefined;
  migrationDecision: NonNullable<WizardState['facts']>['decisions'][number] | undefined;
  skipped: boolean;
  isHandEdited: boolean;
  isLocked: boolean;
  busy: string | undefined;
  onDecision: (id: string, value: string) => void;
  onSkip: (skipped: boolean) => void;
}) {
  const isOn = migrationDecision?.chosen === 'deploy-hook';
  const command = migration?.command ?? String(migrationDecision?.parameters.command ?? 'the migration');
  // The switch writes the hook into the generated file; a hand-edited file says it itself.
  const decisionId = migration === undefined ? migrationDecision?.id : `migration-timing:${migration.service}`;
  const canSwitch = decisionId !== undefined && decisionId.startsWith('migration-timing:');
  const status: CheckStatus = isOn || skipped || migration === undefined ? 'ok' : 'todo';

  return (
    <li className="w-check">
      <StatusIcon status={status} />
      <div className="min-w-0">
        <div className="w-check-head">
          <h2 className="w-check-title">
            Database migrations
            <InfoTip about="database migrations">
              Your app creates its tables with migrations. The new database on AWS starts empty, so something has to run
              them before traffic arrives.
            </InfoTip>
          </h2>
        </div>
        {canSwitch ? (
          <>
            <Tooltip content="Your file is edited by hand. Add the hook there instead." disabled={!isHandEdited}>
              <div className="w-switch-row mt-3">
                <Switch
                  checked={isOn}
                  disabled={isLocked || isHandEdited}
                  isBusy={busy === decisionId}
                  label={`Run ${command} after each deploy`}
                  onCheckedChange={(checked) => {
                    onSkip(false);
                    onDecision(decisionId, checked ? 'deploy-hook' : 'manual');
                  }}
                />
                <span>
                  Run <span className="w-code">{command}</span> after each deploy
                </span>
              </div>
            </Tooltip>
            {!isOn && (
              <p className="w-quiet mt-2">
                {skipped ? (
                  <>
                    You run them yourself.{' '}
                    <button className="w-link" onClick={() => onSkip(false)} type="button">
                      Undo
                    </button>
                  </>
                ) : (
                  <>
                    Without it the new database has no tables.{' '}
                    <button className="w-link" onClick={() => onSkip(true)} type="button">
                      I run them myself
                    </button>
                  </>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="w-check-meta">
            <span className="w-code">{command}</span> runs{' '}
            {migrationDecision?.chosen === 'service-startup'
              ? 'when the app starts'
              : migrationDecision?.chosen === 'deploy-hook'
                ? 'after each deploy'
                : 'when you run it yourself'}
            .
          </p>
        )}
      </div>
    </li>
  );
}

type AwsPath = 'sso' | 'keys' | 'none';

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
  const expired = identity.reason === 'rejected' && /expired|ExpiredToken/i.test(identity.detail);
  const [path, setPath] = useState<AwsPath>(identity.reason === 'rejected' ? 'sso' : 'keys');
  const [keyId, setKeyId] = useState('');
  const [secret, setSecret] = useState('');
  const explained = identity.reason === 'rejected' && !expired ? explainFailure(identity.detail) : [];
  const profileFlag =
    identity.profile === undefined || identity.profile === 'default' ? '' : ` --profile ${identity.profile}`;
  const checkAgain = (
    <Button isLoading={busy === 'recheck'} onClick={onRecheck} variant="secondary">
      Check again
    </Button>
  );

  return (
    <>
      <div className="w-check-head">
        <h2 className="w-check-title">{expired ? 'Your AWS session expired' : 'Connect an AWS account'}</h2>
      </div>
      <p className="w-check-meta">
        {identity.reason === 'no-credentials' ? (
          'This machine has no AWS credentials yet.'
        ) : expired ? (
          `The AWS session on this machine${identity.profile === undefined ? '' : ` (profile ${identity.profile})`} is no longer valid.`
        ) : explained.length > 0 ? (
          <FailureExplanationText explanations={explained} />
        ) : (
          `AWS did not accept the credentials on this machine${identity.profile === undefined ? '' : ` (profile ${identity.profile})`}: ${identity.detail}`
        )}
      </p>
      <div className="w-check-body">
        <div className="w-path-tabs">
          <Tabs
            appearance="segmented"
            ariaLabel="How you sign in to AWS"
            onValueChange={(value) => setPath(value)}
            tabs={[
              { value: 'sso' as const, label: 'AWS SSO', compactLabel: 'SSO' },
              { value: 'keys' as const, label: 'Access keys', compactLabel: 'Keys' },
              { value: 'none' as const, label: 'No AWS account yet', compactLabel: 'No account' }
            ]}
            value={path}
            width="fit"
          />
        </div>

        {path === 'keys' && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onAwsKeys(keyId.trim(), secret.trim());
            }}
          >
            <div className="w-keys">
              <TextField
                autoComplete="off"
                label="Access key ID"
                onChange={(event) => setKeyId(event.target.value)}
                placeholder="AKIA…"
                reserveMessageSpace={false}
                spellCheck={false}
                value={keyId}
              />
              <TextField
                autoComplete="off"
                label="Secret access key"
                onChange={(event) => setSecret(event.target.value)}
                reserveMessageSpace={false}
                spellCheck={false}
                type="password"
                value={secret}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button
                disabled={keyId === '' || secret === ''}
                isLoading={busy === 'aws-keys' || state.awsKeys?.status === 'saving'}
                type="submit"
                variant="primary"
              >
                Save on this machine
              </Button>
              <span className="w-quiet">
                Never sent to Stacktape. Saved in <span className="w-code">~/.aws/credentials</span>
                <InfoTip about="access keys">
                  Keys of an IAM user that may create resources; for a personal account, one with AdministratorAccess.
                  In the AWS console: IAM → Users → your user → Security credentials → Create access key. They are saved
                  as {identity.profile === undefined ? 'the default profile' : `profile ${identity.profile}`}, as{' '}
                  <span className="w-code">stacktape aws-profile:create</span> does.
                </InfoTip>
              </span>
            </div>
            {state.awsKeys?.status === 'failed' && <p className="w-error-text">{state.awsKeys.detail}</p>}
            {state.awsKeys?.status === 'saved' && identity.reason === 'rejected' && (
              <p className="w-error-text">Saved, but AWS did not accept these keys. Check they are active in IAM.</p>
            )}
          </form>
        )}

        {path === 'sso' && (
          <ol className="w-steps-list">
            {!expired && (
              <Step text="Set up the profile once. It asks for your SSO start URL.">
                <CopyableCommand command="aws configure sso" />
              </Step>
            )}
            <Step text={expired ? 'Sign in to AWS again:' : 'Sign in. Do this again when the session expires.'}>
              <CopyableCommand command={`aws sso login${profileFlag}`} />
            </Step>
            <Step
              text={
                <span className="inline-flex items-center gap-1.5">
                  Then check again.
                  <InfoTip about="AWS profiles">
                    If the profile has a name, start <span className="w-code">stacktape init</span> with{' '}
                    <span className="w-code">AWS_PROFILE=name</span> so the wizard uses it.
                  </InfoTip>
                </span>
              }
            >
              <div>{checkAgain}</div>
            </Step>
          </ol>
        )}

        {path === 'none' && (
          <ol className="w-steps-list">
            <Step
              text={
                <span>
                  <a
                    className="w-link inline-flex items-center gap-1"
                    href="https://portal.aws.amazon.com/billing/signup"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Create an AWS account <BiLinkExternal aria-hidden size={12} />
                  </a>
                  . It asks for a card; nothing is charged until you deploy.
                </span>
              }
            />
            <Step
              text={
                <span>
                  Create access keys for your user.{' '}
                  <a
                    className="w-link inline-flex items-center gap-1"
                    href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                    rel="noreferrer"
                    target="_blank"
                  >
                    How <BiLinkExternal aria-hidden size={12} />
                  </a>
                </span>
              }
            />
            <Step
              text={
                <span>
                  Paste them under{' '}
                  <button className="w-link" onClick={() => setPath('keys')} type="button">
                    Access keys
                  </button>
                  .
                </span>
              }
            />
          </ol>
        )}
      </div>
    </>
  );
}

function Step({ text, children }: { text: ReactNode; children?: ReactNode }) {
  return (
    <li>
      <div className="w-step-body">
        <span>{text}</span>
        {children}
      </div>
    </li>
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
  const canStart =
    (verification === undefined || verificationBlocks || verification.status === 'dismissed') &&
    verification?.status !== 'running' &&
    verification?.status !== 'repairing';
  return (
    <li className="w-check">
      <StatusIcon status={status} />
      <div className="min-w-0">
        <div className="w-check-head">
          <h2 className="w-check-title">
            Try it on this machine first
            <InfoTip about="the local try-out">
              Builds your app in Docker and starts it offline with placeholder settings, to catch an app that will not
              start before AWS bills for it. It runs your project’s code.
            </InfoTip>
          </h2>
          {canStart ? (
            <Button isLoading={busy === 'verify'} onClick={onVerify} variant="secondary">
              {verification === undefined ? 'Build and start it' : 'Try again'}
            </Button>
          ) : (
            verification === undefined && <span className="w-check-tag">Optional</span>
          )}
        </div>
        {verification !== undefined && (
          <p className="w-check-meta">
            {verification.status === 'running'
              ? 'Building and starting your app. A first build can take a few minutes.'
              : verification.status === 'repairing'
                ? 'It did not start. Working out what we got wrong, then trying again.'
                : verification.status === 'dismissed'
                  ? 'Set aside. You can deploy.'
                  : failed.length > 0
                    ? `${failed.map((entry) => entry.serviceName).join(', ')} did not start: ${failed[0]!.reason}`
                    : 'It started and listened as expected.'}
          </p>
        )}
        {verification === undefined && <p className="w-check-meta">Optional. Catches an app that will not start.</p>}
        {failed[0] !== undefined && failed[0].observations.missingEnvironmentVariables.length > 0 && (
          <p className="w-check-meta">
            It read <span className="w-code">{failed[0].observations.missingEnvironmentVariables.join(', ')}</span> and
            nothing sets it. Add it under <span className="w-code">environment</span> in the file, or as a secret.
          </p>
        )}
        {failed[0] !== undefined && failed[0].observations.logTail.length > 0 && (
          <pre className="w-log">{failed[0].observations.logTail.slice(-8).join('\n')}</pre>
        )}
        {verificationBlocks && verification?.status === 'completed' && (
          <div className="mt-3">
            <Button onClick={onDismiss} variant="secondary">
              Deploy anyway
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
