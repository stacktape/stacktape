import { explainFailure } from '@stacktape/console-api/failure-explanations';
import { Badge } from '@stacktape/ui-react/badge';
import { Button } from '@stacktape/ui-react/button';
import { CommandLine } from '@stacktape/ui-react/command-line';
import { RadioGroup } from '@stacktape/ui-react/radio-group';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { BiChevronRight, BiErrorCircle, BiLinkExternal } from 'react-icons/bi';
import { ActionBar, MonthlyPrice } from '../components/ActionBar';
import { DeploySummary } from '../components/DeploySummary';
import { DeployTarget } from '../components/DeployTarget';
import { Expand } from '../components/Expand';
import { FailureExplanationText } from '../components/FailureExplanation';
import { InfoTip } from '../components/InfoTip';
import { SecretsList, type RemovedSecret } from '../components/SecretsList';
import { StatusIcon, type CheckStatus } from '../components/StatusIcon';
import { resourcesOf, type ConfigResources } from '../config-resources';
import { secretCommand, stackCommand } from '../deploy-commands';
import { gapsToList, notesHeading, plainNote, type PlainNote } from '../gaps';
import {
  initialDraft,
  planSecrets,
  secretsNextText,
  type EnvironmentValues,
  type SecretDraft,
  type SecretEntry
} from '../secrets-model';
import type { WizardState } from '../session';
import { blockedTargetCopy } from '../target-copy';
import { monthlySuffix, plainList, splitMonthly } from './review-model';

type Expectation = { kind: 'check' | 'create' } | { kind: 'update'; stackId: string };

/** What a click on Deploy asks for, by what the stack check found. Without an answer, it only checks. */
const expectationOf = (target: WizardState['deployTarget']): Expectation =>
  target?.status === 'absent'
    ? { kind: 'create' }
    : target?.status === 'updateable'
      ? { kind: 'update', stackId: target.stackId }
      : { kind: 'check' };

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
 * How Stacktape can run a service's migration, from the resource it deploys as. A container service runs it as its
 * release command, in its own image. An SSR site can too, in an image of the whole project that needs Docker to build;
 * otherwise from this machine right after the deploy. Anything else only right after the deploy.
 */
export type MigrationRunner = 'container' | 'site' | 'after-deploy';

export const migrationRunnerOf = (resources: ConfigResources, service: string | undefined): MigrationRunner => {
  const type = Object.entries(resources).find(
    ([name]) => service !== undefined && squash(name) === squash(service)
  )?.[1]?.type;
  if (type !== undefined && RELEASE_COMMAND_TYPES.has(type)) return 'container';
  if (type?.endsWith('-web') === true) return 'site';
  return 'after-deploy';
};

