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

import { composeConfig, type CompositionResult } from '@stacktape/config-inference/compose';
import versionJson from '@generated/db-engine-versions/versions.json' with { type: 'json' };
import type { Assumption } from '@stacktape/config-inference/compose/assumptions';
import type { InfrastructureMode } from '@stacktape/config-inference/compose/modes';
import type { ProjectFacts } from '@stacktape/config-inference/facts';
import type { AgentEvent } from '../agent/transport';
import type { GreenfieldResult } from '../missions/greenfield';
import { summariseFailure, type DeployFailure } from '../deploy/failure';
import type { JsonlEvent } from '@application-services/tui-manager/output/jsonl-types';
import { getStackName } from '@stacktape/naming/stacks';
import type { DeployTargetExpectation, DeployTargetObservation } from '../deploy/stack-expectation';
import { estimateMonthlyCost, type PriceEstimate } from '../pricing';
import { renderTypeScript, renderYaml } from '../write-config';
import type { PreflightResult } from '../preflight/preflight';
import {
  startWizardServer,
  type WizardAgentOption,
  type WizardAwsIdentity,
  type WizardDeployment,
  type WizardServer,
  type WizardState,
  type WizardVerification
} from './wizard-server';

/**
 * A decision as the page renders it.
 *
 * Note what is absent: any text the agent wrote. The kind, the value chosen and its alternatives
 * travel; the wording is the interface's to supply. An agent that reads untrusted files must never
 * be able to put words in front of the user.
 */
export type WizardDecision = Assumption;

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

