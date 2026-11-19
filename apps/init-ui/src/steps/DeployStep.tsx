import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Button } from '@stacktape/ui-react/button';
import { RadioGroup } from '@stacktape/ui-react/radio-group';
import { Spinner } from '@stacktape/ui-react/spinner';
import { Tabs } from '@stacktape/ui-react/tabs';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { BiCheck, BiInfoCircle, BiLinkExternal } from 'react-icons/bi';
import { ActionBar, MonthlyPrice } from '../components/ActionBar';
import { CopyableCommand } from '../components/CopyableCommand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { InfoTip } from '../components/InfoTip';
import { RegionPicker } from '../components/RegionPicker';
import { StatusIcon, type CheckStatus } from '../components/StatusIcon';
import { resourcesOf } from '../config-resources';
import { secretCommand, stackCommand } from '../deploy-commands';
import { gapsToList } from '../gaps';
import { firstSentence, generateSecretValue, planSecrets, type SecretEntry, type SecretGroup } from '../secrets-model';
import type { WizardState } from '../session';
import { blockedTargetCopy, stackStatusWords } from '../target-copy';
import { plainList, splitMonthly } from './review-model';

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

/** Text from the analysis with its backticked names set as code. */
const withCode = (text: string): ReactNode =>
  text.split(/`([^`]+)`/).map((part, index) =>
    index % 2 ? (
      // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
      <span className="w-code" key={index}>
        {part}
      </span>
    ) : (
      // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
      <Fragment key={index}>{part}</Fragment>
    )
  );

type SectionId = 'aws' | 'secrets' | 'migrations';

/**
 * Where a section of the readiness list stands. Each shows one of these in words beside its title, so the list reads
 * as "what is done, what needs me, what has to wait" without opening anything.
 */
type SectionState = 'ready' | 'needs-input' | 'waiting' | 'checking' | 'blocked' | 'note';

const STATE_WORDS: Record<SectionState, string> = {
  ready: 'Ready',
  'needs-input': 'Needs input',
  waiting: 'Available after AWS is connected',
  checking: 'Checking…',
  blocked: 'Blocked',
  note: 'Worth a look'
};

const STATE_ICON: Record<SectionState, CheckStatus> = {
  ready: 'ok',
  'needs-input': 'todo',
  waiting: 'locked',
  checking: 'busy',
  blocked: 'error',
  note: 'warn'
};

/**
 * The Deploy step: a readiness list, then one button in the bottom bar.
 *
 * Each section is something the deploy needs and shows where it stands: Ready, Needs input, or Available after AWS is
 * connected. The first one that needs the user is open; a finished one folds to one line with Edit. The bar names the
 * next thing to do and goes there, and once nothing is missing it says what the click does: what it creates in which
 * account, and that AWS bills it from then on.
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
  const resourceNames = Object.keys(resources);
  const hasDatabase = Object.values(resources).some((resource) => resource.type === 'relational-database');
  const target =
    state.deployTarget?.stage === stage && state.deployTarget.region === region ? state.deployTarget : undefined;
  const [checking, setChecking] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  /** The user runs the migration some other way, and said so. */
  const [skipMigration, setSkipMigration] = useState(false);
  /** Secrets this page made up and saved, so their rows can say so. Never their values. */
  const [generated, setGenerated] = useState<ReadonlySet<string>>(new Set());

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

  const plan = planSecrets(state, resources);
  const secretsAvailable = state.secrets !== undefined;
  const secretsSet = new Set(state.secrets?.set ?? []);
  const unsaved = plan.entries.filter((entry) => !secretsSet.has(entry.name));
  const secretsDone = plan.entries.length === 0 || state.secrets?.confirmed === true || unsaved.length === 0;
  const hasSettings = plan.groups.some((group) => group.kind === 'setting');
  const secretsNoun = (count: number) => (hasSettings ? 'secrets and settings' : count === 1 ? 'secret' : 'secrets');

  const gaps = gapsToList(state.composition?.gaps ?? [], state.facts?.existingDeployments ?? []);
  const migration = gaps.map(runnableMigration).find((entry) => entry !== undefined);
  const migrationDecision = (state.facts?.decisions ?? []).find(
    (decision) => decision.kind === 'migration-timing-unknown'
  );
  const unsetNames = [...new Set((state.composition?.unsetSettings ?? []).map((setting) => setting.variableName))];
  // A migration the deploy cannot run for the user (SQLite, reachable only from inside the app) is still about
  // migrations: it is said in that section, not in the notes.
  const migrationNote =
    migration === undefined && migrationDecision === undefined
      ? gaps.find((gap) => gap.subject.endsWith('.migrations'))
      : undefined;
  const notes = [
    ...gaps
      .filter(
        (gap) =>
          runnableMigration(gap) === undefined && gap !== migrationNote && !plan.explainedGaps.includes(gap.subject)
      )
      .map((gap) => ({ key: gap.subject, text: gap.message })),
    ...(unsetNames.length === 0
      ? []
      : [
          {
            key: 'unset-settings',
            text: `Your code reads ${plainList(unsetNames.map((name) => `\`${name}\``))} and nothing sets ${unsetNames.length === 1 ? 'it' : 'them'}. If the app needs ${unsetNames.length === 1 ? 'it' : 'one'} to start, add it under \`environment\` in ${file?.filename ?? 'stacktape.yml'}.`
          }
        ])
  ];

  const verification = state.verification;
  const canTryOut =
    Object.values(resources).some((resource) => CONTAINER_TYPES.has(resource.type)) &&
    verification?.status !== 'unavailable';
  const verificationBlocks =
    verification?.status === 'running' ||
    verification?.status === 'repairing' ||
    (verification?.status === 'completed' && (verification.services ?? []).some((entry) => entry.status === 'failed'));

  const migrationOn = migrationDecision?.chosen === 'deploy-hook';
  const migrationNeeded = migration !== undefined && !migrationOn && !skipMigration;

  const awsState: SectionState =
    identity === undefined || state.awsKeys?.status === 'saving'
      ? 'checking'
      : !identity.available
        ? 'needs-input'
        : stage === ''
          ? 'needs-input'
          : checking || target === undefined
            ? 'checking'
            : target.status === 'blocked' || target.status === 'unverified'
              ? 'blocked'
              : 'ready';
  const secretsState: SectionState = secretsDone
    ? 'ready'
    : secretsAvailable && identity?.available !== true
      ? 'waiting'
      : 'needs-input';
  const migrationState: SectionState = migrationNeeded ? 'needs-input' : 'ready';

  const sections: Array<{ id: SectionId; state: SectionState }> = [
    { id: 'aws', state: awsState },
    ...(plan.entries.length > 0 ? [{ id: 'secrets' as const, state: secretsState }] : []),
    ...(migration !== undefined || migrationDecision !== undefined
      ? [{ id: 'migrations' as const, state: migrationState }]
      : [])
  ];
  const firstOpen = sections.find((section) => section.state === 'needs-input' || section.state === 'blocked')?.id;

  // A section opens by itself while it is the first that needs the user, and folds once the user has finished it. Edit
  // opens a done one, and it stays open (through a re-check, say) until Done.
  const [openChoice, setOpenChoice] = useState<Partial<Record<SectionId, boolean>>>({});
  const sectionsKey = sections.map((section) => `${section.id}:${section.state}`).join('|');
  const [seenSections, setSeenSections] = useState(sectionsKey);
  if (seenSections !== sectionsKey) {
    // Adjusted while rendering, as React recommends for state derived from a change: no extra paint with the old one.
    const before = new Map(seenSections.split('|').map((entry) => entry.split(':') as [string, string]));
    const finished = sections.filter(
      (section) =>
        section.state === 'ready' && (before.get(section.id) === 'needs-input' || before.get(section.id) === 'waiting')
    );
    setSeenSections(sectionsKey);
    if (finished.length > 0) {
      setOpenChoice((current) => {
        const next = { ...current };
        for (const section of finished) delete next[section.id];
        return next;
      });
    }
  }
  const isOpen = (id: SectionId) => openChoice[id] ?? id === firstOpen;
  const toggle = (id: SectionId) => setOpenChoice((current) => ({ ...current, [id]: !isOpen(id) }));
  const goTo = (id: SectionId) => {
    setOpenChoice((current) => ({ ...current, [id]: true }));
    requestAnimationFrame(() => {
      const element = document.getElementById(`deploy-${id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.querySelector<HTMLElement>('input:not([type="radio"]), [role="tab"], input[type="radio"]')?.focus({
        preventScroll: true
      });
    });
  };

  const notDeployable = state.composition?.deployable !== true;
  const ready =
    file !== undefined &&
    awsState === 'ready' &&
    secretsDone &&
    !migrationNeeded &&
    !verificationBlocks &&
    !notDeployable &&
    stage !== '';
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

  /** What the bar says while the button is off: the next thing, as a link to it, or what is still being checked. */
  const next: { text: string; section?: SectionId } | undefined =
    file === undefined
      ? { text: `Saving ${commandTarget.configPath}…` }
      : identity === undefined
        ? { text: 'Checking the AWS credentials on this machine…' }
        : !identity.available
          ? {
              text: identity.reason === 'rejected' ? 'sign in to AWS again' : 'connect AWS',
              section: 'aws'
            }
          : stage === ''
            ? { text: 'a stage name', section: 'aws' }
            : awsState === 'checking'
              ? { text: 'Checking the stack, read-only…' }
              : awsState === 'blocked'
                ? { text: 'a stack Stacktape can deploy to', section: 'aws' }
                : !secretsDone
                  ? {
                      text: `${state.secrets?.set.length ? `${unsaved.length} more` : unsaved.length} ${secretsNoun(unsaved.length)}`,
                      section: 'secrets'
                    }
                  : migrationNeeded
                    ? { text: 'database migrations', section: 'migrations' }
                    : verificationBlocks
                      ? { text: 'the local try-out' }
                      : notDeployable
                        ? { text: 'a gap in the configuration' }
                        : undefined;

  const price = state.composition?.price;
  const monthly = price === undefined ? undefined : splitMonthly(price.monthly);

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
              {file.existingPath === undefined ? '' : `, beside your ${file.existingPath.split(/[\\/]/).at(-1)}`}.
            </>
          )}
        </p>
        {!ready && monthly?.amount !== undefined && (
          // On a phone the bar holds only the next step while something is missing; the estimate waits here.
          <p className="w-hero-price">
            About <strong>{monthly.amount}/month</strong>
            {monthly.usage ? ' + usage' : ''} on AWS
          </p>
        )}
      </header>

      {notes.length > 0 && (
        <section aria-label="Worth a look" className="w-notes">
          <p className="w-notes-title">
            <BiInfoCircle aria-hidden size={15} />
            Worth a look before you deploy
          </p>
          <ul>
            {notes.map((note) => {
              const short = firstSentence(note.text);
              return (
                <li key={note.key}>
                  <span className="w-note-text">{withCode(short)}</span>
                  {(short.length < note.text.trim().length || short.length > 120) && (
                    <InfoTip about="this note" placement="top">
                      {withCode(note.text)}
                    </InfoTip>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Readiness" className="w-card">
        <ul className="w-checks">
          <Section
            id="aws"
            isOpen={awsState === 'needs-input' || awsState === 'blocked' || isOpen('aws')}
            onToggle={identity?.available === true && awsState === 'ready' ? () => toggle('aws') : undefined}
            state={awsState}
            summary={
              identity?.available === true ? (
                <>
                  <AccountLine identity={identity} region={region} stage={stage} />
                  <TargetLine
                    checking={checking}
                    commandTarget={commandTarget}
                    isRechecking={busy === 'recheck'}
                    onRecheck={onRecheck}
                    target={target}
                  />
                </>
              ) : identity === undefined ? (
                <p className="w-check-meta">Checking the AWS credentials on this machine…</p>
              ) : undefined
            }
            title={
              identity?.available === false
                ? identity.reason === 'no-credentials'
                  ? 'Connect AWS to deploy'
                  : /expired|ExpiredToken/i.test(identity.detail)
                    ? 'Your AWS session expired'
                    : 'AWS did not accept these credentials'
                : 'AWS account'
            }
          >
            {identity?.available === false ? (
              <AwsConnect busy={busy} identity={identity} onAwsKeys={onAwsKeys} onRecheck={onRecheck} state={state} />
            ) : identity?.available === true ? (
              <>
                <AccountLine identity={identity} region={region} stage={stage} />
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
                    onChange={(event) => onStageChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    reserveMessageSpace={false}
                    spellCheck={false}
                    value={stage}
                  />
                </div>
                <TargetLine
                  checking={checking}
                  commandTarget={commandTarget}
                  isRechecking={busy === 'recheck'}
                  onRecheck={onRecheck}
                  target={target}
                />
              </>
            ) : null}
          </Section>

          {plan.entries.length > 0 && (
            <Section
              aside={
                secretsState === 'needs-input' && secretsAvailable ? (
                  <GenerateAll
                    entries={unsaved.filter((entry) => entry.canGenerate)}
                    onSaved={(name) => setGenerated((current) => new Set([...current, name]))}
                    onSecret={onSecret}
                  />
                ) : undefined
              }
              id="secrets"
              isOpen={secretsState !== 'waiting' && isOpen('secrets')}
              onToggle={secretsState === 'waiting' ? undefined : () => toggle('secrets')}
              state={secretsState}
              summary={
                <p className="w-check-meta">
                  {secretsState === 'ready'
                    ? state.secrets?.confirmed === true && unsaved.length > 0
                      ? 'You saved them in AWS yourself.'
                      : `All ${plan.entries.length} saved in your AWS account, in ${region}.`
                    : secretsState === 'waiting'
                      ? `${plan.entries.length} ${secretsNoun(plan.entries.length)} your app reads. They are saved in your AWS account.`
                      : unsaved.length === plan.entries.length
                        ? `${plan.entries.length} ${secretsNoun(plan.entries.length)} your app reads. None saved yet.`
                        : `${plan.entries.length - unsaved.length} of ${plan.entries.length} saved.`}
                </p>
              }
              title={hasSettings ? 'Secrets and settings' : plan.entries.length === 1 ? 'Secret' : 'Secrets'}
            >
              <SecretsBody
                awsAccount={state.awsAccount}
                failure={state.secrets?.failure}
                generated={generated}
                isAvailable={secretsAvailable}
                onConfirm={onConfirmSecrets}
                onGenerated={(name) => setGenerated((current) => new Set([...current, name]))}
                onSecret={onSecret}
                plan={plan}
                region={region}
                saved={secretsSet}
                showConfirm={!secretsDone}
              />
            </Section>
          )}

          {(migration !== undefined || migrationDecision !== undefined) && (
            <MigrationSection
              busy={busy}
              isHandEdited={state.configEdit !== undefined}
              isLocked={isLocked}
              isOpen={isOpen('migrations')}
              migration={migration}
              migrationDecision={migrationDecision}
              onDecision={onDecision}
              onSkip={setSkipMigration}
              onToggle={() => toggle('migrations')}
              skipped={skipMigration}
              state={migrationState}
            />
          )}

          {migrationNote !== undefined && (
            <Section
              id="migrations"
              isOpen
              state="note"
              title={
                <>
                  Database migrations
                  <InfoTip about="database migrations">
                    Your app creates its tables with migrations. The new database starts empty, so something has to run
                    them before traffic arrives.
                  </InfoTip>
                </>
              }
            >
              <p className="w-check-meta">{withCode(migrationNote.message.replace(/"([^"]+)"/g, '`$1`'))}</p>
            </Section>
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
        className={ready ? undefined : 'is-blocked'}
        note={
          ready ? (
            <>
              <span className="w-bar-note-main">
                {target?.status === 'updateable' ? (
                  <>
                    Updates <span className="w-code">{target.stackName}</span> in your AWS account
                  </>
                ) : resourceNames.length <= 3 ? (
                  `Creates ${plainList(resourceNames)} in your AWS account`
                ) : (
                  `Creates ${resourceNames.length} resources in your AWS account`
                )}
              </span>
              <span>
                {target?.status === 'updateable' ? '' : 'AWS bills them from now on · '}about {estimate}
              </span>
            </>
          ) : next === undefined ? undefined : next.section === undefined ? (
            <span className="w-bar-next">{next.text}</span>
          ) : (
            <span className="w-bar-next">
              Next:{' '}
              <button className="w-link" onClick={() => goTo(next.section!)} type="button">
                {next.text}
              </button>
            </span>
          )
        }
        price={<MonthlyPrice state={state} />}
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

/** One section of the readiness list: its mark, its title with where it stands, then a summary or its controls. */
function Section({
  id,
  title,
  state,
  summary,
  isOpen,
  onToggle,
  aside,
  children
}: {
  id: SectionId;
  title: ReactNode;
  state: SectionState;
  /** One line for a folded section: the account, how many secrets are saved, what the migration does. */
  summary?: ReactNode;
  isOpen: boolean;
  /** Absent: the section cannot be folded or opened from here. */
  onToggle?: (() => void) | undefined;
  /** A section-wide action beside the title, such as "Generate all 2". */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className={`w-check is-${state}${isOpen ? ' is-open' : ''}`} id={`deploy-${id}`}>
      <StatusIcon status={STATE_ICON[state]} />
      <div className="min-w-0">
        <div className="w-check-head">
          <h2 className="w-check-title">
            {title}
            <span className={`w-state is-${state}`}>{STATE_WORDS[state]}</span>
          </h2>
          <span className="w-check-aside">
            {isOpen && aside}
            {onToggle !== undefined && (
              <button aria-expanded={isOpen} className="w-link w-small" onClick={onToggle} type="button">
                {isOpen ? (state === 'ready' ? 'Done' : 'Hide') : state === 'ready' ? 'Edit' : 'Show'}
              </button>
            )}
          </span>
        </div>
        {isOpen ? <div className="w-check-content">{children}</div> : summary}
      </div>
    </li>
  );
}

function AccountLine({
  identity,
  region,
  stage
}: {
  identity: Extract<NonNullable<WizardState['awsIdentity']>, { available: true }>;
  region: string;
  stage: string;
}) {
  return (
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
        {identity.profile === undefined ? '' : ` (profile ${identity.profile})`} decide the account. To deploy to
        another one, start <span className="w-code">stacktape init</span> with{' '}
        <span className="w-code">AWS_PROFILE=name</span>.
      </InfoTip>
    </p>
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

const GROUP_WORDS: Record<SecretGroup['kind'], string> = {
  secret: 'Secrets',
  outside: 'Services you run elsewhere',
  setting: 'Settings'
};

/** The secrets, grouped by the resource that reads them, each with the line that reads it. */
function SecretsBody({
  plan,
  saved,
  generated,
  failure,
  region,
  awsAccount,
  isAvailable,
  showConfirm,
  onSecret,
  onGenerated,
  onConfirm
}: {
  plan: ReturnType<typeof planSecrets>;
  saved: ReadonlySet<string>;
  generated: ReadonlySet<string>;
  failure: { name: string; detail: string } | undefined;
  region: string;
  awsAccount: string | undefined;
  isAvailable: boolean;
  showConfirm: boolean;
  onSecret: (name: string, value: string) => Promise<boolean>;
  onGenerated: (name: string) => void;
  onConfirm: () => void;
}) {
  if (!isAvailable) {
    return (
      <>
        <p className="w-check-meta">Create them in {region} from a terminal. Each command asks for the value.</p>
        <CopyableCommand
          command={plan.entries.map((entry) => secretCommand(entry.name, region, awsAccount)).join('\n')}
        />
      </>
    );
  }
  return (
    <>
      <p className="w-check-meta">
        Saved in AWS Secrets Manager in your account, never sent to Stacktape.
        <InfoTip about="secrets">
          Your app reads each one as an environment variable. The values go from this page to the CLI on this machine,
          and into AWS Secrets Manager in your account ({region}).
        </InfoTip>
      </p>
      {(plan.setByStacktape.length > 0 || plan.notNeeded.length > 0) && (
        <ul className="w-secret-counts">
          {plan.setByStacktape.length > 0 && (
            <li>
              <BiCheck aria-hidden size={15} />
              <span>
                {plan.setByStacktape.length} set by Stacktape:{' '}
                {plan.setByStacktape.map((name, index) => (
                  <Fragment key={name}>
                    {index > 0 && ', '}
                    <span className="w-code">{name}</span>
                  </Fragment>
                ))}
              </span>
              <InfoTip about="secrets Stacktape sets">
                The database password. The deploy creates it and gives it to the app.
              </InfoTip>
            </li>
          )}
          {plan.notNeeded.length > 0 && (
            <li>
              <BiCheck aria-hidden size={15} />
              <span>
                {plan.notNeeded.length} not needed to deploy:{' '}
                {plan.notNeeded.map((name, index) => (
                  <Fragment key={name}>
                    {index > 0 && ', '}
                    <span className="w-code">{name}</span>
                  </Fragment>
                ))}
              </span>
              <InfoTip about="secrets the deploy does not need">
                Your code reads {plan.notNeeded.length === 1 ? 'it' : 'them'} only in a build or test tool, or has a
                fallback, so the app starts without {plan.notNeeded.length === 1 ? 'it' : 'them'}. Add{' '}
                {plan.notNeeded.length === 1 ? 'it' : 'one'} as a secret later if you need it.
              </InfoTip>
            </li>
          )}
        </ul>
      )}
      {plan.groups.map((group) => (
        <div className="w-secret-group" key={`${group.resourceName}|${group.kind}`}>
          <p className="w-secret-group-title">
            <span>
              {GROUP_WORDS[group.kind]}
              {group.kind === 'setting' && group.from !== undefined && ` from ${group.from}`}
            </span>
            {group.kind === 'setting' && (
              <InfoTip about="settings from your deployment files">
                {group.from ?? 'Your deployment files'} sets these. Init does not copy values from it, because such
                files can also hold credentials. Copy them from there.
              </InfoTip>
            )}
            {group.resourceName !== '' && (
              <span className="w-secret-group-reader">
                read by <span className="w-mono">{group.resourceName}</span>
              </span>
            )}
          </p>
          {group.entries.map((entry) => (
            <SecretRow
              entry={entry}
              failure={failure?.name === entry.name ? failure.detail : undefined}
              isGenerated={generated.has(entry.name)}
              isSet={saved.has(entry.name)}
              key={entry.name}
              onGenerated={() => onGenerated(entry.name)}
              onSave={(value) => onSecret(entry.name, value)}
              readCommand={`stacktape secret get ${entry.name} --region ${region} --show-secrets`}
            />
          ))}
        </div>
      ))}
      {showConfirm && (
        <p className="w-quiet">
          <button className="w-link" onClick={onConfirm} type="button">
            I already saved these in AWS
          </button>
        </p>
      )}
    </>
  );
}

/** "Generate all 2": one strong random value for each secret the app owns, saved one after another. */
function GenerateAll({
  entries,
  onSecret,
  onSaved
}: {
  entries: SecretEntry[];
  onSecret: (name: string, value: string) => Promise<boolean>;
  onSaved: (name: string) => void;
}) {
  const [running, setRunning] = useState(false);
  if (entries.length < 2) return null;
  return (
    <Tooltip content="A strong random value for each secret your app owns, saved straight to AWS. Third-party keys stay yours to paste.">
      <Button
        isLoading={running}
        onClick={() =>
          void (async () => {
            setRunning(true);
            for (const entry of entries) {
              // One after another: each save is its own request to the CLI, and the first failure stops the rest.
              // oxlint-disable-next-line no-await-in-loop
              const ok = await onSecret(entry.name, generateSecretValue(entry.variable));
              if (!ok) break;
              onSaved(entry.name);
            }
            setRunning(false);
          })()
        }
        variant="secondary"
      >
        Generate all {entries.length}
      </Button>
    </Tooltip>
  );
}

function SecretRow({
  entry,
  isSet,
  isGenerated,
  failure,
  readCommand,
  onSave,
  onGenerated
}: {
  entry: SecretEntry;
  isSet: boolean;
  isGenerated: boolean;
  failure: string | undefined;
  readCommand: string;
  onSave: (value: string) => Promise<boolean>;
  onGenerated: () => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState<'typed' | 'generated' | undefined>();
  const [editing, setEditing] = useState(false);
  const save = async (input: string, how: 'typed' | 'generated') => {
    if (input === '') return;
    setSaving(how);
    const ok = await onSave(input);
    setSaving(undefined);
    if (ok) {
      setValue('');
      setEditing(false);
      if (how === 'generated') onGenerated();
    }
  };
  return (
    <div className="w-secret" id={`secret-${entry.name}`}>
      <div className="w-secret-label">
        <span className="w-secret-name">{entry.variable}</span>
        {(entry.source !== undefined || entry.note !== undefined) && (
          <span className="w-secret-source">{entry.note ?? `${entry.source!.file}:${entry.source!.line}`}</span>
        )}
      </div>
      {isSet && !editing ? (
        <div className="w-secret-saved">
          <span className="w-saved">
            <BiCheck aria-hidden size={16} /> Saved
          </span>
          <span aria-label="Value hidden" className="w-secret-mask">
            ••••••••••••
          </span>
          {isGenerated && (
            <span className="w-secret-tag">
              generated
              <InfoTip about="the generated value">
                A random value made in this page and saved straight to AWS. To read it:{' '}
                <span className="w-code">{readCommand}</span>
              </InfoTip>
            </span>
          )}
          <button className="w-link w-small" onClick={() => setEditing(true)} type="button">
            Replace
          </button>
        </div>
      ) : (
        <form
          className="w-secret-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save(value, 'typed');
          }}
        >
          <TextField
            aria-label={`Value for ${entry.name}`}
            autoComplete="off"
            onChange={(event) => setValue(event.target.value)}
            placeholder={entry.kind === 'outside' ? 'URL' : 'Value'}
            reserveMessageSpace={false}
            spellCheck={false}
            trailing={
              entry.canGenerate && value === '' ? (
                <button
                  className="w-field-action"
                  disabled={saving !== undefined}
                  onClick={() => void save(generateSecretValue(entry.variable), 'generated')}
                  title="Fill in a strong random value and save it"
                  type="button"
                >
                  {saving === 'generated' ? <Spinner /> : 'Generate'}
                </button>
              ) : undefined
            }
            type="password"
            value={value}
          />
          <Button disabled={value === ''} isLoading={saving === 'typed'} type="submit" variant="secondary">
            Save
          </Button>
          {editing && (
            <button className="w-link w-small" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          )}
        </form>
      )}
      {failure !== undefined && <p className="w-error-text w-secret-error">{failure}</p>}
    </div>
  );
}

type MigrationChoice = 'deploy-hook' | 'self' | 'unset';

/** Whether the database gets its tables: two explicit choices for the migration command the analysis found. */
function MigrationSection({
  migration,
  migrationDecision,
  skipped,
  isHandEdited,
  isLocked,
  busy,
  state,
  isOpen,
  onToggle,
  onDecision,
  onSkip
}: {
  migration: { service: string; command: string } | undefined;
  migrationDecision: NonNullable<WizardState['facts']>['decisions'][number] | undefined;
  skipped: boolean;
  isHandEdited: boolean;
  isLocked: boolean;
  busy: string | undefined;
  state: SectionState;
  isOpen: boolean;
  onToggle: () => void;
  onDecision: (id: string, value: string) => void;
  onSkip: (skipped: boolean) => void;
}) {
  const isOn = migrationDecision?.chosen === 'deploy-hook';
  const command = migration?.command ?? String(migrationDecision?.parameters.command ?? 'the migration');
  // The choice writes the hook into the generated file; a hand-edited file says it itself.
  const decisionId = migration === undefined ? migrationDecision?.id : `migration-timing:${migration.service}`;
  const canChoose = decisionId !== undefined && decisionId.startsWith('migration-timing:');
  const choice: MigrationChoice = isOn ? 'deploy-hook' : skipped ? 'self' : 'unset';
  const title = (
    <>
      Database migrations
      <InfoTip about="database migrations">
        Your app creates its tables with migrations. The new database on AWS starts empty, so something has to run them
        before traffic arrives.
      </InfoTip>
    </>
  );

  if (!canChoose) {
    return (
      <Section
        id="migrations"
        isOpen={false}
        state="ready"
        summary={
          <p className="w-check-meta">
            <span className="w-code">{command}</span> runs{' '}
            {migrationDecision?.chosen === 'service-startup'
              ? 'when the app starts'
              : migrationDecision?.chosen === 'deploy-hook'
                ? 'after each deploy'
                : 'when you run it yourself'}
            .
          </p>
        }
        title={title}
      />
    );
  }

  return (
    <Section
      id="migrations"
      isOpen={isOpen}
      onToggle={onToggle}
      state={state}
      summary={
        <p className="w-check-meta">
          {choice === 'deploy-hook' ? (
            <>
              Runs <span className="w-code">{command}</span> after every deploy.
            </>
          ) : choice === 'self' ? (
            <>
              You run <span className="w-code">{command}</span> yourself.
            </>
          ) : (
            'Without them the database starts empty.'
          )}
        </p>
      }
      title={title}
    >
      <Tooltip content="Your file is edited by hand. Add the hook there instead." disabled={!isHandEdited}>
        <div className="w-choice">
          <Tabs<MigrationChoice>
            appearance="segmented"
            ariaLabel="When the migrations run"
            disabled={isLocked || isHandEdited || busy === decisionId}
            onValueChange={(value) => {
              if (value === 'deploy-hook') {
                onSkip(false);
                onDecision(decisionId, 'deploy-hook');
              } else if (value === 'self') {
                onSkip(true);
                if (isOn) onDecision(decisionId, 'manual');
              }
            }}
            tabs={[
              { value: 'deploy-hook', label: 'Run after every deploy' },
              { value: 'self', label: 'I’ll run it myself' }
            ]}
            value={choice}
            width="fit"
          />
        </div>
      </Tooltip>
      <p className={`w-choice-effect${choice === 'unset' ? ' is-warn' : ''}`}>
        {choice === 'deploy-hook' ? (
          <>
            Runs <span className="w-code">{command}</span> after each deploy, before the new version takes traffic.
          </>
        ) : choice === 'self' ? (
          <>
            The database starts empty. Run <span className="w-code">{command}</span> against it before the app gets
            traffic.
          </>
        ) : (
          <>
            Without it the database starts empty. The command is <span className="w-code">{command}</span>.
          </>
        )}
      </p>
    </Section>
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
  // An expired session has one way back; otherwise the person picks how they sign in before seeing any field.
  const [path, setPath] = useState<AwsPath | undefined>(expired ? 'sso' : undefined);
  const [keyId, setKeyId] = useState('');
  const [secret, setSecret] = useState('');
  const explained = identity.reason === 'rejected' && !expired ? explainFailure(identity.detail) : [];
  const profileFlag =
    identity.profile === undefined || identity.profile === 'default' ? '' : ` --profile ${identity.profile}`;
  const profileWords = identity.profile === undefined ? 'the default profile' : `profile ${identity.profile}`;
  const checkAgain = (
    <Button isLoading={busy === 'recheck'} onClick={onRecheck} variant="secondary">
      Check again
    </Button>
  );

  return (
    <>
      <p className="w-check-meta">
        {identity.reason === 'no-credentials' ? (
          'This machine has no AWS credentials yet. How do you sign in to AWS?'
        ) : expired ? (
          `The AWS session on this machine${identity.profile === undefined ? '' : ` (profile ${identity.profile})`} is no longer valid. Sign in again:`
        ) : explained.length > 0 ? (
          <FailureExplanationText explanations={explained} />
        ) : (
          `AWS did not accept the credentials on this machine${identity.profile === undefined ? '' : ` (profile ${identity.profile})`}: ${identity.detail}`
        )}
      </p>
      <div className="w-aws-paths">
        <RadioGroup<AwsPath>
          label={<span className="sr-only">How you sign in to AWS</span>}
          name="aws-path"
          onValueChange={setPath}
          options={[
            {
              value: 'sso',
              label: 'Use your work AWS login (SSO)',
              description: 'Your company signs you in to AWS through a portal.'
            },
            {
              value: 'keys',
              label: 'Use access keys you already have',
              description: 'An access key ID and secret from IAM.'
            },
            {
              value: 'none',
              label: 'Create an AWS account',
              description: 'You do not have one yet. It takes a few minutes.'
            }
          ]}
          value={(path ?? '') as AwsPath}
        />
      </div>

      {path === 'keys' && (
        <form
          className="w-path-body"
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
          <p className="w-check-meta">
            Saved on this machine in <span className="w-code">~/.aws/credentials</span> as {profileWords}. Never sent to
            Stacktape.
            <InfoTip about="access keys">
              Keys of an IAM user that may create resources; for a personal account, one with AdministratorAccess. In
              the AWS console: IAM → Users → your user → Security credentials → Create access key. This is what{' '}
              <span className="w-code">stacktape aws-profile:create</span> does.
            </InfoTip>
          </p>
          <div>
            <Button
              disabled={keyId === '' || secret === ''}
              isLoading={busy === 'aws-keys' || state.awsKeys?.status === 'saving'}
              type="submit"
              variant="primary"
            >
              Save on this machine
            </Button>
          </div>
          {state.awsKeys?.status === 'failed' && <p className="w-error-text">{state.awsKeys.detail}</p>}
          {state.awsKeys?.status === 'saved' && identity.reason === 'rejected' && (
            <p className="w-error-text">Saved, but AWS did not accept these keys. Check they are active in IAM.</p>
          )}
        </form>
      )}

      {path === 'sso' && (
        <ol className="w-steps-list w-path-body">
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
        <ol className="w-steps-list w-path-body">
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
                  Use access keys you already have
                </button>
                .
              </span>
            }
          />
        </ol>
      )}
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
    <li className="w-check" id="deploy-tryout">
      <StatusIcon status={status} />
      <div className="min-w-0">
        <div className="w-check-head">
          <h2 className="w-check-title">
            Try it on this machine first
            <InfoTip about="the local try-out">
              Builds your app in Docker and starts it offline with placeholder settings, to catch an app that will not
              start before AWS bills for it. It runs your project’s code.
            </InfoTip>
            {verification === undefined && <span className="w-state is-optional">Optional</span>}
          </h2>
          {canStart && (
            <span className="w-check-aside">
              <Button isLoading={busy === 'verify'} onClick={onVerify} variant="secondary">
                {verification === undefined ? 'Build and start it' : 'Try again'}
              </Button>
            </span>
          )}
        </div>
        <p className="w-check-meta">
          {verification === undefined
            ? 'Catches an app that will not start, before AWS bills for it.'
            : verification.status === 'running'
              ? 'Building and starting your app. A first build can take a few minutes.'
              : verification.status === 'repairing'
                ? 'It did not start. Working out what we got wrong, then trying again.'
                : verification.status === 'dismissed'
                  ? 'Set aside. You can deploy.'
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