/** The variables of some secrets, as code, the first three by name: "`NATS_URL`, `RMQ_URL` and 2 more". */
const variableList = (entries: readonly SecretEntry[]): string => {
  const names = entries.map((entry) => `\`${entry.variable}\``);
  return names.length <= 3 ? plainList(names) : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
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
 * The Deploy step: where it deploys, what the app needs before it can start there, and what the click creates.
 *
 * The list on the left is everything the deploy needs, each part saying where it stands: Ready, Needs input, or
 * Available after AWS is connected. Where it deploys is always three controls (account, region, stage), never a line of
 * facts with an Edit link. The first part that needs the user is open; a finished one folds to one line. The summary
 * (beside the list on a wide screen, under it otherwise) says what the click creates where, what it costs and how long
 * it takes, and carries the button; until nothing is missing, it names the next thing to do and goes there.
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
  onAwsProfile,
  onDismissSecret,
  onRecheck,
  onDecision,
  onRegion,
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
  onAwsProfile: (profile: string) => void;
  onDismissSecret: (name: string, dismissed: boolean) => Promise<void>;
  onRecheck: () => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
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
  // A choice made here (when the migration runs, a secret taken out) rewrites the file, and the stack is checked again
  // for it. Until the new answer comes, the last one for the same stack stays on the page, so only what the user
  // changed moves. Deploying waits for the new answer: the CLI deploys only against a check of the file it deploys.
  const shownFile = useHeld(file, state.projectName);
  const account = identity?.available === true ? identity.accountId : '';
  const shownTarget = useHeld(target, `${state.projectName}|${stage}|${region}|${account}`);
  const [showTerminal, setShowTerminal] = useState(false);
  /** The user runs the migration some other way, and said so. */
  const [skipMigration, setSkipMigration] = useState(false);
  /** What is in each secret's field until it is saved, by secret name. Only in this page's memory. */
  const [drafts, setDrafts] = useState<Readonly<Record<string, SecretDraft | undefined>>>({});
  /** Secrets removed from the config here, with the variable each was read as, so the list can offer them back. */
  const [removedNames, setRemovedNames] = useState<Readonly<Record<string, string>>>({});
  const [removing, setRemoving] = useState<string | undefined>();
  // A profile picked in the account control, until the identity check for it answers.
  const switching =
    busy === 'aws-profile' ||
    (state.awsProfiles?.selected !== undefined &&
      (identity === undefined || identity.profile !== state.awsProfiles.selected));

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
      void onCheckTarget(stage, region);
    }, 450);
    return () => clearTimeout(timer);
  }, [file, identity, stage, region, target, isLocked, onCheckTarget]);

  const plan = planSecrets(state, resources);
  const secretsAvailable = state.secrets !== undefined;
  const secretsSet = new Set(state.secrets?.set ?? []);
  const unsaved = plan.entries.filter((entry) => !secretsSet.has(entry.name));
  const removed: RemovedSecret[] = (state.dismissedSecrets ?? []).map((name) => ({
    name,
    variable: removedNames[name] ?? name.toUpperCase()
  }));
  const hasSecretsSection = plan.entries.length > 0 || removed.length > 0;
  const secretsDone = unsaved.length === 0 || state.secrets?.confirmed === true;
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

  // Each row starts with a value where the page has one: a random one for a secret only the app uses, the `.env` value
  // for the rest. Filled once per row, so what the user typed is never replaced.
  const draftsKey = `${unsaved.map((entry) => entry.name).join(',')}|${environment?.file ?? ''}`;
  useEffect(() => {
    if (!secretsAvailable) return;
    setDrafts((current) => {
      let next: Record<string, SecretDraft | undefined> | undefined;
      for (const entry of unsaved) {
        if (current[entry.name] !== undefined) continue;
        const draft = initialDraft(entry, environment);
        if (draft === undefined) continue;
        next ??= { ...current };
        next[entry.name] = draft;
      }
      return next ?? current;
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `draftsKey` names what `unsaved` and `environment` hold.
  }, [secretsAvailable, draftsKey]);

  const saveSecrets = async (entries: readonly SecretEntry[]) => {
    for (const entry of entries) {
      // One after another: each save is its own request to the CLI, and the first failure stops the rest.
      // oxlint-disable-next-line no-await-in-loop
      const ok = await onSecret(entry.name, drafts[entry.name]?.value ?? '');
      if (!ok) break;
      setDrafts((current) => ({ ...current, [entry.name]: undefined }));
    }
  };
  const removeSecret = (secret: RemovedSecret, isRemoved: boolean) =>
    void (async () => {
      setRemoving(secret.name);
      if (isRemoved) setRemovedNames((current) => ({ ...current, [secret.name]: secret.variable }));
      await onDismissSecret(secret.name, isRemoved);
      setRemoving(undefined);
    })();

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

  const migrationOn = migrationDecision?.chosen === 'deploy-hook' || migrationDecision?.chosen === 'release-command';
  const migrationNeeded = migration !== undefined && !migrationOn && !skipMigration;

  // The stack's answer counts once it is on the page, a beat before the request that asked for it returns.
  const awsState: SectionState =
    identity === undefined || state.awsKeys?.status === 'saving' || switching
      ? 'checking'
      : !identity.available
        ? 'needs-input'
        : stage === ''
          ? 'needs-input'
          : shownTarget === undefined
            ? 'checking'
            : shownTarget.status === 'blocked' || shownTarget.status === 'unverified'
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
    ...(hasSecretsSection ? [{ id: 'secrets' as const, state: secretsState }] : []),
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
  const goTo = (id: SectionId) => {
    setOpenChoice((current) => ({ ...current, [id]: true }));
    requestAnimationFrame(() => {
      const element = document.getElementById(`deploy-${id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // The control the bar named, when the section marks one; else its first empty field or its first choice.
      const field =
        element?.querySelector<HTMLElement>('[data-next-action]:not(:disabled)') ??
        [...(element?.querySelectorAll<HTMLInputElement>('input:not([type="radio"]):not(:disabled)') ?? [])].find(
          (input) => input.value === ''
        ) ??
        element?.querySelector<HTMLElement>('input[type="radio"]:not(:disabled), input:not(:disabled)');
      field?.focus({ preventScroll: true });
    });
  };

  const notDeployable = state.composition?.deployable !== true;
  /** Nothing is left for the user. The page reads as ready while the file is rewritten and its stack checked again. */
  const settledReady =
    shownFile !== undefined &&
    awsState === 'ready' &&
    secretsDone &&
    !migrationNeeded &&
    !notDeployable &&
    stage !== '';
  /** The file is on disk and its stack checked: a deploy can start now. */
  const ready = settledReady && file !== undefined && target !== undefined;
  const expectation = expectationOf(target);
  const releaseRuns = migrationDecision?.chosen === 'release-command';
  const estimate =
    shownTarget?.status === 'updateable'
      ? 'a few minutes'
      : hasDatabase
        ? releaseRuns
          ? '12–18 min'
          : '10–15 min'
        : '3–6 min';
  const profile = state.awsProfiles?.selected;
  const commandTarget = {
    configPath: file?.filename ?? 'stacktape.yml',
    projectName: state.projectName,
    stage: stage || 'dev',
    region,
    awsAccount: state.awsAccount,
    ...(profile === undefined ? {} : { profile })
  };
  const stackName = shownTarget?.stackName ?? `${state.projectName}-${stage || 'dev'}`;

  /**
   * What the bar says while the button is off: the next thing as a verb and a count, linking to the control that does
   * it, or what is still being checked. It names what the open section asks for: the one the user opened last while it
   * needs them, else the first that does.
   */
  type Next = { text: string; section?: SectionId };
  const awsNext: Next | undefined =
    identity === undefined || switching
      ? undefined
      : identity.available
        ? stage === ''
          ? { text: 'enter a stage name', section: 'aws' }
          : awsState === 'checking'
            ? { text: 'Checking the stack, read-only…' }
            : awsState === 'blocked'
              ? { text: 'fix the stack that is in the way', section: 'aws' }
              : undefined
        : { text: identity.reason === 'rejected' ? 'sign in to AWS again' : 'connect AWS', section: 'aws' };
  const secretsNext: Next | undefined =
    secretsDone || secretsState === 'waiting'
      ? undefined
      : secretsAvailable
        ? { text: secretsNextText(unsaved, drafts), section: 'secrets' }
        : { text: `create ${unsaved.length} ${secretsNoun(unsaved.length)} in AWS`, section: 'secrets' };
  const migrationsNext: Next | undefined = migrationNeeded
    ? { text: 'choose when migrations run', section: 'migrations' }
    : undefined;
  const bySection: Record<SectionId, Next | undefined> = {
    aws: awsNext,
    secrets: secretsNext,
    migrations: migrationsNext
  };
  // Something the user can do comes before what is still being checked: the check finishes by itself.
  const firstAction = [awsNext, secretsNext, migrationsNext].find((candidate) => candidate?.section !== undefined);
  const next: Next | undefined =
    shownFile === undefined
      ? { text: `Saving ${commandTarget.configPath}…` }
      : identity === undefined || switching
        ? { text: 'Checking the AWS credentials on this machine…' }
        : ((activeSection === undefined ? undefined : bySection[activeSection]) ??
          firstAction ??
          awsNext ??
          (notDeployable ? { text: 'a gap in the configuration' } : undefined));
  const remaining = sections.filter((section) => section.state === 'needs-input' || section.state === 'blocked').length;

  const price = state.composition?.price;
  const monthly = price === undefined ? undefined : splitMonthly(price.monthly);
  const noCredentials = identity?.available === false && identity.reason === 'no-credentials';
  // A click while the file is rewritten waits for the new check, then deploys if the stack is as the page showed it.
  const [queued, setQueued] = useState<{ status: string; stackId: string | undefined } | undefined>();
  const deployNow = ready && (busy === undefined || busy === 'deploy');
  useEffect(() => {
    if (queued === undefined) return;
    if (!settledReady || isLocked) {
      setQueued(undefined);
      return;
    }
    if (!deployNow || target === undefined) return;
    setQueued(undefined);
    const stackId = target.status === 'updateable' ? target.stackId : undefined;
    if (target.status === queued.status && stackId === queued.stackId) onDeploy(stage, region, expectationOf(target));
  }, [queued, settledReady, isLocked, deployNow, target, stage, region, onDeploy]);
  // A file that could not be written again never gets its check; the click is let go, and the alert says why.
  useEffect(() => {
    if (queued === undefined) return;
    const timer = setTimeout(() => setQueued(undefined), 15_000);
    return () => clearTimeout(timer);
  }, [queued]);
  const deployButton = (className?: string) => (
    <Button
      className={className}
      disabled={!settledReady || isLocked}
      isLoading={busy === 'deploy' || queued !== undefined}
      onClick={() => {
        if (deployNow) onDeploy(stage, region, expectation);
        else if (shownTarget !== undefined) {
          setQueued({
            status: shownTarget.status,
            stackId: shownTarget.status === 'updateable' ? shownTarget.stackId : undefined
          });
        }
      }}
      variant="primary"
    >
      Deploy to {stage || 'dev'}
    </Button>
  );
  const nextLink = (inSummary: boolean) =>
    next === undefined ? undefined : next.section === undefined ? (
      <span className="w-bar-next">{next.text}</span>
    ) : (
      <span className="w-bar-next">
        <span className="w-bar-next-label">
          {inSummary && remaining > 1 ? `${remaining} things left. Next:` : 'Next:'}
        </span>{' '}
        <button className="w-link" onClick={() => goTo(next.section!)} type="button">
          {next.text}
        </button>
      </span>
    );

  const summary = (inSide: boolean) => (
    <DeploySummary
      estimate={estimate}
      isUpdate={shownTarget?.status === 'updateable'}
      region={region}
      resources={resources}
      stackName={stackName}
      state={state}
      {...(inSide
        ? {
            action: deployButton('w-summary-button'),
            footnote: settledReady ? (
              <span className="w-summary-note">AWS bills your account for these from the moment they exist.</span>
            ) : (
              nextLink(true)
            )
          }
        : {})}
    />
  );

  return (
    <div className="w-enter w-deploy">
      <header className="w-hero">
        <h1 className="w-title">{noCredentials ? 'Connect AWS to deploy' : `Deploy to ${stage || 'dev'}`}</h1>
        <p className="w-lede">
          {shownFile === undefined ? (
            'Saving the file to your project…'
          ) : (
            <>
              <span className="w-code">{shownFile.filename}</span> is saved in your project
              {shownFile.existingPath === undefined
                ? ''
                : `, beside your ${shownFile.existingPath.split(/[\\/]/).at(-1)}`}
              .
            </>
          )}
        </p>
        {!settledReady && monthly?.amount !== undefined && (
          // On a phone the bar holds only the next step while something is missing; the estimate waits here.
          <p className="w-hero-price">
            Estimated <strong>{monthly.amount}/month</strong>
            {monthly.usage ? ' + usage' : ''} on AWS
          </p>
        )}
      </header>

      <div className="w-deploy-grid">
        <div className="w-deploy-main">
          <section aria-label="Readiness" className="w-card">
            <ul className="w-checks">
              <Section
                id="aws"
                isOpen
                quietWhenReady
                state={awsState}
                title={
                  identity?.available === false && identity.reason === 'rejected'
                    ? /expired|ExpiredToken/i.test(identity.detail)
                      ? 'Your AWS session expired'
                      : 'AWS did not accept these credentials'
                    : identity?.available === false
                      ? 'Connect AWS'
                      : 'Where it deploys'
                }
              >
                {identity === undefined && !switching ? (
                  <p className="w-check-meta">Checking the AWS credentials on this machine…</p>
                ) : (
                  <>
                    {(identity?.available !== false || (state.awsProfiles?.available.length ?? 0) > 1) && (
                      <DeployTarget
                        identity={switching ? undefined : identity}
                        isLocked={isLocked}
                        isSwitching={switching}
                        onProfile={onAwsProfile}
                        onRegion={onRegion}
                        onStageChange={onStageChange}
                        region={region}
                        showRegionAndStage={identity?.available === true || switching}
                        stackLine={
                          identity?.available === true && !switching ? (
                            <TargetLine
                              commandTarget={commandTarget}
                              isRechecking={busy === 'recheck'}
                              onRecheck={onRecheck}
                              target={shownTarget}
                            />
                          ) : undefined
                        }
                        stage={stage}
                        state={state}
                      />
                    )}
                    {identity?.available === false && !switching && (
                      <AwsConnect
                        busy={busy}
                        identity={identity}
                        onAwsKeys={onAwsKeys}
                        onRecheck={onRecheck}
                        state={state}
                      />
                    )}
                  </>
                )}
              </Section>

              {hasSecretsSection && (
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
                          : plan.entries.length === 0
                            ? 'None left: the app reads no secrets now.'
                            : `All ${plan.entries.length} saved in ${identity?.available === true && identity.accountAlias !== undefined ? identity.accountAlias : 'your AWS account'}, in ${region}.`
                        : secretsState === 'waiting'
                          ? `${plan.entries.length} ${secretsNoun(plan.entries.length)} your app reads. They are saved in your AWS account.`
                          : withCode(
                              `${unsaved.length === plan.entries.length ? 'Your app reads' : 'Still to save:'} ${variableList(unsaved)}.`
                            )}
                    </p>
                  }
                  title={hasSettings ? 'Secrets and settings' : 'Secrets'}
                  titleAside={
                    secretsState === 'needs-input' && plan.entries.length > 0 ? (
                      <span className="w-check-count">
                        {plan.entries.length - unsaved.length} of {plan.entries.length} saved
                      </span>
                    ) : undefined
                  }
                >
                  {secretsAvailable ? (
                    <>
                      <p className="w-check-meta">
                        Saved in AWS Secrets Manager in your account, never sent to Stacktape.
                        <InfoTip about="secrets">
                          Your app reads each one as an environment variable. The values go from this page to the CLI on
                          this machine, and into AWS Secrets Manager in your account ({region}), which charges $0.40 a
                          month for each.
                        </InfoTip>
                      </p>
                      <SecretsList
                        canRemove={state.configEdit === undefined && !isLocked}
                        drafts={drafts}
                        environmentFile={environment?.file}
                        failure={state.secrets?.failure}
                        onConfirm={onConfirmSecrets}
                        onDraft={(name, draft) => setDrafts((current) => ({ ...current, [name]: draft }))}
                        onRemove={removeSecret}
                        onSave={saveSecrets}
                        plan={plan}
                        removed={removed}
                        removing={removing}
                        saved={secretsSet}
                        showConfirm={!secretsDone}
                      />
                    </>
                  ) : (
                    <>
                      <p className="w-check-meta">
                        Create them in {region} from a terminal. Each command asks for the value.
                      </p>
                      <CommandLine
                        command={plan.entries
                          .map((entry) => secretCommand(entry.name, region, state.awsAccount))
                          .join('\n')}
                        fill
                        label="Copy the commands that create the secrets"
                      />
                    </>
                  )}
                </Section>
              )}

              {(migration !== undefined || migrationDecision !== undefined) && (
                <MigrationSection
                  busy={busy}
                  docker={state.docker?.available}
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
                        Your app creates its tables with migrations. The new database starts empty, so something has to
                        run them before traffic arrives.
                      </InfoTip>
                    </>
                  }
                >
                  <MigrationNote message={migrationNote.message} />
                </Section>
              )}
            </ul>
          </section>

          {/* Only on a narrow screen, where the side summary has no room. */}
          {summary(false)}

          {notes.length > 0 && <Notes notes={notes} />}

          <div className="w-terminal">
            <button
              aria-controls="deploy-terminal"
              aria-expanded={showTerminal}
              className="w-disclosure"
              onClick={() => setShowTerminal(!showTerminal)}
              type="button"
            >
              <BiChevronRight aria-hidden className="w-chevron" size={16} />
              Deploy from a terminal instead
            </button>
            <Expand id="deploy-terminal" isOpen={showTerminal}>
              <CommandLine command={stackCommand('deploy', commandTarget)} fill label="Copy the deploy command" />
            </Expand>
          </div>
        </div>

        <aside className="w-deploy-side">{summary(true)}</aside>
      </div>

      <ActionBar
        align="column"
        className={settledReady ? 'is-ready' : next?.section === undefined ? 'is-blocked' : 'is-blocked has-next'}
        note={settledReady ? undefined : nextLink(false)}
        price={<MonthlyPrice state={state} suffix={monthlySuffix} />}
      >
        {!settledReady && next?.section !== undefined && (
          // On a phone the bar is this one action, full width, until Deploy can work.
          <Button className="w-bar-next-button" onClick={() => goTo(next.section!)} variant="secondary">
            {next.text.charAt(0).toUpperCase()}
            {next.text.slice(1)}
          </Button>
        )}
        {deployButton('w-big')}
      </ActionBar>
    </div>
  );
}

/**
 * One section of the readiness list: its mark, its title with where it stands, then a summary or its controls. One that
 * opens and closes does it from its whole title row, with the chevron at the end, and grows to its content.
 */
function Section({
  id,
  title,
  titleAside,
  state,
  summary,
  isOpen,
  onToggle,
  quietWhenReady = false,
  children
}: {
  id: SectionId;
  title: ReactNode;
  /** Beside the chevron, on the title line: "1 of 3 saved". */
  titleAside?: ReactNode;
  state: SectionState;
  /** One line for a closed section: how many secrets are saved, what the migration does. */
  summary?: ReactNode;
  isOpen: boolean;
  /** Absent: the section cannot be closed or opened from here. */
  onToggle?: (() => void) | undefined;
  /** No "Ready" beside the title: the controls under it already show what was chosen. */
  quietWhenReady?: boolean;
  children?: ReactNode;
}) {
  const titleId = `deploy-${id}-title`;
  return (
    <li className={`w-check is-${state}${isOpen ? ' is-open' : ''}`} id={`deploy-${id}`}>
      <div className="w-check-head">
        <StatusIcon status={STATE_ICON[state]} />
        <h2 className="w-check-title" id={titleId}>
          {title}
          {!(quietWhenReady && state === 'ready') && (
            <span className={`w-state is-${state}`}>{STATE_WORDS[state]}</span>
          )}
        </h2>
        {(titleAside !== undefined || onToggle !== undefined) && (
          <span className="w-check-aside">
            {titleAside}
            {onToggle !== undefined && (
              <button
                aria-controls={`deploy-${id}-content`}
                aria-expanded={isOpen}
                aria-labelledby={titleId}
                className="w-check-toggle"
                onClick={onToggle}
                type="button"
              >
                <BiChevronRight aria-hidden className="w-chevron" size={18} />
              </button>
            )}
          </span>
        )}
      </div>
      <div className="w-check-body">
        {summary !== undefined && <Expand isOpen={!isOpen}>{summary}</Expand>}
        {children !== undefined && (
          <Expand id={`deploy-${id}-content`} isOpen={isOpen}>
            <div className="w-check-content">{children}</div>
          </Expand>
        )}
      </div>
    </li>
  );
}

/**
 * What deploying there does to the stack, only when it changes the decision: a stack that is already there and gets
 * updated, or one that stops the deploy. A new stack, and the read-only check itself, say nothing here.
 */
function TargetLine({
  target,
  commandTarget,
  isRechecking,
  onRecheck
}: {
  target: WizardState['deployTarget'];
  commandTarget: Parameters<typeof stackCommand>[1];
  isRechecking: boolean;
  onRecheck: () => void;
}) {
  if (target === undefined || target.status === 'absent') return null;
  if (target.status === 'updateable') {
    return (
      <p className="w-target-line is-warn">
        <BiErrorCircle aria-hidden size={15} />
        <span>
          <span className="w-code">{target.stackName}</span> already exists. This deploy updates it and removes anything
          the file no longer has.
        </span>
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
        <CommandLine
          command={stackCommand(copy.fix === 'delete' ? 'delete' : 'stack recover', commandTarget)}
          fill
          label="Copy the command"
        />
      )}
      <div>
        <Button isLoading={isRechecking} onClick={onRecheck} variant="secondary">
          Check again
        </Button>
      </div>
    </div>
  );
}

/** What the user picks for when the migration runs. `release-command` and `deploy-hook` are the decision's own values. */
type MigrationChoice = 'release-command' | 'deploy-hook' | 'self' | 'unset';

/**
 * Whether the database gets its tables, and when: before each deploy goes live (a release command), right after it
 * (from this machine), or by the user. Which of the first two exist depends on what the service deploys as; a release
 * command for an SSR site needs Docker, so without it the other is recommended.
 */
function MigrationSection({
  migration,
  migrationDecision,
  resources,
  docker,
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
  /** Whether Docker answers on this machine; undefined while unknown. */
  docker: boolean | undefined;
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
  const chosen = migrationDecision?.chosen;
  const command = migration?.command ?? String(migrationDecision?.parameters.command ?? 'the migration');
  // The choice writes the hook into the generated file; a hand-edited file says it itself.
  const decisionId = migration === undefined ? migrationDecision?.id : `migration-timing:${migration.service}`;
  const canChoose = decisionId !== undefined && decisionId.startsWith('migration-timing:');
  const service =
    migration?.service ??
    (typeof migrationDecision?.parameters.serviceName === 'string'
      ? migrationDecision.parameters.serviceName
      : undefined);
  const runner = migrationRunnerOf(resources, service);
  const isOn = chosen === 'deploy-hook' || chosen === 'release-command';
  // A container service gets a release command either way; for a site the two values are two different things.
  const choice: MigrationChoice =
    chosen === 'release-command' || (chosen === 'deploy-hook' && runner === 'container')
      ? 'release-command'
      : chosen === 'deploy-hook'
        ? 'deploy-hook'
        : skipped
          ? 'self'
          : 'unset';
  const withoutDocker = runner === 'site' && docker === false;
  const title = (
    <>
      Database migrations
      <InfoTip about="database migrations">
        Your app creates its tables with migrations. The new database on AWS starts empty, so something has to run them
        before traffic arrives.
      </InfoTip>
    </>
  );
  const commandCode = <span className="w-code">{command}</span>;

  if (!canChoose) {
    return (
      <Section
        id="migrations"
        isOpen={false}
        state="ready"
        summary={
          <p className="w-check-meta">
            {commandCode} runs{' '}
            {chosen === 'service-startup'
              ? 'when the app starts'
              : chosen === 'release-command'
                ? 'before each deploy goes live'
                : chosen === 'deploy-hook'
                  ? 'on every deploy'
                  : 'when you run it yourself'}
            .
          </p>
        }
        title={title}
      />
    );
  }

  const releaseLabel = (
    <span className="w-choice-label">
      Before each deploy goes live
      {!withoutDocker && (
        <Badge size="small" tone="brand">
          Recommended
        </Badge>
      )}
    </span>
  );
  const options: Array<{
    value: Exclude<MigrationChoice, 'unset'>;
    label: ReactNode;
    description: string;
    disabled?: boolean;
  }> =
    runner === 'container'
      ? [
          {
            value: 'release-command',
            label: releaseLabel,
            description:
              "Runs in the service's new image, in your network, before it takes traffic. If it fails, the deploy stops and the running version keeps serving."
          }
        ]
      : runner === 'site'
        ? [
            {
              value: 'release-command',
              label: releaseLabel,
              description: withoutDocker
                ? 'Needs Docker to build an image of your project, and Docker is not running on this machine. Start it, then click Check again.'
                : "Runs in AWS, next to the database, as the site's release command. If it fails, the deploy stops and the running version keeps serving. Docker on this machine builds its image.",
              disabled: withoutDocker
            },
            {
              value: 'deploy-hook',
              label: (
                <span className="w-choice-label">
                  Right after each deploy
                  {withoutDocker && (
                    <Badge size="small" tone="brand">
                      Recommended
                    </Badge>
                  )}
                </span>
              ),
              description:
                'Runs from this machine once the new version is live, so its first requests can meet the old tables. Needs no Docker.'
            }
          ]
        : [
            {
              value: 'deploy-hook',
              label: (
                <span className="w-choice-label">
                  Right after each deploy
                  <Badge size="small" tone="brand">
                    Recommended
                  </Badge>
                </span>
              ),
              description: 'Runs from this machine once the new version is live.'
            }
          ];
  options.push({
    value: 'self',
    label: 'I run it myself',
    description: 'The app starts against an empty database until you do.'
  });

  return (
    <Section
      id="migrations"
      isOpen={isOpen}
      onToggle={onToggle}
      state={state}
      summary={
        <p className="w-check-meta">
          {choice === 'release-command' ? (
            <>
              Stacktape runs {commandCode} before each deploy goes live, as the {runner === 'site' ? 'site' : 'service'}
              ’s release command.
            </>
          ) : choice === 'deploy-hook' ? (
            <>Stacktape runs {commandCode} from this machine right after each deploy.</>
          ) : choice === 'self' ? (
            <>You run {commandCode} yourself.</>
          ) : (
            'The new database starts empty. Choose when its migrations run.'
          )}
        </p>
      }
      title={title}
    >
      <p className="w-check-meta">The new database starts empty. This command creates its tables:</p>
      <CommandLine command={command} fill label="Copy the migration command" />
      <Tooltip content="Your file is edited by hand. Set the release command there instead." disabled={!isHandEdited}>
        <div className="w-choices">
          <RadioGroup<Exclude<MigrationChoice, 'unset'>>
            disabled={isLocked || isHandEdited || busy === decisionId}
            label={<span className="sr-only">When the migrations run</span>}
            name="migration-runner"
            onValueChange={(value) => {
              if (value === 'self') {
                onSkip(true);
                if (isOn) onDecision(decisionId, 'manual');
                return;
              }
              onSkip(false);
              // A container service's release command is what the deploy hook already is.
              onDecision(
                decisionId,
                value === 'release-command' && runner === 'site' ? 'release-command' : 'deploy-hook'
              );
            }}
            options={options}
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
          <CommandLine command={`aws sso login${profileFlag}`} fill label="Copy the sign-in command" />
          <div className="w-relogin-actions">
            {checkAgain('primary')}
            <span className="w-quiet">After you sign in.</span>
          </div>
          <button
            aria-controls="aws-path"
            aria-expanded={otherLogin}
            className="w-disclosure w-relogin-other"
            onClick={() => setOtherLogin(!otherLogin)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-chevron" size={16} />
            Use a different AWS login
          </button>
        </div>
      )}

      <Expand id="aws-path" isOpen={showPaths}>
        <div className="w-aws-paths-body">
          <div className="w-choices w-aws-paths">
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

          <Expand isOpen={path === 'keys'}>
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
                Saved on this machine in <span className="w-code">~/.aws/credentials</span> as {profileWords}. Never
                sent to Stacktape.
                <InfoTip about="access keys">
                  Keys of an IAM user that may create resources; for a personal account, one with AdministratorAccess.
                  In the AWS console: IAM → Users → your user → Security credentials → Create access key. This is what{' '}
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
          </Expand>

          <Expand isOpen={path === 'sso'}>
            <ol className="w-steps-list w-path-body">
              <Step text="Set up the profile once. It asks for your SSO start URL.">
                <CommandLine command="aws configure sso" fill label="Copy the SSO setup command" />
              </Step>
              <Step text="Sign in. Do this again when the session expires.">
                <CommandLine command={`aws sso login${profileFlag}`} fill label="Copy the sign-in command" />
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
          </Expand>
        </div>
      </Expand>

      {identity.reason === 'no-credentials' && (
        // Someone without an account leaves this page for a while: the way there, and the way back to here.
        <div className="w-aws-new">
          <button
            aria-controls="aws-new"
            aria-expanded={creating}
            className="w-disclosure"
            onClick={() => setCreating(!creating)}
            type="button"
          >
            <BiChevronRight aria-hidden className="w-chevron" size={16} />
            No AWS account yet?
          </button>
          <Expand id="aws-new" isOpen={creating}>
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
          </Expand>
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

/**
 * What the analysis noticed that the checklist does not ask about: one folded row ("3 notes about compose.yml"), and
 * each note, opened, as what it means for the deploy, then what to do about it.
 */
function Notes({ notes }: { notes: readonly PlainNote[] }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <section aria-label="Worth a look" className={`w-notes${isOpen ? ' is-open' : ''}`}>
      <button
        aria-controls="deploy-notes"
        aria-expanded={isOpen}
        className="w-notes-head"
        onClick={() => setOpen(!isOpen)}
        type="button"
      >
        <BiErrorCircle aria-hidden className="w-notes-icon" size={17} />
        <span className="w-notes-title">
          Worth a look <span>{notesHeading(notes)}</span>
        </span>
        <BiChevronRight aria-hidden className="w-chevron" size={18} />
      </button>
      <Expand id="deploy-notes" isOpen={isOpen}>
        <ul className="w-notes-list">
          {notes.map((note) => (
            <li key={note.key}>
              <p className="w-note-title">{withCode(note.title)}</p>
              {note.body !== '' && <p className="w-note-body">{withCode(note.body)}</p>}
            </li>
          ))}
        </ul>
      </Expand>
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
      <CommandLine command={command ?? ''} fill label="Copy the migration command" />
    </>
  );
}

/**
 * The last value given for the same key, while the value is away: a file being written again, a check running again.
 * A different key (another stage, region or account) drops it.
 */
function useHeld<T>(value: T | undefined, key: string): T | undefined {
  const [held, setHeld] = useState<{ key: string; value: T } | undefined>(() =>
    value === undefined ? undefined : { key, value }
  );
  // Adjusted while rendering, as React recommends for state derived from a change: no paint without it.
  if (value !== undefined && (held?.value !== value || held.key !== key)) setHeld({ key, value });
  return value ?? (held?.key === key ? held.value : undefined);
}
