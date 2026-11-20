/**
 * The wizard session: one run of the mission, watched from a browser.
 *
 * Nothing here asks the user anything. Composition decides every open question using its
 * recommended answer, and this layer's job is to show what was decided and let it be *changed* —
 * which is a different interaction with a different cost. A question stops someone; a decision they
 * can see and reverse does not.
 *
 * Changes are applied to *facts*, never to the configuration. Editing the output directly would put
 * the user's decision and the composer's reasoning out of step, so the next recomposition would
 * quietly undo it. Amending the input keeps one source of truth and keeps the configuration
 * explainable, which is the whole point of carrying provenance around.
 */

import { parse as parseYaml } from 'yaml';
import { composeConfig, type CompositionResult } from '@stacktape/config-inference/compose';
import versionJson from '@generated/db-engine-versions/versions.json' with { type: 'json' };
import type { InfrastructureMode } from '@stacktape/config-inference/compose/modes';
import {
  DEPLOYMENT_PREFERENCE_OPTIONS,
  type DeploymentPreferenceChange,
  type DeploymentPreferenceKey,
  type DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import type { ProjectFacts } from '@stacktape/config-inference/facts';
import type { AgentEvent } from '../agent/transport';
import type { GreenfieldResult } from '../missions/greenfield';
import { summariseFailure, type DeployFailure } from '../deploy/failure';
import type { JsonlEvent } from '@application-services/tui-manager/output/jsonl-types';
import { getStackName } from '@stacktape/naming/stacks';
import { SUPPORTED_AWS_REGIONS } from '@stacktape/config/aws-regions';
import type { DeployTargetExpectation, DeployTargetObservation } from '../deploy/stack-expectation';
import { DEFAULT_PRICING_REGION, estimateMonthlyCost, formatMonthlyDelta, type PriceEstimate } from '../pricing';
import { renderTypeScript, renderYaml } from '../write-config';
import type { PreflightResult } from '../preflight/preflight';
import { createWizardSignIn, type WizardSignInDependencies, type WizardSignInFlow } from './wizard-sign-in';
import { readSeenFile, seenFilePaths } from './file-view';
import { readRepositoryTree, type RepositoryTree } from './repository-tree';
import { readEnvironmentValues } from './environment-values';
import { evaluateTypescriptConfig } from './typescript-config';
import type { TemplatePreviewRequest, TemplatePreviewResult } from '../template-preview/protocol';
import { requiredSecretVariables } from '@stacktape/config-inference/compose/required-secrets';
import {
  startWizardServer,
  type WizardAgentOption,
  type WizardAwsIdentity,
  type WizardDeployment,
  type WizardServer,
  type WizardState,
  type WizardTemplatePreview,
  type WizardVerification
} from './wizard-server';

/** How often the page hears about a running deploy. Fast enough to feel live, slow enough to be cheap. */
const PROGRESS_PUBLISH_INTERVAL_MS = 200;

/**
 * How much of a deploy the state carries.
 *
 * A deploy of a large stack emits thousands of events; keeping every one would make each publish
 * larger than the last. These caps keep the tail — which is the part anyone watching is reading —
 * and the terminal still has the whole thing.
 */
const MAX_DEPLOY_EVENTS = 600;
const MAX_DEPLOY_LINES = 400;

/**
 * How many times a deploy may be attempted in total.
 *
 * Two repairs, three attempts. Past that the agent is guessing: if two goes at the same error have
 * not fixed it, a third is unlikely to, and the user is better served by the real error than by
 * another two minutes of watching.
 */
const MAX_DEPLOY_ATTEMPTS = 3;

/** Resource kinds whose typed `url` parameter is a public application entry point. */
const PUBLIC_URL_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  'web-service',
  'nextjs-web',
  'nuxt-web',
  'sveltekit-web',
  'astro-web',
  'remix-web',
  'solid-start-web',
  'hosting-bucket',
  'http-api-gateway',
  'application-load-balancer'
]);

/** Which top-level resources differ between two compositions — added, removed, or rewritten. */
const changedResourceNames = (before: CompositionResult | undefined, after: CompositionResult): string[] => {
  const beforeResources: Record<string, unknown> = before?.config.resources ?? {};
  const afterResources: Record<string, unknown> = after.config.resources;
  const names = new Set([...Object.keys(beforeResources), ...Object.keys(afterResources)]);
  return [...names].filter((name) => JSON.stringify(beforeResources[name]) !== JSON.stringify(afterResources[name]));
};

export type WizardSession = {
  server: WizardServer;
  /** The current facts, after every answer applied so far. Undefined until the mission finishes. */
  currentFacts: () => ProjectFacts | undefined;
  close: () => Promise<void>;
};

/**
 * Serve one mission, recomposing whenever the user answers something.
 *
 * The wizard opens *before* anything is read. Reading a project spends the user's own agent
 * subscription and takes tens of seconds, so it starts when they press the button — not because a
 * command was typed. Until then the page sits on `ready`, showing what is about to happen and which
 * agent will do it.
 */
