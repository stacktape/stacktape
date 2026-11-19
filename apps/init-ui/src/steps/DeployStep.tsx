import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Badge } from '@stacktape/ui-react/badge';
import { Button } from '@stacktape/ui-react/button';
import { RadioGroup } from '@stacktape/ui-react/radio-group';
import { Spinner } from '@stacktape/ui-react/spinner';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { Fragment, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { BiCheck, BiChevronRight, BiErrorCircle, BiLinkExternal } from 'react-icons/bi';
import { ActionBar, MonthlyPrice } from '../components/ActionBar';
import { CopyableCommand } from '../components/CopyableCommand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { InfoTip } from '../components/InfoTip';
import { RegionPicker } from '../components/RegionPicker';
import { StatusIcon, type CheckStatus } from '../components/StatusIcon';
import { groupedAccount, identityName, TargetFacts } from '../components/TargetFacts';
import { resourcesOf, type ConfigResources } from '../config-resources';
import { secretCommand, stackCommand } from '../deploy-commands';
import { gapsToList, notesHeading, plainNote, type PlainNote } from '../gaps';
import { createdList } from '../part-names';
import {
  generateSecretValue,
  importStep,
  localValueReason,
  planSecrets,
  splitImports,
  taskGroups,
  taskNextText,
  type EnvironmentValues,
  type SecretEntry,
  type SecretTask,
  type SecretTaskGroup
} from '../secrets-model';
import type { WizardState } from '../session';
import { blockedTargetCopy, stackStatusWords } from '../target-copy';
import { monthlySuffix, plainList, splitMonthly } from './review-model';

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

/** Services whose migration Stacktape runs as a release command, in the new image before it takes traffic. */
const RELEASE_COMMAND_TYPES = new Set(['web-service', 'worker-service', 'private-service']);

const squash = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * When Stacktape runs the migration, in the words the choice and the finished row share. A container service runs it as
 * its release command; anything else runs it right after the deploy. Once chosen, the file says which it got.
 */
const migrationTiming = (resources: ConfigResources, service: string | undefined, isOn: boolean): string => {
  const resource = Object.entries(resources).find(
    ([name]) => service !== undefined && squash(name) === squash(service)
  )?.[1];
  const release = isOn
    ? resource?.properties.releaseCommand !== undefined
    : RELEASE_COMMAND_TYPES.has(resource?.type ?? '');
  return release ? 'before the new version takes traffic' : 'right after the new version goes live';
};

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
  onDismissVerification,
  onLoadEnvironment
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
  /** The project's `.env` values for the secrets, read once the secrets can be saved from here. */
  onLoadEnvironment: () => Promise<
    { file: string; values: Array<{ name: string; value: string }> } | { file: undefined }
  >;
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
  /** The user runs the migration some other way, and said so. */
  const [skipMigration, setSkipMigration] = useState(false);
  /** Secrets this page made up and saved, so their rows can say so. Never their values. */
  const [generated, setGenerated] = useState<ReadonlySet<string>>(new Set());
  /** What is typed or filled from `.env` in each row, by secret name, until it is saved. Only in this page's memory. */
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  /** Rows filled from `.env` by "Use the values from .env". */
  const [imported, setImported] = useState<ReadonlySet<string>>(new Set());

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

  // What the project's `.env` sets for these, read once they can be saved from here and again if the variables change
  // (a hand edit). Kept in this component's memory only.
  const [environment, setEnvironment] = useState<EnvironmentValues | undefined>();
  const variablesKey = plan.entries.map((entry) => entry.variable).join(',');
  useEffect(() => {
    if (!secretsAvailable || variablesKey === '') return;
    let current = true;
    void (async () => {
      try {
        const read = await onLoadEnvironment();
        if (current && read.file !== undefined) {
          setEnvironment({ file: read.file, values: new Map(read.values.map((entry) => [entry.name, entry.value])) });
        }
      } catch {
        // Without the values the rows are typed in by hand, as before.
      }
    })();
    return () => {
      current = false;
    };
  }, [secretsAvailable, variablesKey, onLoadEnvironment]);
  const groups = taskGroups(plan, environment);
  const remainingIn = (group: SecretTaskGroup) => group.entries.filter((entry) => !secretsSet.has(entry.name));
  const firstGroup = groups.find((group) => remainingIn(group).length > 0);
  // The first group with something left is open; Show and Hide override that, and a group the user finished folds.
  const [taskChoice, setTaskChoice] = useState<Partial<Record<SecretTask, boolean>>>({});
  const openTasks = new Set(
    groups
      .filter((group) => taskChoice[group.task] ?? (group === firstGroup && !secretsDone))
      .map((group) => group.task)
  );
  /** The group the user opened last: the bar's "Next" follows it while it has something left. */
  const [activeTask, setActiveTask] = useState<SecretTask | undefined>();
  const workingGroup =
    groups.find((group) => group.task === activeTask && openTasks.has(group.task) && remainingIn(group).length > 0) ??
    firstGroup;
  const doneKey = groups.map((group) => `${group.task}:${remainingIn(group).length === 0}`).join('|');
  const [seenDone, setSeenDone] = useState(doneKey);
  if (seenDone !== doneKey) {
    setSeenDone(doneKey);
    const finished = groups.filter((group) => remainingIn(group).length === 0).map((group) => group.task);
    if (finished.some((task) => taskChoice[task] === true)) {
      setTaskChoice((current) => {
        const next = { ...current };
        for (const task of finished) delete next[task];
        return next;
      });
    }
  }
  const stepOf = (group: SecretTaskGroup) =>
    group.task === 'import' ? importStep(remainingIn(group), environment, imported, drafts) : undefined;

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
  const configPath = file?.filename ?? 'stacktape.yml';
  const notes: PlainNote[] = [
    ...gaps
      .filter(
        (gap) =>
          runnableMigration(gap) === undefined && gap !== migrationNote && !plan.explainedGaps.includes(gap.subject)
      )
      .map((gap) => plainNote(gap, configPath)),
    ...(unsetNames.length === 0
      ? []
      : [
          {
            key: 'unset-settings',
            title: `Your code reads ${unsetNames.length === 1 ? 'a setting' : `${unsetNames.length} settings`} that nothing sets`,
            body: `${plainList(unsetNames.map((name) => `\`${name}\``))}. If the app needs ${unsetNames.length === 1 ? 'it' : 'one'} to start, add it under \`environment\` in ${configPath}.`
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
  /** The section the user opened last: the bar's "Next" follows it while it still needs them. */
  const [activeSection, setActiveSection] = useState<SectionId | undefined>();
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
  const toggle = (id: SectionId) => {
    const opening = !isOpen(id);
    setOpenChoice((current) => ({ ...current, [id]: opening }));
    setActiveSection((current) => (opening ? id : current === id ? undefined : current));
  };
  const toggleTask = (task: SecretTask) => {
    const opening = !openTasks.has(task);
    setTaskChoice((current) => ({ ...current, [task]: opening }));
    setActiveTask((current) => (opening ? task : current === task ? undefined : current));
    if (opening) setActiveSection('secrets');
  };
  const goTo = (id: SectionId, task?: SecretTask) => {
    setOpenChoice((current) => ({ ...current, [id]: true }));
    if (task !== undefined) setTaskChoice((current) => ({ ...current, [task]: true }));
    requestAnimationFrame(() => {
      const element = document.getElementById(task === undefined ? `deploy-${id}` : `task-${task}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // The control the bar named, when the section marks one; else its first field or choice.
      element
        ?.querySelector<HTMLElement>(
          '[data-next-action], input:not([type="radio"]):not(:disabled), [role="tab"], input[type="radio"]'
        )
        ?.focus({ preventScroll: true });
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

  /**
   * What the bar says while the button is off: the next thing as a verb and a count, linking to the control that does
   * it, or what is still being checked. It names what the open section asks for: the one the user opened last while it
   * needs them, else the first that does.
   */
  type Next = { text: string; section?: SectionId; task?: SecretTask };
  const awsNext: Next | undefined =
    identity === undefined || identity.available
      ? stage === ''
        ? { text: 'enter a stage name', section: 'aws' }
        : awsState === 'checking'
          ? { text: 'Checking the stack, read-only…' }
          : awsState === 'blocked'
            ? { text: 'a stack Stacktape can deploy to', section: 'aws' }
            : undefined
      : { text: identity.reason === 'rejected' ? 'sign in to AWS again' : 'connect AWS', section: 'aws' };
  const secretsNext: Next | undefined =
    secretsDone || secretsState === 'waiting'
      ? undefined
      : workingGroup !== undefined && secretsAvailable
        ? {
            text: taskNextText(workingGroup, remainingIn(workingGroup), environment?.file, stepOf(workingGroup)),
            section: 'secrets',
            task: workingGroup.task
          }
        : { text: `create ${unsaved.length} ${secretsNoun(unsaved.length)} in AWS`, section: 'secrets' };
  const migrationsNext: Next | undefined = migrationNeeded
    ? { text: 'choose who runs migrations', section: 'migrations' }
    : undefined;
  const bySection: Record<SectionId, Next | undefined> = {
    aws: awsNext,
    secrets: secretsNext,
    migrations: migrationsNext
  };
  const next: Next | undefined =
    file === undefined
      ? { text: `Saving ${commandTarget.configPath}…` }
      : identity === undefined
        ? { text: 'Checking the AWS credentials on this machine…' }
        : ((activeSection === undefined ? undefined : bySection[activeSection]) ??
          awsNext ??
          secretsNext ??
          migrationsNext ??
          (verificationBlocks
            ? { text: 'the local try-out' }
            : notDeployable
              ? { text: 'a gap in the configuration' }
              : undefined));

  const price = state.composition?.price;
  const monthly = price === undefined ? undefined : splitMonthly(price.monthly);
  const noCredentials = identity?.available === false && identity.reason === 'no-credentials';

  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">{noCredentials ? 'Connect AWS to deploy' : `Deploy to ${stage || 'dev'}`}</h1>
        <p className="w-lede">
          {file === undefined ? (
            'Saving the file to your project…'
          ) : noCredentials ? (
            <>
              <span className="w-code">{file.filename}</span> is saved · stage {stage || 'dev'}
            </>
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
            Estimated <strong>{monthly.amount}/month</strong>
            {monthly.usage ? ' + usage' : ''} on AWS
          </p>
        )}
      </header>

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
              identity?.available === false && identity.reason === 'rejected'
                ? /expired|ExpiredToken/i.test(identity.detail)
                  ? 'Your AWS session expired'
                  : 'AWS did not accept these credentials'
                : 'AWS account'
            }
          >
            {identity?.available === false ? (
              <AwsConnect busy={busy} identity={identity} onAwsKeys={onAwsKeys} onRecheck={onRecheck} state={state} />
            ) : identity?.available === true ? (
              <>
                <AccountLine identity={identity} />
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
                drafts={drafts}
                environment={environment}
                failure={state.secrets?.failure}
                generated={generated}
                groups={groups}
                imported={imported}
                isAvailable={secretsAvailable}
                onConfirm={onConfirmSecrets}
                onDrafts={setDrafts}
                onGenerated={(name) => setGenerated((current) => new Set([...current, name]))}
                onImported={setImported}
                onSecret={onSecret}
                onToggleTask={toggleTask}
                openTasks={openTasks}
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
              resources={resources}
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
              <MigrationNote message={migrationNote.message} />
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

      {ready && identity?.available === true && (
        // What the click commits to, right under the list it finishes: what it creates where, the cost, the wait.
        <section aria-label="What Deploy does" className="w-commit">
          <p className="w-commit-main">
            {target?.status === 'updateable' ? 'Updates' : 'Creates'} {createdList(resources, state)}
          </p>
          <TargetFacts
            facts={[
              { label: 'AWS account', value: groupedAccount(identity.accountId) },
              { label: 'Region', value: region },
              { label: 'Stage', value: stage },
              monthly?.amount !== undefined && {
                label: 'Estimated',
                value: `${monthly.amount}/month${monthly.usage ? ' + usage' : ''}`,
                breakBefore: true
              },
              { label: 'Takes about', value: estimate, breakBefore: monthly?.amount === undefined }
            ]}
          />
        </section>
      )}

      {notes.length > 0 && <Notes notes={notes} />}

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
        align="column"
        className={ready ? 'is-ready' : next?.section === undefined ? 'is-blocked' : 'is-blocked has-next'}
        note={
          // Ready: what the click does is in the block right above; the bar keeps the price and the button.
          ready ? undefined : next === undefined ? undefined : next.section === undefined ? (
            <span className="w-bar-next">{next.text}</span>
          ) : (
            <span className="w-bar-next">
              <span className="w-bar-next-label">Next:</span>{' '}
              <button className="w-link" onClick={() => goTo(next.section!, next.task)} type="button">
                {next.text}
              </button>
            </span>
          )
        }
        price={<MonthlyPrice state={state} suffix={monthlySuffix} />}
      >
        {!ready && next?.section !== undefined && (
          // On a phone the bar is this one action, full width, until Deploy can work.
          <Button className="w-bar-next-button" onClick={() => goTo(next.section!, next.task)} variant="secondary">
            {next.text.charAt(0).toUpperCase()}
            {next.text.slice(1)}
          </Button>
        )}
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

/**
 * The AWS account this machine deploys to and who it signs in as; folded, also the region and stage. Each part has its
 * label, so the IAM user `dev` and the stage `dev` read as two things.
 */
function AccountLine({
  identity,
  region,
  stage
}: {
  identity: Extract<NonNullable<WizardState['awsIdentity']>, { available: true }>;
  /** Absent while the region and stage are fields right under the line. */
  region?: string;
  stage?: string;
}) {
  return (
    <TargetFacts
      className="w-account"
      facts={[
        {
          label: 'AWS account',
          value: groupedAccount(identity.accountId),
          help: (
            <InfoTip about="the AWS account">
              The credentials on this machine
              {identity.profile === undefined ? '' : ` (profile ${identity.profile})`} decide the account. To deploy to
              another one, start <span className="w-code">stacktape init</span> with{' '}
              <span className="w-code">AWS_PROFILE=name</span>.
            </InfoTip>
          )
        },
        { label: 'Signed in as', value: identityName(identity.arn) },
        region !== undefined && { label: 'Region', value: region },
        stage !== undefined && { label: 'Stage', value: stage || '—' }
      ]}
    />
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

const TASK_WORDS: Record<SecretTask, { title: string; help: string }> = {
  generate: {
    title: 'Generated for you',
    help: 'Values only your app uses, such as session keys. A strong random value works, made in this page and saved straight to AWS.'
  },
  provide: {
    title: 'You provide',
    help: 'Keys and addresses that come from other services. Stacktape cannot make these up.'
  },
  import: {
    title: 'Values in .env',
    help: 'Your .env sets these on your machine. Check each value: it goes from this page to AWS Secrets Manager in your account, nowhere else.'
  }
};

/** A value this long gets the row's whole width, so a list of URLs can be read before it is saved. */
const WIDE_VALUE = 28;

/**
 * The secrets, grouped by what the user does about them: generate, type in, or check what `.env` has. Each group says
 * how many are left; the first with something left is open, a finished one folds to one line. Once the `.env` values are
 * in their fields, that group splits into what can be saved as it is and what needs a look first.
 */
function SecretsBody({
  plan,
  groups,
  environment,
  saved,
  generated,
  drafts,
  imported,
  failure,
  region,
  awsAccount,
  isAvailable,
  showConfirm,
  openTasks,
  onToggleTask,
  onSecret,
  onGenerated,
  onDrafts,
  onImported,
  onConfirm
}: {
  plan: ReturnType<typeof planSecrets>;
  groups: SecretTaskGroup[];
  environment: EnvironmentValues | undefined;
  saved: ReadonlySet<string>;
  generated: ReadonlySet<string>;
  /** What is in each row's field, by secret name, until it is saved. */
  drafts: Readonly<Record<string, string>>;
  /** Rows filled from `.env` by "Use the values from .env". */
  imported: ReadonlySet<string>;
  failure: { name: string; detail: string } | undefined;
  region: string;
  awsAccount: string | undefined;
  isAvailable: boolean;
  showConfirm: boolean;
  openTasks: ReadonlySet<SecretTask>;
  onToggleTask: (task: SecretTask) => void;
  onSecret: (name: string, value: string) => Promise<boolean>;
  onGenerated: (name: string) => void;
  onDrafts: Dispatch<SetStateAction<Readonly<Record<string, string>>>>;
  onImported: Dispatch<SetStateAction<ReadonlySet<string>>>;
  onConfirm: () => void;
}) {
  const [savingAll, setSavingAll] = useState(false);
  const setDraft = (name: string, value: string) => onDrafts((current) => ({ ...current, [name]: value }));
  const save = async (name: string, value: string) => {
    const ok = await onSecret(name, value);
    if (ok) {
      onDrafts((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
    return ok;
  };
  const readers = new Set(
    plan.entries.map((entry) => plan.groups.find((group) => group.entries.includes(entry))?.resourceName)
  );
  const file = environment?.file ?? '.env';
  const environmentValue = (entry: SecretEntry) => environment?.values.get(entry.variable);

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

  const row = (group: SecretTaskGroup, entry: SecretEntry) => {
    const fromEnvironment = environmentValue(entry);
    const reader =
      readers.size > 1 ? plan.groups.find((candidate) => candidate.entries.includes(entry))?.resourceName : undefined;
    return (
      <SecretRow
        draft={drafts[entry.name] ?? ''}
        entry={entry}
        environmentNote={group.task === 'provide' && fromEnvironment === '' ? `Empty in ${file}` : undefined}
        failure={failure?.name === entry.name ? failure.detail : undefined}
        isGenerated={generated.has(entry.name)}
        isImported={imported.has(entry.name)}
        isSet={saved.has(entry.name)}
        isWide={group.task === 'import' && (fromEnvironment ?? '').length > WIDE_VALUE}
        key={entry.name}
        onDraft={(value) => setDraft(entry.name, value)}
        onGenerated={() => onGenerated(entry.name)}
        onSave={(value) => save(entry.name, value)}
        readCommand={`stacktape secret get ${entry.name} --region ${region} --show-secrets`}
        reader={reader}
        source={group.task === 'import' ? '' : undefined}
      />
    );
  };

  /** Saves the ready `.env` values one after another, like Generate all: the first failure stops the rest. */
  const saveAll = (entries: readonly SecretEntry[]) =>
    void (async () => {
      setSavingAll(true);
      for (const entry of entries) {
        // oxlint-disable-next-line no-await-in-loop
        if (!(await save(entry.name, drafts[entry.name]!))) break;
      }
      setSavingAll(false);
    })();

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
                {plan.setByStacktape.length} set by Stacktape: <CodeList names={plan.setByStacktape} />
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
                {plan.notNeeded.length} not needed to deploy: <CodeList names={plan.notNeeded} />
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
      <div className="w-tasks">
        {groups.map((group) => {
          const remaining = group.entries.filter((entry) => !saved.has(entry.name));
          const isOpen = openTasks.has(group.task);
          const title = group.task === 'import' ? `Values in ${file}` : TASK_WORDS[group.task].title;
          const unused = remaining.filter((entry) => !imported.has(entry.name));
          // The .env group splits once its values are in the fields: nothing is left to fill from the file.
          const isSplit = group.task === 'import' && unused.length === 0;
          const step = group.task === 'import' ? importStep(remaining, environment, imported, drafts) : undefined;
          const action =
            group.task === 'generate' ? (
              <GenerateAll entries={remaining} onSaved={onGenerated} onSecret={onSecret} />
            ) : group.task === 'import' && unused.length > 0 ? (
              <Button
                data-next-action
                onClick={() => {
                  onDrafts((current) => ({
                    ...current,
                    ...Object.fromEntries(unused.map((entry) => [entry.name, environmentValue(entry) ?? '']))
                  }));
                  onImported((current) => new Set([...current, ...unused.map((entry) => entry.name)]));
                }}
                variant="secondary"
              >
                Use the {unused.length} {unused.length === 1 ? 'value' : 'values'} from {file}
              </Button>
            ) : undefined;
          const split = splitImports(group.entries, environment);
          return (
            <section
              aria-label={title}
              className={`w-task${isOpen ? ' is-open' : ''}`}
              id={`task-${group.task}`}
              key={group.task}
            >
              <div className="w-task-head">
                <button
                  aria-expanded={isOpen}
                  className="w-task-toggle"
                  onClick={() => onToggleTask(group.task)}
                  type="button"
                >
                  <BiChevronRight aria-hidden className="w-task-chevron" size={16} />
                  <span className="w-task-title">{title}</span>
                  <TaskCount left={remaining.length} total={group.entries.length} />
                </button>
                <InfoTip about={title.toLowerCase()}>{TASK_WORDS[group.task].help}</InfoTip>
                {isOpen && action !== undefined && <span className="w-task-action">{action}</span>}
              </div>
              {isOpen && !isSplit && (
                <div className="w-task-rows">{group.entries.map((entry) => row(group, entry))}</div>
              )}
              {isOpen && isSplit && (
                <div className="w-task-rows">
                  {split.ready.length > 0 && (
                    <div className="w-subtask">
                      <div className="w-subtask-head">
                        <span className="w-subtask-title">Ready to save</span>
                        <TaskCount
                          left={split.ready.filter((entry) => !saved.has(entry.name)).length}
                          total={split.ready.length}
                        />
                        {step?.step === 'save' && (
                          <span className="w-task-action">
                            <Button
                              data-next-action
                              isLoading={savingAll}
                              onClick={() => saveAll(step.entries)}
                              variant="primary"
                            >
                              Save {step.entries.length} {step.entries.length === 1 ? 'value' : 'values'}
                            </Button>
                          </span>
                        )}
                      </div>
                      {split.ready.map((entry) => row(group, entry))}
                    </div>
                  )}
                  {split.review.length > 0 && (
                    <div className="w-subtask">
                      <div className="w-subtask-head">
                        <span className="w-subtask-title">Review before saving</span>
                        <TaskCount
                          left={split.review.filter((entry) => !saved.has(entry.name)).length}
                          total={split.review.length}
                        />
                        <InfoTip about="values to review">
                          They point at this machine or are a template’s example, so the deployed app would not work
                          with them. Change each one, then save it.
                        </InfoTip>
                      </div>
                      {split.review.map((entry) => row(group, entry))}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
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

/** "4 left", or "All 7 saved" once nothing is. */
function TaskCount({ left, total }: { left: number; total: number }) {
  return left === 0 ? (
    <span className="w-task-count is-done">
      <BiCheck aria-hidden size={14} /> {total === 1 ? 'Saved' : `All ${total} saved`}
    </span>
  ) : (
    <span className="w-task-count">{left} left</span>
  );
}

function CodeList({ names }: { names: readonly string[] }) {
  return (
    <>
      {names.map((name, index) => (
        <Fragment key={name}>
          {index > 0 && ', '}
          <span className="w-code">{name}</span>
        </Fragment>
      ))}
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
        data-next-action
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
        variant="primary"
      >
        Generate all {entries.length}
      </Button>
    </Tooltip>
  );
}

const LOCAL_WORDS = {
  local: 'Local value: change before deploying',
  example: 'Example value: change before deploying'
} as const;

function SecretRow({
  entry,
  draft,
  isSet,
  isGenerated,
  isImported,
  isWide,
  failure,
  readCommand,
  reader,
  source,
  environmentNote,
  onDraft,
  onSave,
  onGenerated
}: {
  entry: SecretEntry;
  /** What is in the field: typed, or filled from `.env`. */
  draft: string;
  isSet: boolean;
  isGenerated: boolean;
  isImported: boolean;
  /** A long value: the field takes the row's whole width, under the name. */
  isWide: boolean;
  failure: string | undefined;
  readCommand: string;
  /** The resource that reads it, when several do. */
  reader: string | undefined;
  /** Said instead of the line that reads it; empty for a value the group already says comes from `.env`. */
  source: string | undefined;
  environmentNote: string | undefined;
  onDraft: (value: string) => void;
  onSave: (value: string) => Promise<boolean>;
  onGenerated: () => void;
}) {
  const [saving, setSaving] = useState<'typed' | 'generated' | undefined>();
  const [editing, setEditing] = useState(false);
  const save = async (input: string, how: 'typed' | 'generated') => {
    if (input === '') return;
    setSaving(how);
    const ok = await onSave(input);
    setSaving(undefined);
    if (ok) {
      setEditing(false);
      if (how === 'generated') onGenerated();
    }
  };
  // A secret stays hidden while it is typed; a plain setting is shown, so an imported one can be checked.
  const isHidden = entry.kind !== 'setting';
  const local = isImported && !isSet ? localValueReason(draft) : undefined;
  const meta = [
    reader === undefined ? undefined : `read by ${reader}`,
    environmentNote ??
      (source !== undefined
        ? source
        : (entry.note ?? (entry.source === undefined ? undefined : `${entry.source.file}:${entry.source.line}`)))
  ].filter((part): part is string => part !== undefined && part !== '');
  return (
    <div
      className={`w-secret${local === undefined ? '' : ' is-local'}${isWide && !(isSet && !editing) ? ' is-wide' : ''}`}
      id={`secret-${entry.name}`}
    >
      <div className="w-secret-label">
        <span className="w-secret-name">{entry.variable}</span>
        {meta.length > 0 && <span className="w-secret-source">{meta.join(' · ')}</span>}
      </div>
      {isSet && !editing ? (
        <div className="w-secret-saved">
          <span className="w-saved">
            <BiCheck aria-hidden size={16} /> Saved
          </span>
          <span aria-label="Value hidden" className="w-secret-mask">
            ••••••••
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
            void save(draft, 'typed');
          }}
        >
          <TextField
            aria-label={`Value for ${entry.name}`}
            autoComplete="off"
            onChange={(event) => onDraft(event.target.value)}
            placeholder={entry.kind === 'outside' ? 'URL' : 'Value'}
            reserveMessageSpace={false}
            spellCheck={false}
            trailing={
              entry.canGenerate && draft === '' ? (
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
            type={isHidden ? 'password' : 'text'}
            value={draft}
          />
          <Button disabled={draft === ''} isLoading={saving === 'typed'} type="submit" variant="secondary">
            Save
          </Button>
          {editing && (
            <button className="w-link w-small" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          )}
        </form>
      )}
      {local !== undefined && (
        <p className="w-secret-local">
          <BiErrorCircle aria-hidden size={14} />
          {LOCAL_WORDS[local]}
        </p>
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
  resources,
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
  resources: ConfigResources;
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
  const service =
    migration?.service ??
    (typeof migrationDecision?.parameters.serviceName === 'string'
      ? migrationDecision.parameters.serviceName
      : undefined);
  /** When it runs, in the same words on the choice and on the finished row. */
  const when = `on every deploy, ${migrationTiming(resources, service, isOn)}`;
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
                ? 'on every deploy'
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
              Stacktape runs <span className="w-code">{command}</span> {when}.
            </>
          ) : choice === 'self' ? (
            <>
              You run <span className="w-code">{command}</span> yourself.
            </>
          ) : (
            'The new database starts empty. Choose who runs the migrations.'
          )}
        </p>
      }
      title={title}
    >
      <p className="w-check-meta">The new database starts empty. This command creates its tables:</p>
      <pre className="w-command-line">{command}</pre>
      <Tooltip content="Your file is edited by hand. Add the hook there instead." disabled={!isHandEdited}>
        <div className="w-choices">
          <RadioGroup<Exclude<MigrationChoice, 'unset'>>
            disabled={isLocked || isHandEdited || busy === decisionId}
            label={<span className="sr-only">Who runs the migrations</span>}
            name="migration-runner"
            onValueChange={(value) => {
              if (value === 'deploy-hook') {
                onSkip(false);
                onDecision(decisionId, 'deploy-hook');
              } else {
                onSkip(true);
                if (isOn) onDecision(decisionId, 'manual');
              }
            }}
            options={[
              {
                value: 'deploy-hook',
                label: (
                  <span className="w-choice-label">
                    Stacktape runs it
                    <Badge size="small" tone="brand">
                      Recommended
                    </Badge>
                  </span>
                ),
                description: `${when.charAt(0).toUpperCase()}${when.slice(1)}.`
              },
              {
                value: 'self',
                label: 'I run it myself',
                description: 'The app starts against an empty database until you do.'
              }
            ]}
            value={(choice === 'unset' ? '' : choice) as Exclude<MigrationChoice, 'unset'>}
          />
        </div>
      </Tooltip>
    </Section>
  );
}

type AwsPath = 'sso' | 'keys';

const KEYS_LABEL = 'Use an existing AWS access key';

/**
 * No working AWS credentials. Without any: the two ways in for someone who has an account, and below them, quieter, how
 * to get one and where to come back to. An expired session has one way back, so it leads: the command, then the check;
 * other logins wait behind a link.
 */
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
  const [path, setPath] = useState<AwsPath | undefined>();
  const [otherLogin, setOtherLogin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [secret, setSecret] = useState('');
  const explained = identity.reason === 'rejected' && !expired ? explainFailure(identity.detail) : [];
  const profileFlag =
    identity.profile === undefined || identity.profile === 'default' ? '' : ` --profile ${identity.profile}`;
  const profileWords = identity.profile === undefined ? 'the default profile' : `profile ${identity.profile}`;
  const checkAgain = (variant: 'primary' | 'secondary') => (
    <Button isLoading={busy === 'recheck'} onClick={onRecheck} variant={variant}>
      Check again
    </Button>
  );
  const profileTip = (
    <InfoTip about="AWS profiles">
      If the profile has a name, start <span className="w-code">stacktape init</span> with{' '}
      <span className="w-code">AWS_PROFILE=name</span> so the wizard uses it.
    </InfoTip>
  );
  const showPaths = !expired || otherLogin;
  const useKeys = () => {
    setPath('keys');
    requestAnimationFrame(() =>
      document.getElementById('aws-path')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  return (
    <>
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

      {expired && (
        <div className="w-relogin">
          <p className="w-field-label">
            Sign in to AWS again
            {profileTip}
          </p>
          <CopyableCommand command={`aws sso login${profileFlag}`} />
          <div className="w-relogin-actions">
            {checkAgain('primary')}
            <span className="w-quiet">After you sign in.</span>
          </div>
          <button
            aria-expanded={otherLogin}
            className="w-link w-small w-relogin-other"
            onClick={() => setOtherLogin(!otherLogin)}
            type="button"
          >
            {otherLogin ? 'Hide other AWS logins' : 'Use a different AWS login'}
          </button>
        </div>
      )}

      {showPaths && (
        <div className="w-choices w-aws-paths" id="aws-path">
          <RadioGroup<AwsPath>
            label={expired ? <span className="sr-only">How you sign in to AWS</span> : 'How do you sign in to AWS?'}
            name="aws-path"
            onValueChange={setPath}
            options={[
              {
                value: 'sso',
                label: 'Sign in through my company',
                description: 'Your company signs you in to AWS through a portal (SSO).'
              },
              {
                value: 'keys',
                label: KEYS_LABEL,
                description: 'An access key ID and secret from IAM.'
              }
            ]}
            value={(path ?? '') as AwsPath}
          />
        </div>
      )}

      {showPaths && path === 'keys' && (
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

      {showPaths && path === 'sso' && (
        <ol className="w-steps-list w-path-body">
          <Step text="Set up the profile once. It asks for your SSO start URL.">
            <CopyableCommand command="aws configure sso" />
          </Step>
          <Step text="Sign in. Do this again when the session expires.">
            <CopyableCommand command={`aws sso login${profileFlag}`} />
          </Step>
          <Step
            text={
              <span className="inline-flex items-center gap-1.5">
                Then check again.
                {profileTip}
              </span>
            }
          >
            <div>{checkAgain('primary')}</div>
          </Step>
        </ol>
      )}

      {identity.reason === 'no-credentials' && (
        // Someone without an account leaves this page for a while: the way there, and the way back to here.
        <div className="w-aws-new">
          <button
            aria-expanded={creating}
            className="w-disclosure"
            onClick={() => setCreating(!creating)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-disclosure-chevron" size={16} />
            No AWS account yet?
          </button>
          {creating && (
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
                    Create an access key for your user.{' '}
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
                    Come back to this page and paste it under{' '}
                    <button className="w-link" onClick={useKeys} type="button">
                      {KEYS_LABEL}
                    </button>
                    . Set it up in a terminal instead? Then click Check again.
                  </span>
                }
              >
                <div>{checkAgain('secondary')}</div>
              </Step>
            </ol>
          )}
        </div>
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

/**
 * What the analysis noticed that the checklist does not ask about: one folded row ("3 notes about compose.yml"), and
 * each note, opened, as what it means for the deploy, then what to do about it.
 */
function Notes({ notes }: { notes: readonly PlainNote[] }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <section aria-label="Worth a look" className={`w-notes${isOpen ? ' is-open' : ''}`}>
      <button aria-expanded={isOpen} className="w-notes-head" onClick={() => setOpen(!isOpen)} type="button">
        <BiErrorCircle aria-hidden className="w-notes-icon" size={17} />
        <span className="w-notes-title">
          Worth a look <span>{notesHeading(notes)}</span>
        </span>
        <span className="w-notes-toggle">
          {isOpen ? 'Hide' : 'Show'}
          <BiChevronRight aria-hidden className="w-task-chevron" size={16} />
        </span>
      </button>
      {isOpen && (
        <ul className="w-notes-list">
          {notes.map((note) => (
            <li key={note.key}>
              <p className="w-note-title">{withCode(note.title)}</p>
              {note.body !== '' && <p className="w-note-body">{withCode(note.body)}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * A migration the deploy cannot run for the user (SQLite, reachable only from inside the running app): why, then the
 * command on its own line and where it goes. Any other wording is shown whole.
 */
function MigrationNote({ message }: { message: string }) {
  const known = /^Make (\S+) run "([^"]+)" before it starts its server/.exec(message);
  if (known === null) return <p className="w-check-meta">{withCode(message.replace(/"([^"]+)"/g, '`$1`'))}</p>;
  const [, service, command] = known;
  return (
    <>
      <p className="w-check-meta">
        The database file is only reachable from inside the running app, so the deploy cannot run them for you. Make{' '}
        <span className="w-code">{service}</span> run this before it starts its server:
      </p>
      <pre className="w-command-line">{command}</pre>
    </>
  );
}