/** Every size the wizard offers, for pricing the ones not currently chosen. */
const ALL_MODES: InfrastructureMode[] = ['low-cost', 'standard', 'production'];

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
  existingConfig,
  agents = [],
  result,
  start,
  write,
  deploy,
  inspectDeployTarget,
  verify,
  repair,
  awsIdentity,
  stacktapeAccount,
  gitHost,
  writePipeline,
  mode: initialMode = 'standard',
  timeline = [],
  staticRoot,
  watchStatic
}: {
  projectName: string;
  /** Shown on the first screen so the user can see exactly which directory will be read. */
  repositoryPath?: string;
  /** A configuration already in the repository. Never modified; the page names it before writing. */
  existingConfig?: string;
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
  }) => Promise<{ path: string; filename: string; existingPath?: string }>;
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
     * Only ever set on a retry, and only once the stack exists. A first deploy that fails ends in
     * `CREATE_FAILED`, which CloudFormation will not let anything update — so keeping the wreckage
     * there buys nothing and costs the user a manual rollback before they can try again. A failed
     * *update* ends in `UPDATE_FAILED`, which is directly deployable, so there the partial progress
     * is real: the database that took eight minutes is still there for the next attempt.
     */
    keepPartialProgress?: boolean;
    /** Consent bound to the account/name/region and, for an update, the exact existing StackId. */
    targetExpectation?: DeployTargetExpectation;
    /** Public resources whose deployed, typed `url` parameters should be shown after success. */
    urlResourceNames: string[];
    onEvent: (event: unknown) => void;
    onLine: (line: string) => void;
    onCommand: (commandLine: string) => void;
  }) => Promise<{ ok: boolean; code: string; message: string; urls?: string[] }>;
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
    failure: DeployFailure;
    onProgress: (entry: { kind: string; label: string }) => void;
  }) => Promise<{ facts: ProjectFacts; composition: CompositionResult; changed: boolean }>;
  /** Resolves who this machine is to AWS. Awaited lazily, so a slow answer never delays the page. */
  awsIdentity?: () => Promise<WizardAwsIdentity>;
  /** Whether this machine is signed in to Stacktape, which deploying requires and generating does not. */
  stacktapeAccount?: () => Promise<{ signedIn: boolean; detail: string }>;
  /** The git host this project pushes to, when it is one we generate a pipeline for. */
  gitHost?: 'github' | 'gitlab' | 'bitbucket';
  /** How much infrastructure to compose for. Chosen on the first screen, before anything is read. */
  mode?: InfrastructureMode;
  /** Writes a deployment pipeline for that host, and reports what the user must set up on it. */
  writePipeline?: (input: {
    configFile: { filename: string };
    stage: string;
    region: string;
  }) => Promise<NonNullable<WizardState['pipeline']>>;
  timeline?: Array<{ kind: string; label: string }>;
  /** Directory holding the built wizard bundle. */
  staticRoot?: string;
  /** Reload connected pages when that bundle changes. For working on the wizard itself. */
  watchStatic?: boolean;
}): Promise<WizardSession> => {
  let facts = result?.facts;
  let composition = result?.composition;
  let price: PriceEstimate | undefined;
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
    price = undefined;
    modePrices = undefined;
    void estimateMonthlyCost(renderYaml(current)).then((estimate) => {
      // Another recomposition may have happened while this was in flight. Its own call will publish.
      if (composition !== current) return;
      price = estimate;
      if (estimate !== undefined) modePrices = { ...modePrices, [mode]: estimate.monthly };
      publish(buildState());
    });
    // The other sizes are priced too, so each size card can carry its real monthly figure — comparing
    // sizes must never mean switching back and forth to watch one number change. Recomposing is
    // deterministic and free; only the price lookups cost a round trip.
    const currentFacts = facts;
    if (currentFacts === undefined) return;
    for (const other of ALL_MODES) {
      if (other === mode) continue;
      const candidate = composeConfig({
        facts: currentFacts,
        projectName,
        mode: other,
        decisions: answers,
        engineVersions: versionJson.rds
      });
      void estimateMonthlyCost(renderYaml(candidate)).then((estimate) => {
        if (composition !== current || estimate === undefined) return;
        modePrices = { ...modePrices, [other]: estimate.monthly };
        publish(buildState());
      });
    }
  };

  /**
   * Adopt a new composition, and refresh everything derived from it.
   *
   * The one door for composition changes — the first result, a changed decision, a changed size, a
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
    configText = { yaml: renderYaml(next) };
    void renderTypeScript(next).then((text) => {
      if (composition !== next || configText === undefined) return;
      configText = { ...configText, typescript: text };
      publish(buildState());
    });
    repriceInBackground();
  };
  let failure: string | undefined;
  let choice: { agentId: string; modelId: string } | undefined;
  let running = false;
  let modePrices: Partial<Record<InfrastructureMode, string>> | undefined;
  let configFile: WizardState['configFile'];
  let identity: WizardAwsIdentity | undefined;
  let account: { signedIn: boolean; detail: string } | undefined;
  let deployment: WizardDeployment | undefined;
  let deployTarget: WizardState['deployTarget'];
  let checkingDeployTarget = false;
  let pipeline: WizardState['pipeline'];
  let mode: InfrastructureMode = initialMode;
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
          const written = await write({ composition: repaired.composition, format: previousConfigFile.format }).catch(
            () => undefined
          );
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
    ...(agents.length === 0 ? {} : { agents }),
    ...(choice === undefined ? {} : { choice }),
    ...(configFile === undefined ? {} : { configFile }),
    ...(identity === undefined ? {} : { awsIdentity: identity }),
    ...(account === undefined ? {} : { stacktapeAccount: account }),
    ...(deployment === undefined ? {} : { deployment }),
    ...(deployTarget === undefined ? {} : { deployTarget }),
    ...(verification === undefined ? {} : { verification }),
    ...(gitHost === undefined ? {} : { gitHost }),
    mode,
    ...(pipeline === undefined ? {} : { pipeline }),
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
            deployable: composition.deployable,
            ...(price === undefined ? {} : { price }),
            ...(modePrices === undefined ? {} : { modePrices }),
            // The file exactly as writing it would produce it, so the page shows the real artifact
            // rather than a re-rendering that could disagree with it.
            ...(configText === undefined ? {} : { configText })
          }
        }),
    answers,
    ...(failure === undefined ? {} : { error: failure })
  });

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
    publish(buildState());
  };

  const resolveAccount = async (): Promise<void> => {
    if (stacktapeAccount === undefined) return;
    try {
      account = await stacktapeAccount();
    } catch {
      account = { signedIn: false, detail: 'Could not check the Stacktape account.' };
    }
    publish(buildState());
  };

  const server = await startWizardServer({
    initialState: buildState(),
    ...(staticRoot === undefined ? {} : { staticRoot }),
    ...(watchStatic === undefined ? {} : { watchStatic }),
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
        // must certainly not run the analysis twice on one subscription.
        if (running || start === undefined || composition !== undefined) {
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
              composeConfig({ facts: finished.facts, projectName, mode, engineVersions: versionJson.rds })
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
          checkingDeployTarget ||
          deployment?.status === 'running' ||
          deployment?.status === 'repairing' ||
          // A gap is a known missing input, not an invitation to spend money learning the same fact
          // from CloudFormation. The page mirrors this, but this gate protects direct requests too.
          composition?.deployable !== true ||
          // The real wizard's target probe resolves the same connected account/profile as deploy.
          // Embedders without it retain the older ambient identity gate.
          (inspectDeployTarget === undefined && awsIdentity !== undefined && identity?.available !== true) ||
          (stacktapeAccount !== undefined && account?.signedIn !== true) ||
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
            previouslyReviewedTarget.region === observed.region;
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

        deployment = { status: 'running', stage, region, commandLine: '', events: [], lines: [] };
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
         * Decides whether the next attempt may keep partial progress. The distinction is
         * CloudFormation's, not ours: a failed *update* stops at `UPDATE_FAILED`, which `deploy`
         * will run over, so whatever was created survives for the retry. A failed *create* with
         * rollback disabled stops at `CREATE_FAILED`, which the deploy gate refuses outright — the
         * retry would die on a state error and leave the stack stuck until someone runs
         * `cf:rollback` by hand. So the flag is only ever earned by an observed update.
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
            const written = await write!({ composition, format: previousConfigFile.format });
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
      onPipeline: async ({ stage, region }) => {
        // The pipeline deploys a configuration, so there has to be one. Nothing to say otherwise.
        if (writePipeline === undefined || configFile === undefined) return;
        pipeline = await writePipeline({ configFile, stage, region });
        publish(buildState());
      },
      onMode: (nextMode) => {
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
      onWrite: async (format) => {
        // Nothing composed means nothing to write. Not an error: a page that asks early is a page
        // that raced the run, and the state it gets back says plainly that there is no file.
        if (write === undefined || composition === undefined) return;
        const written = await write({ composition, format });
        configFile = { ...written, format };
        deployTarget = undefined;
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
      onAnswer: (decisionId, value) => {
        // Nothing to change before the mission has produced anything.
        if (facts === undefined || composition === undefined) {
          return buildState();
        }
        answers[decisionId] = value;
        // Recomposed from the original facts plus the user's decisions. Nothing is edited in place,
        // so changing a decision back really does restore what was there before.
        adoptComposition(
          composeConfig({ facts, projectName, mode, decisions: answers, engineVersions: versionJson.rds })
        );
        return buildState();
      }
    }
  });

  publish = server.publish;

  // Resolved in the background: asking AWS who we are takes a round trip, and the first screen has
  // nothing to do with AWS. By the time anyone reaches the deploy step the answer is already here.
  void resolveIdentity();
  void resolveAccount();

  // A session created with a finished result never goes through `onStart`, so its derived outputs —
  // the TypeScript text, the price — have to be kicked off here, now that `publish` can reach a page.
  if (composition !== undefined) {
    adoptComposition(composition);
  }

  return {
    server,
    currentFacts: () => facts,
    close: () => server.close()
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