export const startWizardSession = async ({
  projectName,
  repositoryPath,
  repositoryRoot = repositoryPath,
  existingConfig,
  awsAccount,
  consoleUrl,
  agents = [],
  result,
  start,
  write,
  deploy,
  inspectDeployTarget,
  verify,
  repair,
  awsIdentity,
  machineRegion,
  stacktapeAccount,
  signIn,
  connectConsole,
  gitHost,
  writePipeline,
  codingAgentSetup,
  mode: initialMode,
  preferences: initialPreferences,
  timeline = [],
  staticRoot,
  watchStatic,
  configSchemaPath,
  setSecret,
  createAwsProfile,
  templatePreview,
  nearbyApps,
  nearbyAppKinds
}: {
  projectName: string;
  /** Shown on the first screen so the user can see exactly which directory will be read. */
  repositoryPath?: string;
  /**
   * Where the repository is on disk, for showing the page the files the analysis looked at. Defaults to
   * `repositoryPath`; a fixture shows one path and reads another. Absent, the page shows no file content.
   */
  repositoryRoot?: string;
  /** A configuration already in the repository. Never modified; the page names it before writing. */
  existingConfig?: string;
  /** The `--awsAccount` this run was started with, so commands the page hands out target the same account. */
  awsAccount?: string;
  /** The Console the CLI talks to, without a trailing slash, for the page's Console links. */
  consoleUrl?: string;
  /** Ways of reading the project, best first. Offered before anything runs. */
  agents?: WizardAgentOption[];
  /** A finished mission. Supplied instead of `start` when there is nothing left to run. */
  result?: GreenfieldResult;
  /**
   * Runs the mission for the choice the user made.
   *
   * Takes the progress callback rather than reaching for the session, which does not exist yet when
   * this is supplied.
   */
  start?: (
    choice: { agentId: string; modelId: string },
    onProgress: (entry: { kind: string; label: string }) => void
  ) => Promise<GreenfieldResult>;
  /**
   * Writes the composed configuration to the repository and reports where it landed.
   *
   * The session holds the composition — recomposed after every answer — so the writer is handed one
   * rather than fetching it: the file must be the configuration the user just looked at.
   */
  write?: (input: {
    composition: CompositionResult;
    format: 'yaml' | 'typescript';
    /** Region the file declares. The Deploy step then deploys there; changing it means editing the file. */
    region?: string;
    /** The user's hand-edited file in `format`, written as it is instead of rendering the composition. */
    contents?: string;
    /** The file this session wrote before, replaced rather than kept as the user's own configuration. */
    replaces?: string;
  }) => Promise<{ path: string; filename: string; existingPath?: string; region?: string }>;
  /**
   * Deploys the written configuration, reporting the CLI's own event stream as it goes.
   *
   * Resolves when the deploy has finished. The session keeps the page updated meanwhile through the
   * callbacks, so this promise is only how it learns the outcome.
   */
  deploy?: (input: {
    configFile: { path: string; filename: string };
    stage: string;
    region: string;
    /**
     * Keep whatever was created when this attempt fails.
     *
     * Only ever set on a retry, and only once the stack exists. Other attempts roll back, so a
     * failed first deploy removes its stack, which is what the wizard's consent check and recovery
     * screens expect. A failed *update* ends in `UPDATE_FAILED`, which is directly deployable, so
     * there the partial progress is real: the database that took eight minutes is still there for
     * the next attempt.
     */
    keepPartialProgress?: boolean;
    /** Consent bound to the account/name/region and, for an update, the exact existing StackId. */
    targetExpectation?: DeployTargetExpectation;
    /** Public resources whose deployed, typed `url` parameters should be shown after success. */
    urlResourceNames: string[];
    onEvent: (event: unknown) => void;
    onLine: (line: string) => void;
    onCommand: (commandLine: string) => void;
  }) => Promise<{ ok: boolean; code: string; message: string; urls?: Array<{ resourceName: string; url: string }> }>;
  /** Probe in a child that resolves the same connected account/profile as the deploy child. */
  inspectDeployTarget?: (input: {
    configFile: { path: string; filename: string };
    stage: string;
    region: string;
  }) => Promise<DeployTargetObservation | undefined>;
  /**
   * Tries the composed services on this machine — build them, start them, watch what happens.
   *
   * Only ever called after the user clicked for it: running repository code is a permission, and
   * the session never grants it on their behalf. Absent when the caller has no way to verify,
   * which removes the offer rather than degrading it.
   */
  verify?: (input: { facts: ProjectFacts; composition: CompositionResult }) => Promise<PreflightResult>;
  /**
   * Asks the agent what we got wrong about the repository, given a failure.
   *
   * Absent when no agent is available, which turns the repair loop off rather than degrading it:
   * the probes cannot learn anything from a deploy error, so a repair without an agent would be a
   * second identical attempt.
   */
  repair?: (input: {
    facts: ProjectFacts;
    decisions: Record<string, string>;
    preferences: DeploymentPreferences;
    failure: DeployFailure;
    onProgress: (entry: { kind: string; label: string }) => void;
  }) => Promise<{ facts: ProjectFacts; composition: CompositionResult; changed: boolean }>;
  /** Resolves who this machine is to AWS. Awaited lazily, so a slow answer never delays the page. */
  awsIdentity?: () => Promise<WizardAwsIdentity>;
  /**
   * The region this machine's AWS setup names, resolved the way the CLI resolves it (`AWS_DEFAULT_REGION`,
   * `AWS_REGION`, the machine-wide Stacktape default, the AWS profile). The file declares it unless the user picks
   * another region or the identity check reports one.
   */
  machineRegion?: string;
  /**
   * Whether this machine is signed in to Stacktape. Neither step needs it: signed in, the deploy is recorded in the
   * Console and the page links there; signed out, it runs on local AWS credentials and the page offers the Console.
   */
  stacktapeAccount?: () => Promise<NonNullable<WizardState['stacktapeAccount']>>;
  /**
   * How to sign in to Stacktape without leaving the page.
   *
   * Absent when the caller cannot — the page then says to use `stacktape login` in a terminal, and
   * the recheck notices when that has been done.
   */
  signIn?: WizardSignInDependencies;
  /**
   * Connects the AWS account of this machine's credentials to the signed-in organization (`stacktape connect`), so the
   * stacks deployed without an account appear in the Console. Never redeploys. Absent when the session cannot; the
   * page then hands out the command.
   */
  connectConsole?: () => Promise<{ ok: boolean; detail: string }>;
  /** The git host this project pushes to, when it is one we generate a pipeline for. */
  gitHost?: 'github' | 'gitlab' | 'bitbucket';
  /** How much infrastructure to compose for. Chosen on the first screen, before anything is read. */
  mode?: InfrastructureMode;
  /** Explicit preference overrides used by non-browser callers or a restored wizard session. */
  preferences?: Partial<DeploymentPreferences>;
  /** Writes a deployment pipeline for that host, and reports what the user must set up on it. */
  writePipeline?: (input: {
    configFile: { filename: string };
    stage: string;
    region: string;
  }) => Promise<NonNullable<WizardState['pipeline']>>;
  /**
   * Connects a coding agent to Stacktape (`stacktape mcp:add` for one agent). Absent in sessions that cannot change
   * the user's agent configuration; the page then offers nothing.
   */
  codingAgentSetup?: {
    /** The agent's name and the terminal command for the same change, or undefined for an agent it cannot set up. */
    describe: (agentId: string) => { label: string; command: string } | undefined;
    setUp: (agentId: string) => Promise<{ ok: boolean; detail: string }>;
  };
  timeline?: Array<{ kind: string; label: string }>;
  /** Directory holding the built wizard bundle. */
  staticRoot?: string;
  /** Reload connected pages when that bundle changes. For working on the wizard itself. */
  watchStatic?: boolean;
  /** The Stacktape config JSON schema the page's YAML editor uses for hover docs, completion and validation. */
  configSchemaPath?: string;
  /**
   * Stores one secret in the user's AWS account the way `stacktape secret set` does. The value goes to that command
   * and nowhere else: not to the state, not to a log, not to Stacktape. Absent, the page shows the commands instead.
   */
  setSecret?: (input: { name: string; value: string; region: string }) => Promise<{ ok: boolean; detail: string }>;
  /**
   * Saves pasted AWS access keys as a profile on this machine, like `stacktape aws-profile:create`, and says which
   * profile it wrote. The identity is checked again afterwards. Absent, the page explains the terminal way only.
   */
  createAwsProfile?: (input: {
    accessKeyId: string;
    secretAccessKey: string;
  }) => Promise<{ ok: boolean; detail: string; profile?: string }>;
  /**
   * Compiles the CloudFormation template for a configuration without AWS (`template-preview/compile.ts`), for the
   * page's read-only template view. Absent, the page offers no template.
   */
  templatePreview?: (request: TemplatePreviewRequest) => Promise<TemplatePreviewResult>;
  /** Folders below the project that look like apps of their own, offered when the analysis finds nothing to run. */
  nearbyApps?: string[];
  /** What each nearby folder is written in, by folder, when its marker files say ("Node.js", "Go"). */
  nearbyAppKinds?: Record<string, string>;
}): Promise<WizardSession> => {
  let facts = result?.facts;
  let composition = result?.composition;
  /**
   * The configuration as edited by hand. While set, it is the file that is written and deployed. A TypeScript edit
   * carries the text and, as `yaml`, the configuration it evaluated to last.
   */
  let configEdit: NonNullable<WizardState['configEdit']> | undefined;
  /** Counts edits, so an evaluation that finishes after a newer edit arrived is dropped. */
  let configEditCount = 0;
  /** Compiled templates by what they were compiled from, newest last: the page asks again after every change. */
  const templates = new Map<string, Promise<WizardTemplatePreview>>();
  /** Secrets set from the page this session; the values themselves are never kept. */
  const secretsSet = new Set<string>();
  let secretsConfirmed = false;
  /** The file this session last wrote, which a later save replaces. */
  let ownFile: string | undefined;
  let secretFailure: { name: string; detail: string } | undefined;
  let awsKeys: WizardState['awsKeys'];
  let price: PriceEstimate | undefined;
  /** The last price request came back empty, so the page says so instead of waiting for it. */
  let priceUnavailable = false;
  /** The configuration as text, exactly as writing it would produce. Shown on the Review step. */
  let configText: { yaml: string; typescript?: string } | undefined =
    composition === undefined ? undefined : { yaml: renderYaml(composition) };

  /**
   * Fetch the price for whatever is composed now, and publish it when it arrives.
   *
   * Deliberately not awaited by its callers. The review screen renders from the composition, which
   * exists already; the price appears a moment later. A caller that awaited this would make every
   * decision change wait on a network round trip.
   */
  const repriceInBackground = (): void => {
    const current = composition;
    if (current === undefined) return;
    // Quoted where the file deploys.
    const region = declaredRegion();
    price = undefined;
    priceUnavailable = false;
    if (configEdit !== undefined) {
      // The edited text is what deploys, so it is what gets priced. Its choices have no alternatives to compare.
      const edit = configEdit;
      if (edit.error !== undefined) return;
      void estimateMonthlyCost(edit.yaml, regionOfText(edit.yaml) ?? region).then((estimate) => {
        if (configEdit !== edit) return;
        price = estimate;
        priceUnavailable = estimate === undefined;
        publish(buildState());
      });
      return;
    }
    void priceWithOptions(current, region).then((estimate) => {
      // Another recomposition or region may have come in while this was in flight. Its own call publishes.
      if (composition !== current || declaredRegion() !== region) return;
      price = estimate;
      priceUnavailable = estimate === undefined;
      publish(buildState());
    });
  };

  /**
   * The price, and what every other answer to each infrastructure choice would change it by.
   *
   * A choice card that says "Roughly doubles them" makes the developer guess. Each alternative is
   * the same facts and decisions composed with one choice changed, priced the same way. An
   * alternative that composes to the same file costs the same and needs no request, so a project
   * without a database never prices the database choices.
   */
  const priceWithOptions = async (
    current: CompositionResult,
    region: string | undefined
  ): Promise<PriceEstimate | undefined> => {
    const baseYaml = renderYaml(current);
    const base = await estimateMonthlyCost(baseYaml, region);
    if (base?.flatMonthly === undefined || facts === undefined) return base;
    const baseFlat = base.flatMonthly;
    const currentFacts = facts;
    const alternatives = (Object.keys(DEPLOYMENT_PREFERENCE_OPTIONS) as DeploymentPreferenceKey[]).flatMap((key) =>
      DEPLOYMENT_PREFERENCE_OPTIONS[key]
        .filter((value) => value !== current.preferences[key])
        .map((value) => ({ key, value }))
    );
    const priced = await Promise.all(
      alternatives.map(async ({ key, value }) => {
        const alternative = composeConfig({
          facts: currentFacts,
          projectName,
          preferences: { ...current.preferences, [key]: value },
          decisions: answers,
          engineVersions: versionJson.rds
        });
        const yaml = renderYaml(alternative);
        if (yaml === baseYaml) return { key, value, delta: 0 };
        const estimate = await estimateMonthlyCost(yaml, region);
        return { key, value, delta: estimate?.flatMonthly === undefined ? undefined : estimate.flatMonthly - baseFlat };
      })
    );
    const options: Record<string, Record<string, string>> = {};
    for (const { key, value, delta } of priced) {
      if (delta === undefined) continue;
      options[key] = { ...options[key], [value]: formatMonthlyDelta(delta) };
    }
    return { ...base, options };
  };

  /**
   * Infrastructure choices that change nothing in this app: every other answer composes the same
   * file. The page does not ask them (an app pinned to one copy by its SQLite disk has no second
   * copy to keep online).
   */
  const choicesWithoutEffect = (current: CompositionResult): DeploymentPreferenceKey[] => {
    if (facts === undefined) return [];
    const currentFacts = facts;
    const baseYaml = renderYaml(current);
    return (Object.keys(DEPLOYMENT_PREFERENCE_OPTIONS) as DeploymentPreferenceKey[]).filter((key) =>
      DEPLOYMENT_PREFERENCE_OPTIONS[key]
        .filter((value) => value !== current.preferences[key])
        .every(
          (value) =>
            renderYaml(
              composeConfig({
                facts: currentFacts,
                projectName,
                preferences: { ...current.preferences, [key]: value },
                decisions: answers,
                engineVersions: versionJson.rds
              })
            ) === baseYaml
        )
    );
  };
  /** Worked out once per composition: each answer is a full composition, and state is built often. */
  let inertChoices: { of: CompositionResult; keys: DeploymentPreferenceKey[] } | undefined;
  const inertChoicesOf = (current: CompositionResult): DeploymentPreferenceKey[] => {
    if (inertChoices?.of !== current) inertChoices = { of: current, keys: choicesWithoutEffect(current) };
    return inertChoices.keys;
  };

  /**
   * Adopt a new composition, and refresh everything derived from it.
   *
   * The one door for composition changes — the first result, a changed decision or preference, a
   * repair — so nothing showing a derivative of the configuration can be looking at a stale one.
   * YAML is rendered inline because it is a string join; the TypeScript rendering runs Prettier, so
   * it arrives a beat later, like the price.
   */
  const adoptComposition = (next: NonNullable<typeof composition>): void => {
    composition = next;
    // A different configuration is a different thing to prove. Results earned against the old one
    // must neither gate nor vouch for the new one. The file on disk is another derivative: keeping
    // its handle would let a direct mode/answer request show one configuration while deploy reads
    // the previously written one.
    verification = undefined;
    deployTarget = undefined;
    configFile = undefined;
    configEdit = undefined;
    renderConfigText(next);
    // The request that caused this change gets the new state in its response, but other connected
    // tabs only hear broadcasts. Publish the synchronous YAML state now rather than making them
    // wait for pricing or TypeScript rendering to finish successfully.
    publish(buildState());
    repriceInBackground();
  };
  /** The preview shows the file exactly as writing it would produce it, region included. */
  const renderConfigText = (next: NonNullable<typeof composition>): void => {
    const region = declaredRegion();
    configTextRegion = region;
    configText = { yaml: renderYaml(next, { region }) };
    void renderTypeScript(next, { region }).then((text) => {
      if (composition !== next || configTextRegion !== region || configText === undefined) return;
      configText = { ...configText, typescript: text };
      publish(buildState());
    });
  };
  /**
   * Re-render the preview and the price when the region the file would declare has changed: the identity check
   * answered late, a recheck found another region, or the user picked one. The caller publishes.
   */
  const followDeclaredRegion = (): void => {
    if (composition === undefined || declaredRegion() === configTextRegion) return;
    renderConfigText(composition);
    repriceInBackground();
  };
  let failure: string | undefined;
  let choice: { agentId: string; modelId: string } | undefined;
  let running = false;
  let configFile: WizardState['configFile'];
  let identity: WizardAwsIdentity | undefined;
  /** The region the previewed configuration declares; the written file declares the same one. */
  let configTextRegion: string | undefined;
  /** The region the user picked before the file was written, kept once a file declares it. */
  let chosenRegion: string | undefined;
  /**
   * The region the file declares, or would declare if written now: the written file's, the user's pick, the region the
   * identity check reports, the region this machine's AWS setup names, otherwise the one prices use. Computed on use,
   * because the identity answers after the page has rendered.
   */
  const declaredRegion = (): string =>
    configFile?.region ??
    chosenRegion ??
    (identity?.available ? identity.region : undefined) ??
    machineRegion ??
    DEFAULT_PRICING_REGION;
  let account: WizardState['stacktapeAccount'];
  /** The account check in flight, if any, so a deploy can wait for its answer instead of guessing. */
  let accountCheck: Promise<void> | undefined;
  /** Whether the latest deploy ran signed in, which decides between the Console link and the Console offer. */
  let deployedSignedIn = false;
  /** How far the Console offer after an account-free deploy has got. Kept across redeploys. */
  let connection: Exclude<NonNullable<WizardState['consoleConnection']>['status'], 'linked'> = 'offered';
  let connectionDetail = '';
  /** Set once the server exists. Its step is published; what it holds to authenticate never is. */
  let signInFlow: WizardSignInFlow | undefined;
  let deployment: WizardDeployment | undefined;
  let deployTarget: WizardState['deployTarget'];
  let checkingDeployTarget = false;
  let pipeline: WizardState['pipeline'];
  /** Setup progress for one agent; a different chosen agent starts from the offer again. */
  let agentSetup: {
    agentId?: string;
    status: NonNullable<WizardState['codingAgentSetup']>['status'];
    detail?: string;
  } = { status: 'offered' };
  let mode: InfrastructureMode | undefined = initialMode;
  let verification: WizardVerification | undefined;
  const answers: Record<string, string> = {};

  /**
   * Whether the local try-out holds the deploy button.
   *
   * Only two states do: a run still in progress, and a *proven* failure the user has not set
   * aside. `unavailable` and `inconclusive` never block — the machinery failing to answer is not
   * the user's failure, and the agreed gate blocks on evidence, never on absence of it.
   */
  const verificationBlocksDeploy = (): boolean =>
    verification?.status === 'running' ||
    verification?.status === 'repairing' ||
    (verification?.status === 'completed' &&
      (verification.services ?? []).some((service) => service.status === 'failed'));

  /**
   * Try the composed services on this machine, and — once, with permission already standing — let
   * the agent fix what provably failed.
   *
   * The local half of the same loop a failed deploy runs, and materially cheaper: a counterexample
   * from a container on this machine costs seconds and no AWS spend. `allowRepair` is consumed by
   * the first repair — a fix that did not fix it stops here rather than looping, exactly like the
   * deploy loop's attempt cap.
   */
  const startVerification = (allowRepair: boolean): void => {
    // Nothing to try before a composition exists, no way to try without a verifier, and a second
    // click while one runs must not start a second build. All answered by doing nothing; the state
    // the page gets back says what is actually happening.
    if (verify === undefined || facts === undefined || composition === undefined) return;
    if (verification?.status === 'running' || verification?.status === 'repairing') return;

    verification = { status: 'running' };
    publish(buildState());

    // Captured so a result earned against this composition can be recognised as stale if a
    // decision changes while the build runs. `adoptComposition` clears `verification`; a late
    // result for the old configuration must not resurrect it against the new one.
    const current = composition;
    void verify({ facts, composition: current }).then(
      async (result) => {
        if (composition !== current) return;
        if (result.status === 'unavailable') {
          verification = { status: 'unavailable' };
          publish(buildState());
          return;
        }

        const failed = result.services.filter((service) => service.status === 'failed');
        const canRepair =
          allowRepair &&
          failed.length > 0 &&
          repair !== undefined &&
          facts !== undefined &&
          // The same rule as the deploy loop: "Files only" was an explicit decision that no agent
          // reads this code, and a failed try-out does not revoke it.
          choice?.agentId !== 'none';

        if (!canRepair) {
          verification = { status: 'completed', services: result.services };
          publish(buildState());
          return;
        }

        verification = { status: 'repairing', services: result.services };
        publish(buildState());

        // The failure in the shape the repair mission already speaks. Container output stays local:
        // application logs can contain runtime secrets that were never present in the repository,
        // and consent to let an agent read source is not consent to send those values as a prompt.
        // The structured missing-variable names and service reasons carry the actionable evidence.
        const failure: DeployFailure = {
          code: 'PREFLIGHT_FAILED',
          message: `${failed.map((service) => service.serviceName).join(', ')} did not start in the local try-out.`,
          errors: failed.flatMap((service) => [
            service.reason,
            ...service.observations.missingEnvironmentVariables.map((name) => `${name} is not set`)
          ]),
          output: [],
          failedResources: failed.map((service) => service.resourceName),
          worthRetrying: true
        };

        const repaired = await repair!({
          facts: facts!,
          decisions: answers,
          preferences: current.preferences,
          failure,
          onProgress: (entry) => {
            timeline.push(entry);
            publish(buildState());
          }
        }).catch(() => undefined);

        if (composition !== current) return;
        if (repaired === undefined || !repaired.changed) {
          // Nothing learned. The failure stands, visibly, rather than being retried into.
          verification = { status: 'completed', services: result.services };
          publish(buildState());
          return;
        }

        const previousConfigFile = configFile;
        facts = repaired.facts;
        adoptComposition(repaired.composition);
        if (write !== undefined && previousConfigFile !== undefined) {
          const written = await write({
            composition: repaired.composition,
            format: previousConfigFile.format,
            region: previousConfigFile.region
          }).catch(() => undefined);
          if (written !== undefined) configFile = { ...previousConfigFile, ...written };
        }
        publish(buildState());
        // One more look, and only one: the repair either proved itself here or the user sees why not.
        startVerification(false);
      },
      () => {
        // The machinery failing is never reported as the user's failure.
        if (composition !== current) return;
        verification = { status: 'unavailable' };
        publish(buildState());
      }
    );
  };

  const codingAgentSetupState = (): Pick<WizardState, 'codingAgentSetup'> => {
    // Offered once there is something deployed for the agent to work with.
    if (choice === undefined || deployment?.status !== 'succeeded') return {};
    const described = codingAgentSetup?.describe(choice.agentId);
    if (described === undefined) return {};
    return {
      codingAgentSetup: {
        agentId: choice.agentId,
        ...described,
        ...(agentSetup.agentId === choice.agentId
          ? { status: agentSetup.status, ...(agentSetup.detail === undefined ? {} : { detail: agentSetup.detail }) }
          : { status: 'offered' as const })
      }
    };
  };

  const consoleConnectionState = (): Pick<WizardState, 'consoleConnection'> => {
    if (deployment?.status !== 'succeeded') return {};
    // A session that does not check the account cannot know; it links, as it always did.
    if (stacktapeAccount === undefined || deployedSignedIn) return { consoleConnection: { status: 'linked' } };
    return {
      consoleConnection:
        connection === 'failed' ? { status: 'failed', detail: connectionDetail } : { status: connection }
    };
  };

  const buildState = (): WizardState => ({
    phase:
      failure !== undefined
        ? 'failed'
        : composition !== undefined
          ? 'reviewing'
          : running || start === undefined
            ? 'analysing'
            : 'ready',
    projectName,
    ...(repositoryPath === undefined ? {} : { repositoryPath }),
    ...(existingConfig === undefined ? {} : { existingConfig }),
    ...(awsAccount === undefined ? {} : { awsAccount }),
    ...(consoleUrl === undefined ? {} : { consoleUrl }),
    ...(agents.length === 0 ? {} : { agents }),
    ...(choice === undefined ? {} : { choice }),
    ...(configFile === undefined ? {} : { configFile }),
    region: declaredRegion(),
    ...(identity === undefined ? {} : { awsIdentity: identity }),
    ...(account === undefined ? {} : { stacktapeAccount: account }),
    // Only while signed out: once the account check passes there is no step left to render.
    ...(signInFlow === undefined || account?.signedIn === true ? {} : { signIn: signInFlow.state() }),
    ...(deployment === undefined ? {} : { deployment }),
    ...(deployTarget === undefined ? {} : { deployTarget }),
    ...(verification === undefined ? {} : { verification }),
    ...(gitHost === undefined ? {} : { gitHost }),
    ...(mode === undefined ? {} : { mode }),
    ...(composition === undefined
      ? {}
      : {
          preferences: composition.preferences,
          recommendedPreferences: composition.recommendedPreferences
        }),
    ...(pipeline === undefined ? {} : { pipeline }),
    ...(configEdit === undefined ? {} : { configEdit }),
    ...(setSecret === undefined
      ? {}
      : {
          secrets: {
            set: [...secretsSet],
            confirmed: secretsConfirmed,
            ...(secretFailure === undefined ? {} : { failure: secretFailure })
          }
        }),
    ...(awsKeys === undefined ? {} : { awsKeys }),
    ...(nearbyApps === undefined || nearbyApps.length === 0 ? {} : { nearbyApps }),
    ...(nearbyAppKinds === undefined || Object.keys(nearbyAppKinds).length === 0 ? {} : { nearbyAppKinds }),
    ...codingAgentSetupState(),
    ...consoleConnectionState(),
    timeline,
    // Absent, rather than empty, while the mission runs: an empty facts object is indistinguishable
    // from "we looked and found nothing", which is a different and much more alarming answer.
    ...(facts === undefined || composition === undefined
      ? {}
      : {
          facts: {
            services: facts.services,
            dependencies: facts.dependencies,
            // Tool labels only — enough for the page to say "you already deploy with X", and for
            // the session summary to count it, without shipping the evidence twice.
            existingDeployments: facts.existingDeployments.map((entry) => ({
              tool: entry.tool,
              managesAws: entry.managesAws
            })),
            // From the composition, which carries the facts' own questions plus any it raised itself.
            decisions: composition.assumptions
          },
          composition: {
            resources: composition.config.resources,
            provenance: composition.provenance,
            gaps: composition.gaps,
            unsetSettings: composition.unsetSettings,
            deployable: composition.deployable,
            ...(price === undefined ? {} : { price }),
            ...(priceUnavailable ? { priceUnavailable } : {}),
            ...(inertChoicesOf(composition).length === 0 ? {} : { inertChoices: inertChoicesOf(composition) }),
            // The file exactly as writing it would produce it, so the page shows the real artifact
            // rather than a re-rendering that could disagree with it.
            ...(configText === undefined ? {} : { configText })
          }
        }),
    answers,
    ...(failure === undefined ? {} : { error: failure })
  });

  /**
   * Publishes the current state and returns it as published, with its revision. The page drops a reply older than
   * what it holds, so a reply without a revision would be ignored.
   */
  const publishNow = (): WizardState => {
    publish(buildState());
    return currentPublished();
  };
  let currentPublished: () => WizardState = buildState;

  const deploymentInFlight = (): boolean => deployment?.status === 'running' || deployment?.status === 'repairing';

  /** Set once the server exists, so the mission can push progress after the start request returns. */
  let publish: (state: WizardState) => void = () => {};

  const noteProgress = (entry: { kind: string; label: string }) => {
    timeline.push(entry);
    publish(buildState());
  };

  /** Ask AWS who this machine is, again if asked: a failure to ask is a failure to answer. */
  const resolveIdentity = async (): Promise<void> => {
    if (awsIdentity === undefined) return;
    try {
      identity = await awsIdentity();
    } catch {
      identity = { available: false, reason: 'rejected', detail: 'Could not check AWS credentials.' };
    }
    followDeclaredRegion();
    publish(buildState());
  };

  /** Connects the AWS account to the Console, once signed in. Answers over the event stream. */
  const startConnecting = () => {
    if (connection === 'connecting' || connection === 'connected') return;
    connection = 'connecting';
    publish(buildState());
    void (async () => {
      const outcome =
        connectConsole === undefined
          ? { ok: false, detail: 'This session cannot connect the account from the page.' }
          : await connectConsole().catch((error: unknown) => ({
              ok: false,
              detail: error instanceof Error ? error.message : String(error)
            }));
      // Set aside while it ran: the user said not now, so the result is not pushed at them.
      if (connection !== 'connecting') return;
      connection = outcome.ok ? 'connected' : 'failed';
      connectionDetail = outcome.detail;
      publish(buildState());
    })();
  };

  const checkAccount = async (): Promise<void> => {
    if (stacktapeAccount === undefined) return;
    try {
      account = await stacktapeAccount();
    } catch {
      account = { signedIn: false, detail: 'Could not check the Stacktape account.' };
    }
    // Signed in — from this page, or in a terminal while it was open. Either way an attempt still
    // in progress here has nothing left to do, and what it was holding is dropped.
    if (account.signedIn) signInFlow?.reset();
    // Signing in was the first half of connecting from the Console offer; the second follows by itself.
    if (account.signedIn && connection === 'signing-in') startConnecting();
    publish(buildState());
  };

  const resolveAccount = (): Promise<void> => {
    const check = checkAccount();
    accountCheck = check;
    return check;
  };

  if (signIn !== undefined) {
    signInFlow = createWizardSignIn({
      dependencies: signIn,
      onChange: () => publish(buildState()),
      confirmAccount: async () => {
        // Cleared first, as a recheck does: the page shows "checking" rather than the old answer.
        // The deploy target goes too, because a different account can mean a different AWS account.
        account = undefined;
        deployTarget = undefined;
        publish(buildState());
        await resolveAccount();
        return account ?? { signedIn: false, detail: 'The account could not be checked.' };
      }
    });
  }

  /** The repository's file names, listed on the page's first request for them. */
  let repositoryTree: Promise<RepositoryTree> | undefined;

  const server = await startWizardServer({
    initialState: buildState(),
    ...(staticRoot === undefined ? {} : { staticRoot }),
    ...(watchStatic === undefined ? {} : { watchStatic }),
    ...(configSchemaPath === undefined ? {} : { configSchemaPath }),
    hooks: {
      onRecheck: async () => {
        // Cleared first, so the page shows "checking…" rather than yesterday's answer while it waits.
        identity = undefined;
        account = undefined;
        deployTarget = undefined;
        publish(buildState());
        await Promise.all([resolveIdentity(), resolveAccount()]);
        return buildState();
      },
      onStart: (requested) => {
        // Both ids are looked up in the lists this session published. Nothing typed in a browser
        // reaches an argument list; an unknown id is a rejected request, not a new option.
        const agent = agents.find((option) => option.id === requested.agentId);
        if (agent === undefined) {
          throw new Error('That is not one of the agents offered for this run.');
        }
        if (!agent.models.some((model) => model.id === requested.modelId)) {
          throw new Error('That is not one of the models offered for this agent.');
        }
        // Idempotent rather than an error: a double-click, or a second tab, should not fail — and
        // must certainly not run the analysis twice on one subscription. An analysis that found nothing
        // is the one exception: the page offers to read the project again, with an agent this time.
        if (
          running ||
          start === undefined ||
          (composition !== undefined && Object.keys(composition.config.resources).length > 0)
        ) {
          return;
        }

        // A failed analysis is not the end of the session: the page offers to try again, possibly
        // with a different agent, and a stale failure would keep the phase stuck on `failed`.
        failure = undefined;
        running = true;
        choice = { agentId: requested.agentId, modelId: requested.modelId };
        if (requested.mode !== undefined) mode = requested.mode;
        publish(buildState());
        // Deliberately not awaited: the mission takes tens of seconds and this is an HTTP handler.
        // The page is told it started, and hears the rest over the event stream.
        void start(choice, noteProgress).then(
          (finished) => {
            running = false;
            facts = finished.facts;
            // Recomposed here rather than taken as-is: the mission composes with defaults, and the
            // mode the user picked on the first screen is what this configuration must reflect.
            adoptComposition(
              composeConfig({
                facts: finished.facts,
                projectName,
                ...(mode === undefined ? {} : { mode }),
                ...(initialPreferences === undefined ? {} : { preferences: initialPreferences }),
                engineVersions: versionJson.rds
              })
            );
            publish(buildState());
          },
          (error: unknown) => {
            running = false;
            failure = error instanceof Error ? error.message : 'Reading the project failed.';
            publish(buildState());
          }
        );
      },
      onDeploy: async ({ stage, region, expected }) => {
        // Nothing to deploy until there is a file, and never two deploys at once — which includes
        // while a repair is thinking, or a second concurrent loop starts underneath the first one.
        // Both are answered by doing nothing rather than by an error: the page reflects the state
        // it gets back.
        if (
          deploy === undefined ||
          configFile === undefined ||
          // The file declares the region, and later commands in the project read it there. Deploying elsewhere
          // would leave the stack where those commands do not look.
          (configFile.region !== undefined && configFile.region !== region) ||
          checkingDeployTarget ||
          deployment?.status === 'running' ||
          deployment?.status === 'repairing' ||
          // A gap is a known missing input, not an invitation to spend money learning the same fact
          // from CloudFormation. The page mirrors this, but this gate protects direct requests too.
          composition?.deployable !== true ||
          // The real wizard's target probe resolves the same connected account/profile as deploy.
          // Embedders without it retain the older ambient identity gate.
          (inspectDeployTarget === undefined && awsIdentity !== undefined && identity?.available !== true) ||
          // The agreed gate: a configuration the local try-out has proven broken never deploys
          // until something changes or the user explicitly sets the result aside.
          verificationBlocksDeploy()
        ) {
          return;
        }

        const reviewedConfigFile = configFile;
        const reviewedComposition = composition;
        const previouslyReviewedTarget = deployTarget;
        let targetExpectation: DeployTargetExpectation | undefined;
        if (inspectDeployTarget !== undefined) {
          checkingDeployTarget = true;
          const observed = await inspectDeployTarget({ configFile: reviewedConfigFile, stage, region }).catch(
            () => undefined
          );
          checkingDeployTarget = false;
          // A target approval is for the configuration on screen when the check began. A concurrent
          // mode/decision/write request invalidates it even if account and stack name stayed equal.
          if (configFile !== reviewedConfigFile || composition !== reviewedComposition) {
            deployTarget = undefined;
            publish(buildState());
            return;
          }
          if (observed === undefined) {
            deployTarget = {
              status: 'unverified',
              stackName: getStackName(projectName, stage),
              stage,
              region,
              detail: 'Stacktape could not verify this target with the credentials deploy would use.'
            };
            publish(buildState());
            return;
          }
          deployTarget = observed;
          publish(buildState());

          // The first click is read-only. The next is consent bound to the fresh account/name/region
          // and, for an update, the exact StackId. A changed observation simply returns to review.
          if (expected.kind === 'check' || observed.status === 'blocked') return;
          const sameReviewedIdentity =
            previouslyReviewedTarget !== undefined &&
            previouslyReviewedTarget.status !== 'unverified' &&
            previouslyReviewedTarget.accountId === observed.accountId &&
            previouslyReviewedTarget.stackName === observed.stackName &&
            previouslyReviewedTarget.projectName === observed.projectName &&
            previouslyReviewedTarget.stage === observed.stage &&
            previouslyReviewedTarget.region === observed.region &&
            previouslyReviewedTarget.configSha256 === observed.configSha256;
          // The request body is not proof that the page actually displayed an observation. A
          // direct create/update POST becomes a read-only check; only a later request can confirm
          // the exact identity the session had already published.
          if (!sameReviewedIdentity) return;
          if (expected.kind === 'create') {
            if (previouslyReviewedTarget.status !== 'absent' || observed.status !== 'absent') return;
            targetExpectation = { ...observed, expected: 'create' };
          } else {
            if (expected.kind !== 'update') return;
            if (
              previouslyReviewedTarget.status !== 'updateable' ||
              previouslyReviewedTarget.stackId !== expected.stackId ||
              observed.status !== 'updateable' ||
              observed.stackId !== expected.stackId
            )
              return;
            targetExpectation = { ...observed, expected: 'update', stackId: observed.stackId };
          }
        } else if (expected.kind === 'check') {
          // A check is never a synonym for deploy when an embedding omitted the checker.
          return;
        }

        // No sign-in is needed: signed out, the deploy runs on this machine's AWS credentials. Which of the two it is
        // decides what the page offers afterwards, so an account check still in flight is waited for.
        if (stacktapeAccount !== undefined && account === undefined) await accountCheck;
        deployedSignedIn = account?.signedIn === true;
        deployment = {
          status: 'running',
          stage,
          region,
          commandLine: '',
          startedAt: new Date().toISOString(),
          events: [],
          lines: []
        };
        publish(buildState());

        // A deploy emits hundreds of events in bursts. Publishing each one would send the whole
        // state to the page hundreds of times; the page only needs to keep up with a person's eyes.
        let pending = false;
        const publishSoon = () => {
          if (pending) return;
          pending = true;
          setTimeout(() => {
            pending = false;
            publish(buildState());
          }, PROGRESS_PUBLISH_INTERVAL_MS).unref?.();
        };

        const record = <T>(list: T[], entry: T, cap: number): T[] => {
          list.push(entry);
          // Oldest first out. A long deploy must not grow the state without bound, and the interesting
          // part of a deploy that is still running is always its tail.
          return list.length > cap ? list.slice(-cap) : list;
        };

        /** One attempt, start to finish. Resolves with the outcome rather than throwing. */
        const attemptDeploy = async (keepPartialProgress: boolean) => {
          try {
            return await deploy({
              configFile: configFile!,
              stage,
              region,
              ...(targetExpectation === undefined ? {} : { targetExpectation }),
              urlResourceNames:
                composition === undefined
                  ? []
                  : Object.entries(composition.config.resources)
                      .filter(([, resource]) => PUBLIC_URL_RESOURCE_TYPES.has(resource.type))
                      .map(([name]) => name),
              ...(keepPartialProgress ? { keepPartialProgress: true } : {}),
              onEvent: (event) => {
                if (deployment === undefined) return;
                // A successful deploy result can carry the complete detailed stack info. The page
                // needs the status, never that large/sensitive payload; URLs are resolved through
                // typed param:get calls instead of trusting output strings.
                const browserEvent = (() => {
                  if (typeof event !== 'object' || event === null || (event as { type?: unknown }).type !== 'result') {
                    return event;
                  }
                  const { data: _data, ...withoutData } = event as Record<string, unknown>;
                  return withoutData;
                })();
                deployment.events = record(deployment.events, browserEvent, MAX_DEPLOY_EVENTS);
                publishSoon();
              },
              onLine: (line) => {
                if (deployment === undefined) return;
                deployment.lines = record(deployment.lines, line, MAX_DEPLOY_LINES);
                publishSoon();
              },
              onCommand: (commandLine) => {
                if (deployment !== undefined) deployment.commandLine = commandLine;
              }
            });
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'The deploy could not be run.';
            return { ok: false, code: 'DEPLOY_NOT_RUN', message };
          }
        };

        /**
         * Did this attempt get far enough to prove the stack already existed?
         *
         * Decides whether the next attempt may keep partial progress:
         * a failed *update* stops at `UPDATE_FAILED`, which `deploy` will run over, so whatever was
         * created survives for the retry. A failed *create* with rollback disabled would stop at
         * `CREATE_FAILED`, which the wizard's target check treats as unsafe, so the retry would stop
         * there. So the flag is only ever earned by an observed update.
         */
        const attemptWasUpdate = (): boolean =>
          (deployment?.events ?? []).some((entry) => {
            const event = entry as JsonlEvent;
            return (
              event.type === 'event' &&
              event.detail?.kind === 'cloudformation-progress' &&
              event.detail.stackAction === 'update'
            );
          });

        /**
         * Deploy, and if it fails for a reason the code could be wrong about, fix and try again.
         *
         * Not awaited by the caller, for the same reason `onStart` is not: this takes minutes and
         * the browser is holding an HTTP request open.
         */
        const runWithRepairs = async () => {
          let keepProgressNextAttempt = false;
          for (let attempt = 1; ; attempt += 1) {
            // Remembered per attempt, because the failure report has to say what the *failed*
            // attempt left behind — resources that exist are resources that bill.
            const keptThisAttempt = keepProgressNextAttempt;
            const outcome = await attemptDeploy(keepProgressNextAttempt);
            if (outcome.ok || deployment === undefined) {
              const { urls, ...publicOutcome } = outcome;
              deployment = {
                ...deployment!,
                status: outcome.ok ? 'succeeded' : 'failed',
                outcome: publicOutcome,
                ...(urls === undefined ? {} : { urls })
              };
              publish(buildState());
              return;
            }

            const failed = summariseFailure({
              events: deployment.events as JsonlEvent[],
              lines: deployment.lines,
              outcome
            });

            // Decided from the attempt that just failed, before its events are cleared for the next
            // one. See `attemptWasUpdate` for why an update is the only state worth preserving.
            keepProgressNextAttempt = attemptWasUpdate();

            const canRetry =
              failed?.worthRetrying === true &&
              attempt < MAX_DEPLOY_ATTEMPTS &&
              repair !== undefined &&
              // A repair rewrites the file from the composition, which would throw away the user's own edits.
              configEdit === undefined &&
              facts !== undefined &&
              write !== undefined &&
              // "Files only" was an explicit decision that no agent reads this code. A failed
              // deploy does not revoke it — without that, declining an agent on the first screen
              // would quietly stop applying at the exact moment one gets used.
              choice?.agentId !== 'none';

            if (!canRetry) {
              deployment = {
                ...deployment,
                status: 'failed',
                outcome,
                ...(keptThisAttempt ? { keptPartialProgress: true } : {})
              };
              publish(buildState());
              return;
            }

            deployment = { ...deployment, status: 'repairing', outcome };
            publish(buildState());

            const repaired = await repair!({
              facts: facts!,
              decisions: answers,
              preferences: composition!.preferences,
              failure: failed!,
              onProgress: (entry) => {
                timeline.push(entry);
                publishSoon();
              }
            }).catch(() => undefined);

            // Nothing learned, or nothing that changes the file. Trying AWS again with the same
            // configuration would fail the same way and cost the user the wait to find out.
            if (repaired === undefined || !repaired.changed) {
              deployment = {
                ...deployment,
                status: 'failed',
                outcome,
                repairs: [...(deployment.repairs ?? []), { attempt, applied: false }],
                ...(keptThisAttempt ? { keptPartialProgress: true } : {})
              };
              publish(buildState());
              return;
            }

            // Named by diffing what was reviewed against what will deploy now, so the page can say
            // where the configurations differ. Computed here, never taken from the agent's words.
            const changedResources = changedResourceNames(composition, repaired.composition);
            const previousConfigFile = configFile!;
            facts = repaired.facts;
            adoptComposition(repaired.composition);
            const written = await write!({
              composition,
              format: previousConfigFile.format,
              region: previousConfigFile.region
            });
            configFile = { ...previousConfigFile, ...written };

            deployment = {
              ...deployment,
              status: 'running',
              repairs: [
                ...(deployment.repairs ?? []),
                { attempt, applied: true, ...(changedResources.length === 0 ? {} : { changedResources }) }
              ],
              // A retry is a fresh attempt as far as the page is concerned; keeping the old stream
              // would make it look like one long failing deploy.
              events: [],
              lines: []
            };
            publish(buildState());
            repriceInBackground();
          }
        };

        void runWithRepairs();
      },
      onCodingAgentSetup: async () => {
        if (codingAgentSetup === undefined || choice === undefined) return;
        if (deployment?.status !== 'succeeded') {
          throw new Error('A coding agent is connected after the deploy has succeeded.');
        }
        const agentId = choice.agentId;
        if (agentSetup.agentId === agentId && (agentSetup.status === 'running' || agentSetup.status === 'connected'))
          return;
        agentSetup = { agentId, status: 'running' };
        publish(buildState());
        void codingAgentSetup
          .setUp(agentId)
          .catch((error: unknown) => ({ ok: false, detail: error instanceof Error ? error.message : String(error) }))
          .then(({ ok, detail }) => {
            if (agentSetup.agentId !== agentId) return;
            agentSetup = { agentId, status: ok ? 'connected' : 'failed', detail };
            publish(buildState());
          });
      },
      onConsoleConnection: async (action) => {
        // Offered only after an account-free deploy succeeded; anything else has nothing to accept or set aside.
        const offer = consoleConnectionState().consoleConnection;
        if (offer === undefined || offer.status === 'linked') return;
        if (action === 'dismiss') {
          // A sign-in started from the offer ends with it; a connection already running finishes in the background.
          if (connection === 'signing-in' && account?.signedIn !== true) signInFlow?.reset();
          if (connection !== 'connected') connection = 'dismissed';
          publish(buildState());
          return;
        }
        if (connection === 'connecting' || connection === 'connected') return;
        if (account?.signedIn === true) {
          startConnecting();
          return;
        }
        connection = 'signing-in';
        publish(buildState());
        // One click both accepts and opens the Console tab, so the device sign-in starts with it.
        if (signInFlow !== undefined && signInFlow.state().step === 'signed-out') {
          await signInFlow.handle({ kind: 'start' });
          publish(buildState());
        }
      },
      onPipeline: async ({ stage, region }) => {
        // The pipeline deploys a configuration, so there has to be one. Nothing to say otherwise.
        if (writePipeline === undefined || configFile === undefined) return;
        pipeline = await writePipeline({ configFile, stage, region });
        publish(buildState());
      },
      onMode: (nextMode) => {
        if (deploymentInFlight()) return buildState();
        mode = nextMode;
        // Same shape as a changed decision: recomposed from the original facts plus everything the
        // user has said so far, so switching back restores exactly what was there before.
        if (facts !== undefined && composition !== undefined) {
          adoptComposition(
            composeConfig({ facts, projectName, mode, decisions: answers, engineVersions: versionJson.rds })
          );
        }
        return buildState();
      },
      onRegion: (region) => {
        // A written file declares its region; it is picked before writing. Only a region the CLI deploys to can be
        // written into the file.
        // An edited file declares its own region, and a deploy reads the file on disk; neither is changed under them.
        if (
          configEdit !== undefined ||
          deploymentInFlight() ||
          !(SUPPORTED_AWS_REGIONS as readonly string[]).includes(region)
        ) {
          return buildState();
        }
        chosenRegion = region;
        // A written file declares the old region. Dropping its handle makes the page write it again before a deploy.
        if (configFile !== undefined && configFile.region !== region) {
          configFile = undefined;
          deployTarget = undefined;
        }
        followDeclaredRegion();
        return buildState();
      },
      onPreference: (change: DeploymentPreferenceChange) => {
        if (facts === undefined || composition === undefined || deploymentInFlight() || configEdit !== undefined) {
          return buildState();
        }
        mode = undefined;
        const preferences = { ...composition.preferences, [change.key]: change.value } as DeploymentPreferences;
        adoptComposition(
          composeConfig({ facts, projectName, preferences, decisions: answers, engineVersions: versionJson.rds })
        );
        return buildState();
      },
      onWrite: async (format) => {
        // Nothing composed means nothing to write. Not an error: a page that asks early is a page
        // that raced the run, and the state it gets back says plainly that there is no file.
        if (write === undefined || composition === undefined || deploymentInFlight()) return;
        // Decided now, not when the preview was rendered: the identity check may have answered since.
        const region = declaredRegion();
        const edit = configEdit;
        if (edit?.error !== undefined) return;
        const replaces = ownFile === undefined ? {} : { replaces: ownFile };
        // An edited file is written in the format it was edited in, exactly as typed.
        const editedFormat = edit?.typescript === undefined ? 'yaml' : 'typescript';
        const written =
          edit === undefined
            ? await write({ composition, format, region, ...replaces })
            : await write({
                composition,
                format: editedFormat,
                region: regionOfText(edit.yaml) ?? region,
                contents: edit.typescript ?? edit.yaml,
                ...replaces
              });
        ownFile = written.path;
        // A later change of decisions rewrites the file to the region the user has already seen in it.
        chosenRegion = written.region ?? region;
        configFile = { ...written, format: edit === undefined ? format : editedFormat };
        deployTarget = undefined;
        publish(buildState());
      },
      onSignIn: async (action) => {
        // Nothing to sign in with, or nothing to sign in to. Answered by doing nothing, like a
        // deploy with no file: the state the page gets back says where things actually stand.
        if (signInFlow === undefined || account?.signedIn === true) return;
        await signInFlow.handle(action);
        publish(buildState());
      },
      onVerify: () => startVerification(true),
      onVerifyDismiss: () => {
        // Keeps the results on screen while removing their hold on the deploy button: the user has
        // seen them, and setting them aside is their call to make.
        if (verification !== undefined) {
          verification = { ...verification, status: 'dismissed' };
        }
        return buildState();
      },
      ...(repositoryRoot === undefined
        ? {}
        : {
            // Walked once: the page asks while the analysis reads, and nothing it lists changes meanwhile.
            onTree: () => (repositoryTree ??= readRepositoryTree({ repositoryRoot })),
            onFile: (path: string) =>
              readSeenFile({
                repositoryRoot,
                path,
                // Recomputed per request: the timeline grows while the agent reads, and the facts arrive at the end.
                seen: seenFilePaths({
                  timeline,
                  evidenceSources: [
                    facts,
                    composition?.provenance,
                    composition?.assumptions,
                    composition?.unsetSettings
                  ]
                })
              }),
            // Only the variables the configuration about to be deployed reads as secrets: the hand-edited text when
            // there is one, else the composition. No other key of `.env` leaves the file.
            onEnvironmentValues: () => {
              let resources: Record<string, unknown> = composition?.config.resources ?? {};
              if (configEdit !== undefined) {
                try {
                  const parsed = parseYaml(configEdit.yaml) as { resources?: unknown } | null;
                  resources =
                    typeof parsed?.resources === 'object' && parsed.resources !== null
                      ? (parsed.resources as Record<string, unknown>)
                      : {};
                } catch {
                  resources = {};
                }
              }
              return readEnvironmentValues({ repositoryRoot, names: new Set(requiredSecretVariables(resources)) });
            }
          }),
      onConfigText: async (edit) => {
        if (composition === undefined || deploymentInFlight()) return buildState();
        const count = (configEditCount += 1);
        // Back to generated, or an edit that changed nothing: the composition is the file again.
        if (
          edit === null ||
          ('yaml' in edit && edit.yaml === configText?.yaml) ||
          ('typescript' in edit && edit.typescript === configText?.typescript)
        ) {
          if (configEdit === undefined) return buildState();
          configEdit = undefined;
        } else if ('yaml' in edit) {
          configEdit = { yaml: edit.yaml, ...yamlError(edit.yaml) };
        } else {
          // TypeScript is run to learn the configuration it defines; the diagram, price and secrets follow that.
          const evaluation = await evaluateTypescriptConfig({
            source: edit.typescript,
            projectName,
            region: declaredRegion()
          });
          if (count !== configEditCount || composition === undefined || deploymentInFlight()) return buildState();
          configEdit =
            'yaml' in evaluation
              ? { yaml: evaluation.yaml, typescript: edit.typescript }
              : {
                  // The last configuration it evaluated to, so the picture holds still while the text is being fixed.
                  yaml: configEdit?.typescript === undefined ? (configText?.yaml ?? '') : configEdit.yaml,
                  typescript: edit.typescript,
                  error: evaluation.error,
                  ...(evaluation.line === undefined ? {} : { errorLine: evaluation.line })
                };
        }
        configFile = undefined;
        deployTarget = undefined;
        verification = undefined;
        repriceInBackground();
        return publishNow();
      },
      ...(templatePreview === undefined
        ? {}
        : {
            onTemplate: (): Promise<WizardTemplatePreview> => {
              const edit = configEdit;
              if (edit?.error !== undefined) {
                return Promise.resolve({
                  status: 'unavailable',
                  detail: 'The file has an error. Fix it to see its template.'
                });
              }
              const yaml = edit?.yaml ?? configText?.yaml;
              if (yaml === undefined) {
                return Promise.resolve({ status: 'unavailable', detail: 'There is no configuration yet.' });
              }
              const region = regionOfText(yaml) ?? declaredRegion();
              const accountId = identity?.available === true ? identity.accountId : undefined;
              const consoleConnected = account?.signedIn === true;
              const key = JSON.stringify([yaml, region, accountId, consoleConnected]);
              const cached = templates.get(key);
              if (cached !== undefined) return cached;
              const parsed = parseYaml(yaml) as Record<string, unknown>;
              const stage = 'dev';
              const compiled = templatePreview({
                config: parsed,
                projectName: typeof parsed.projectName === 'string' ? parsed.projectName : projectName,
                stage,
                region,
                ...(accountId === undefined ? {} : { accountId }),
                workingDir: repositoryRoot ?? process.cwd(),
                consoleConnected
              }).then((result): WizardTemplatePreview =>
                'error' in result
                  ? { status: 'failed', config: yaml, error: result.error }
                  : { status: 'ready', config: yaml, text: result.text, owners: result.owners, stage, region }
              );
              templates.set(key, compiled);
              // A handful is plenty: the page asks for the current configuration, and going back to one is common.
              for (const old of [...templates.keys()].slice(0, -4)) templates.delete(old);
              return compiled;
            }
          }),
      onSecret: async ({ name, value }) => {
        if (setSecret === undefined) return buildState();
        const outcome = await setSecret({ name, value, region: declaredRegion() }).catch((error: unknown) => ({
          ok: false,
          detail: error instanceof Error ? error.message : 'The secret could not be saved.'
        }));
        if (outcome.ok) {
          secretsSet.add(name);
          if (secretFailure?.name === name) secretFailure = undefined;
        } else {
          secretFailure = { name, detail: outcome.detail };
        }
        return publishNow();
      },
      onSecretsConfirmed: () => {
        secretsConfirmed = true;
        return publishNow();
      },
      onAwsKeys: async (keys) => {
        if (createAwsProfile === undefined) return buildState();
        awsKeys = { status: 'saving' };
        publish(buildState());
        const outcome = await createAwsProfile(keys).catch((error: unknown) => ({
          ok: false,
          detail: error instanceof Error ? error.message : 'The keys could not be saved.',
          profile: undefined
        }));
        awsKeys = {
          status: outcome.ok ? 'saved' : 'failed',
          detail: outcome.detail,
          ...(outcome.profile === undefined ? {} : { profile: outcome.profile })
        };
        if (outcome.ok) {
          identity = undefined;
          deployTarget = undefined;
          publish(buildState());
          await resolveIdentity();
        }
        return publishNow();
      },
      onAnswer: (decisionId, value) => {
        // Nothing to change before the mission has produced anything. During a deploy, a new
        // composition would drop the file the deploy is reading; the page locks these controls too.
        if (facts === undefined || composition === undefined || deploymentInFlight() || configEdit !== undefined) {
          return buildState();
        }
        // "Run the migration on each deploy" for a migration nothing runs yet: the same decision an agent raises when it
        // is unsure, raised here by the user's click, so the composer emits the hook from the reviewed command.
        const migrationService = /^migration-timing:(.+)$/.exec(decisionId)?.[1];
        if (migrationService !== undefined && !facts.uncertainties.some((entry) => entry.id === decisionId)) {
          const migration = facts.migrations.find((entry) => entry.serviceName === migrationService);
          if (migration === undefined || !['deploy-hook', 'service-startup', 'manual'].includes(value)) {
            return buildState();
          }
          facts = {
            ...facts,
            uncertainties: [
              ...facts.uncertainties,
              {
                id: decisionId,
                kind: 'migration-timing-unknown',
                serviceName: migrationService,
                command: migration.command,
                recommended: 'deploy-hook',
                blocksDeploy: false,
                evidence: migration.evidence,
                source: 'probe'
              }
            ]
          };
        }
        answers[decisionId] = value;
        // Recomposed from the original facts plus the user's decisions. Nothing is edited in place,
        // so changing a decision back really does restore what was there before.
        adoptComposition(
          composeConfig({
            facts,
            projectName,
            ...(mode === undefined ? { preferences: composition.preferences } : { mode }),
            decisions: answers,
            engineVersions: versionJson.rds
          })
        );
        return buildState();
      }
    }
  });

  publish = server.publish;
  currentPublished = server.current;

  // Resolved in the background: asking AWS who we are takes a round trip, and the first screen has
  // nothing to do with AWS. By the time anyone reaches the deploy step the answer is already here.
  void resolveIdentity();
  void resolveAccount();

  // A session created with a finished result never goes through `onStart`, so its derived outputs —
  // the TypeScript text, the price — have to be kicked off here, now that `publish` can reach a page.
  if (composition !== undefined) {
    adoptComposition(composition);
  }

  // However the session ends — Ctrl+C or the idle timer — a sign-in still in progress ends with it:
  // the Google listener stops, and a password or token held for the next step is forgotten.
  void server.whenClosed.then(() => signInFlow?.reset());

  return {
    server,
    currentFacts: () => facts,
    close: async () => {
      signInFlow?.reset();
      await server.close();
    }
  };
};

/**
 * Turn an agent event into a timeline entry the page can render.
 *
 * Tool calls only. The agent's own prose is deliberately dropped: it is model output produced while
 * reading untrusted files, and the rule this file opens with — an agent must never put words in
 * front of the user — applies to a progress headline as much as to a decision. The file feed shows
 * what is happening; the wording around it stays ours.
 */
export const toTimelineEntry = (event: AgentEvent): { kind: string; label: string } | undefined => {
  if (event.type === 'tool-call') return { kind: 'tool', label: `${event.name} ${event.summary}`.trim() };
  return undefined;
};

/** The `region` an edited configuration declares at its top level, when it declares one the CLI deploys to. */
const regionOfText = (yaml: string): string | undefined => {
  try {
    const parsed = parseYaml(yaml) as { region?: unknown } | null;
    const region = parsed?.region;
    return typeof region === 'string' && (SUPPORTED_AWS_REGIONS as readonly string[]).includes(region)
      ? region
      : undefined;
  } catch {
    return undefined;
  }
};

/** The parser's complaint about edited text, short enough for one line on the page. */
const yamlError = (yaml: string): { error?: string } => {
  try {
    const parsed = parseYaml(yaml) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'The file must be a YAML mapping with a resources section.' };
    }
    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0]! : 'The YAML does not parse.';
    return { error: message.slice(0, 240) };
  }
};
