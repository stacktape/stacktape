/**
 * `stacktape init`, from the CLI's point of view.
 *
 * Everything interesting happens elsewhere: the probes, the agent, the composer, the wizard. This
 * file's whole job is choosing *how* to present it and getting out of the way.
 *
 * Two presentations, one pipeline. The browser is the good one — it can show a diagram, a price and
 * the line of your own code that produced each resource. The terminal is the one that has to work
 * anyway: over SSH, in a container, in CI, on a machine with no browser. Neither is a reimplementation
 * of the other, because the missions and the composer sit underneath both.
 */

import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { detectAgents, type DetectedAgent } from './agent/detect';
import { modelFlagFor, modelsFor } from './agent/models';
import { getStacktapeVersion } from '@utils/versioning';
import { detectRepository } from './cicd/detect-host';
import { writePipeline } from './cicd/write-pipeline';
import { resolveAwsIdentity } from './deploy/credentials';
import { resolveStacktapeAccount } from './deploy/stacktape-account';
import {
  deployCommandLine,
  inspectDeployTarget,
  readResourceUrl,
  startDeploy,
  type DeployHandle
} from './deploy/run-deploy';
import { runAgentSessionWithRetry } from './agent/session-runner';
import type { AgentEvent } from './agent/transport';
import { runGreenfieldMission, type AgentRunner, type GreenfieldResult } from './missions/greenfield';
import { createNixpacksPlanner } from './nixpacks-planner';
import { runPreflight } from './preflight/preflight';
import { createPreflightRunners } from './preflight/runners';
import { runRepairMission } from './missions/repair';
import type { InfrastructureMode } from '@stacktape/config-inference/compose/modes';
import type { DeploymentPreferences } from '@stacktape/config-inference/compose/preferences';
import type { WizardAgentOption } from './server/wizard-server';
import { startWizardSession, toTimelineEntry } from './server/wizard-session';
import { estimateMonthlyCost } from './pricing';
import { reportInitTelemetry } from './telemetry';
import {
  findExistingConfig,
  renderYaml,
  writeComposedConfig,
  type ConfigFormat,
  type WriteConfigResult
} from './write-config';

export type InitPresentation = 'browser' | 'terminal';

export type InitOptions = {
  repositoryRoot?: string;
  projectName?: string;
  /** Connected Stacktape AWS account name, required when no default disambiguates multiple accounts. */
  awsAccount?: string;
  /** Forced by `--headless`; otherwise decided by whether a browser can plausibly be opened. */
  presentation?: InitPresentation;
  /**
   * Which agent to use. `auto` takes the best installed one; a named agent fails if it is absent,
   * because silently doing something other than what was asked for is worse than stopping.
   */
  codingAgent?: 'auto' | 'claude-code' | 'codex' | 'none';
  /**
   * How much infrastructure to compose for.
   *
   * The one thing reading the repository cannot tell us: the same code deployed by two people can
   * legitimately want a $25 environment or a $200 one. Everything else is inferred.
   */
  mode?: InfrastructureMode;
  /** Explicit infrastructure choices. Primarily used by restored/non-browser sessions. */
  preferences?: Partial<DeploymentPreferences>;
  /** Directory holding the built wizard bundle. */
  wizardBundle?: string;
  /**
   * Which format the terminal presentation writes.
   *
   * The browser asks on the Review step instead, because by then the user has seen what is in the
   * file and the question is a real choice rather than a flag they set before knowing.
   */
  configFormat?: ConfigFormat;
  /** Injected in tests. */
  detect?: typeof detectAgents;
  /**
   * Overrides how an agent session is run.
   *
   * Exists so the whole entry point can be exercised without spawning a real CLI and spending the
   * user's subscription. Production never passes it.
   */
  runSession?: typeof runAgentSessionWithRetry;
  openBrowser?: (url: string) => Promise<unknown>;
  onOutput?: (line: string) => void;
};

/**
 * Which installed agent to drive.
 *
 * `detectAgents` already returns them best-first, so this is just "the first one that can actually
 * be driven as a session". Copilot is detected but not yet drivable, and picking it because it
 * happens to be installed would be worse than not offering it.
 */
export const chooseAgent = (
  available: readonly DetectedAgent[],
  requested: 'auto' | 'claude-code' | 'codex' | 'none' = 'auto'
): DetectedAgent | undefined => {
  if (requested === 'none') return undefined;
  const drivable = available.filter((agent) => agent.id === 'claude-code' || agent.id === 'codex');
  return requested === 'auto' ? drivable[0] : drivable.find((agent) => agent.id === requested);
};

/** How each agent is described on the first screen. Ours to write, like every other word the wizard says. */
const AGENT_COPY: Readonly<Record<string, { label: string; description: string }>> = {
  'claude-code': {
    label: 'Claude Code',
    description: 'Reads your project on this machine using your own Claude subscription.'
  },
  codex: {
    label: 'Codex',
    description: 'Reads your project on this machine using your own Codex subscription.'
  }
};

/**
 * The ways this project can be read, as the first screen offers them.
 *
 * Working without an agent is a real option rather than a fallback: it reads nothing but the files
 * the probes already look at, costs nothing, and produces a configuration that leans on defaults
 * more often. Someone who does not want an agent near their code should be able to say so.
 */
export const agentOptions = (
  available: readonly DetectedAgent[],
  recommended: DetectedAgent | undefined
): WizardAgentOption[] => [
  ...available
    .filter((entry) => AGENT_COPY[entry.id] !== undefined)
    .map((entry) => ({
      id: entry.id,
      label: AGENT_COPY[entry.id]!.label,
      version: entry.version,
      description: AGENT_COPY[entry.id]!.description,
      models: modelsFor(entry.id).map(({ id, label, description }) => ({ id, label, description })),
      ...(entry.id === recommended?.id ? { recommended: true } : {})
    })),
  {
    id: 'none',
    label: 'Files only, no agent',
    description:
      'Reads manifests, compose files, Dockerfiles and environment files. Fast, free, and guesses a bit more.',
    models: [{ id: 'default', label: 'No model', description: 'Nothing is sent to a model.' }],
    ...(recommended === undefined ? { recommended: true } : {})
  }
];

/** Whether opening a browser is plausible. Honest rather than clever: if in doubt, use the terminal. */
export const canOpenBrowser = (env: NodeJS.ProcessEnv = process.env): boolean => {
  // Asking for the terminal is `--headless`; this function only answers whether a browser is even
  // possible here. Every CI system sets one of these, and none of them has anyone looking at a screen.
  if (env.CI !== undefined || env.GITHUB_ACTIONS !== undefined || env.BUILDKITE !== undefined) return false;
  // A Linux box with no display server cannot open anything. macOS and Windows always can.
  if (process.platform === 'linux' && env.DISPLAY === undefined && env.WAYLAND_DISPLAY === undefined) return false;
  return true;
};

/**
 * Where the built wizard lives.
 *
 * Two answers, because there are two ways this runs. A release embeds the bundle beside the binary;
 * a development checkout has it wherever Vite last wrote it. Returning undefined is a supported
 * outcome — the server simply has nothing to serve, and the URL is still printed.
 */
export const findWizardBundle = (): string | undefined => {
  const candidates = [
    process.env.STACKTAPE_WIZARD_BUNDLE,
    // Alongside a released binary.
    process.argv[1] ? join(dirname(resolve(process.argv[1])), 'init-ui') : undefined,
    // A development checkout: apps/cli/... up to the repository root, then across.
    join(__dirname, '..', '..', '..', 'init-ui', 'dist'),
    join(process.cwd(), '..', 'init-ui', 'dist'),
    join(process.cwd(), 'apps', 'init-ui', 'dist')
  ].filter((path): path is string => path !== undefined);

  return candidates.find((path) => existsSync(join(path, 'index.html')));
};

export type InitOutcome = {
  presentation: InitPresentation;
  /** The best agent found, whether or not the user goes on to choose it. */
  agent?: DetectedAgent;
  /**
   * What the mission produced.
   *
   * Absent in browser mode: nothing has been read when `runInit` returns there, because the wizard
   * starts the analysis when the user asks it to and keeps the outcome in its own session.
   */
  result?: GreenfieldResult;
  /** What happened to the file on disk. Absent in browser mode, where the wizard owns the decision. */
  configFile?: WriteConfigResult;
  /** Present only for the browser presentation; the caller keeps the process alive while it is open. */
  wizardUrl?: string;
  close?: () => Promise<void>;
  /**
   * Resolves when the wizard server has shut down on its own — after half an hour with no page
   * connected and nothing running. The caller ends the session then, exactly as it would on Ctrl+C;
   * otherwise the process would linger for a wizard that no longer exists.
   */
  whenClosedItself?: Promise<void>;
};

export const runInit = async (options: InitOptions = {}): Promise<InitOutcome> => {
  const repositoryRoot = resolve(options.repositoryRoot ?? process.cwd());
  const projectName = options.projectName ?? basename(repositoryRoot);
  const say = options.onOutput ?? (() => {});

  const requested = options.codingAgent ?? 'auto';
  const available = requested === 'none' ? [] : await (options.detect ?? detectAgents)();
  const agent = chooseAgent(available, requested);

  if (agent === undefined && requested !== 'auto' && requested !== 'none') {
    // Asked for by name and not there. Falling back to something else would be doing a different
    // thing than was requested, quietly, and charging someone's subscription for it.
    throw new Error(`--codingAgent ${requested} was requested, but it is not installed.`);
  }

  const presentation: InitPresentation = options.presentation ?? (canOpenBrowser() ? 'browser' : 'terminal');

  // Only in the terminal. In the browser the agent is the user's to choose on the first screen, and
  // announcing one here would be announcing a decision they have not made.
  if (presentation === 'terminal') {
    if (agent === undefined && requested !== 'none') {
      // Not an error. The probes alone produce a usable configuration with more questions attached,
      // which is a worse answer than a reviewed one and a far better one than refusing to start.
      say(
        'No coding agent found. Reading your project without one — install Claude Code or Codex for a better result.'
      );
    } else if (agent !== undefined) {
      say(
        `Using ${agent.id} (${agent.version}). Your code is read by your own subscription; it is not sent to Stacktape.`
      );
    }
  }

  const timeline: Array<{ kind: string; label: string }> = [];

  /** The runner for one chosen agent, or none at all — probes only, which is a valid choice. */
  const runnerFor = (chosen: DetectedAgent | undefined, model: string | undefined): AgentRunner | undefined =>
    chosen === undefined
      ? undefined
      : (input, hooks) =>
          (options.runSession ?? runAgentSessionWithRetry)(input, hooks, {
            provider: chosen.id as 'claude-code' | 'codex',
            executable: chosen.executable,
            ...(model === undefined ? {} : { model })
          });

  const mode = options.mode;

  const runMission = (runAgent: AgentRunner | undefined, onEvent: (event: AgentEvent) => void) =>
    runGreenfieldMission({
      repositoryRoot,
      projectName,
      ...(mode === undefined ? {} : { mode }),
      ...(options.preferences === undefined ? {} : { preferences: options.preferences }),
      onEvent,
      // The container builder answers what the repository and the convention table could not; the
      // eval harness deliberately runs without it so the baseline never depends on a binary.
      planner: createNixpacksPlanner(repositoryRoot),
      ...(runAgent === undefined ? {} : { runAgent })
    });

  if (presentation === 'terminal') {
    const result = await runMission(runnerFor(agent, undefined), (event) => {
      const entry = toTimelineEntry(event);
      if (entry === undefined) return;
      timeline.push(entry);
      say(`  ${entry.kind === 'tool' ? '→' : ' '} ${entry.label}`);
    });
    for (const line of describeResult(result)) say(line);

    // Priced after the resource list is on screen, because it is a network call in a command that
    // otherwise needs nothing. No answer means no line, not an error.
    const price = await estimateMonthlyCost(renderYaml(result.composition));
    if (price !== undefined) {
      say('');
      say(`About ${price.monthly} in ${price.region}, for what is in this file.`);
    }

    // Written even when questions are outstanding. The file is the useful artifact — someone reading
    // it can see what was worked out and finish the rest by hand — and refusing to write it would
    // leave a headless run with nothing to show for itself.
    const configFile = await writeComposedConfig({
      repositoryRoot,
      composition: result.composition,
      ...(options.configFormat === undefined ? {} : { format: options.configFormat })
    });
    say(
      configFile.existingPath === undefined
        ? `\nWrote ${configFile.path}`
        : `\n${configFile.existingPath} was already here and has not been touched.\nWrote ${configFile.path} beside it — deploy it with \`--configPath ${configFile.filename}\`, or merge it in yourself.`
    );

    // The same session summary the wizard sends, built from the finished run. Categories and
    // counts only; see `initTelemetryEvent` for the rule.
    await reportInitTelemetry(
      {
        phase: 'reviewing',
        projectName,
        choice: { agentId: agent?.id ?? 'none', modelId: 'default' },
        ...(mode === undefined ? {} : { mode }),
        preferences: result.composition.preferences,
        recommendedPreferences: result.composition.recommendedPreferences,
        configFile: { ...configFile, format: options.configFormat ?? 'yaml' },
        timeline: [],
        facts: {
          services: result.facts.services,
          dependencies: result.facts.dependencies,
          existingDeployments: result.facts.existingDeployments,
          decisions: result.composition.assumptions
        },
        composition: { resources: result.composition.config.resources, gaps: result.composition.gaps },
        answers: {}
      },
      { presentation: 'terminal', ...(result.agentSkipped === true ? { agentSkipped: true } : {}) }
    );

    return { presentation, ...(agent === undefined ? {} : { agent }), result: result, configFile };
  }

  const bundle = options.wizardBundle ?? findWizardBundle();
  if (bundle === undefined) {
    // Says so rather than serving a blank page. A wizard that loads nothing and explains nothing is
    // the worst of the three outcomes here; the other two are a working wizard and a clear reason.
    say('The wizard interface has not been built. Run `pnpm --filter @stacktape/init-ui build`, or use --headless.');
  }

  // Looked up before the session starts, so the Review step can name the file it is about to write
  // rather than discovering the collision at the moment it writes.
  const existingConfig = findExistingConfig(repositoryRoot);
  // Where this project pushes, which decides whether a pipeline is worth offering at all.
  const repository = await detectRepository(repositoryRoot);

  // What the user actually picked on the first screen, once they have. The repair loop reads it so
  // a failed deploy is investigated by the agent and model they chose — never a different one.
  let activeChoice: { agent?: DetectedAgent; modelId: string } | undefined;
  /** How long the analysis took, for the session summary. Only the start wrapper sees both ends. */
  let analysisMs: number | undefined;
  /** Wall-clock time from the first paid attempt through its terminal retry/repair outcome. */
  let deployStartedAt: number | undefined;
  let deployMs: number | undefined;
  /** The child must not outlive an explicit Ctrl+C/termination of the wizard. */
  let activeDeploy: DeployHandle | undefined;
  let activeTargetCheck: { controller: AbortController; finished: Promise<unknown> } | undefined;
  let agentWasSkipped = false;

  // Opened before anything is read, and nothing is read until the user says so. The analysis spends
  // their own agent subscription, so it starts on a button they pressed after seeing what it will do
  // — not as a side effect of typing a command.
  const session = await startWizardSession({
    projectName,
    repositoryPath: repositoryRoot,
    ...(existingConfig === undefined ? {} : { existingConfig }),
    agents: agentOptions(available, agent),
    ...(mode === undefined ? {} : { mode }),
    ...(options.preferences === undefined ? {} : { preferences: options.preferences }),
    timeline,
    start: async (choice, onProgress) => {
      const chosen = available.find((entry) => entry.id === choice.agentId);
      // Remembered for the repair loop: a failed deploy is investigated by the same agent and
      // model the user picked for the scan, not by whichever agent we happen to rank best.
      activeChoice = { ...(chosen === undefined ? {} : { agent: chosen }), modelId: choice.modelId };
      const analysisStartedAt = Date.now();
      analysisMs = undefined;
      say(
        chosen === undefined
          ? '\nReading your project without a coding agent.'
          : `\nReading your project with ${chosen.id} (${choice.modelId}). Your code is read by your own subscription; it is not sent to Stacktape.`
      );
      const result = await runMission(
        runnerFor(chosen, chosen === undefined ? undefined : modelFlagFor(chosen.id, choice.modelId)),
        (event) => {
          const entry = toTimelineEntry(event);
          if (entry === undefined) return;
          onProgress(entry);
          say(`  ${entry.kind === 'tool' ? '→' : ' '} ${entry.label}`);
        }
      );
      analysisMs = Date.now() - analysisStartedAt;
      if (result.agentSkipped === true) {
        agentWasSkipped = true;
        const skippedNote = 'The scan answered everything — your agent was not needed, and no tokens were spent.';
        say(`  ${skippedNote}`);
        onProgress({ kind: 'note', label: skippedNote });
      }
      return result;
    },
    write: ({ composition, format }) => writeComposedConfig({ repositoryRoot, composition, format }),
    // The local try-out: build the composed services the way the deploy will, start them in an
    // isolated container with stub values, and watch. Only ever invoked after the user's click —
    // the session owns that consent — and every machinery failure reads as "unavailable" there.
    verify: ({ facts, composition }) =>
      runPreflight({ repositoryRoot, facts, composition, runners: createPreflightRunners() }),
    // Only with an agent. The probes read files, and a deploy failure is not in a file: without a
    // model there is nothing new to learn between one attempt and the next. The session enforces
    // the user's own choice on top of this — someone who picked "Files only" is never repaired by
    // an agent they declined, however good the one we detected is.
    ...(agent === undefined
      ? {}
      : {
          repair: async ({ facts, decisions, preferences, failure, onProgress }) => {
            const repairAgent = activeChoice?.agent ?? agent;
            const repairModel =
              activeChoice?.modelId === undefined ? undefined : modelFlagFor(repairAgent.id, activeChoice.modelId);
            say(`\nThat deploy failed. Asking ${repairAgent.id} what we got wrong about your project.`);
            const repaired = await runRepairMission({
              repositoryRoot,
              projectName,
              facts,
              decisions,
              preferences,
              failure,
              runAgent: runnerFor(repairAgent, repairModel),
              onEvent: (event) => {
                const entry = toTimelineEntry(event);
                if (entry === undefined) return;
                onProgress(entry);
                say(`  ${entry.kind === 'tool' ? '→' : ' '} ${entry.label}`);
              }
            });
            say(
              repaired.changed
                ? '  Found something. Rewriting the configuration and trying again.'
                : '  Nothing to change. Stopping here rather than repeating the same deploy.'
            );
            return repaired;
          }
        }),
    awsIdentity: () => resolveAwsIdentity(),
    stacktapeAccount: () => resolveStacktapeAccount(),
    ...(repository === undefined ? {} : { gitHost: repository.host }),
    ...(repository === undefined
      ? {}
      : {
          writePipeline: async ({ configFile, stage, region }) => {
            const written = await writePipeline({
              repositoryRoot,
              host: repository.host,
              inputs: {
                configPath: configFile.filename,
                stage,
                region,
                projectName,
                // Pinned to the version that generated the file, so a release cannot silently
                // change what someone's pipeline does.
                cliVersion: getStacktapeVersion()
              }
            });
            say(`\nWrote ${written.path}`);
            return {
              filename: written.filename,
              host: written.host,
              authSummary: written.authSummary,
              requiredSecrets: written.requiredSecrets,
              ...(written.existingPath === undefined ? {} : { existingPath: written.existingPath })
            };
          }
        }),
    inspectDeployTarget: async ({ configFile, stage, region }) => {
      const controller = new AbortController();
      const finished = inspectDeployTarget({
        request: {
          repositoryRoot,
          configPath: configFile.filename,
          projectName,
          stage,
          region,
          ...(options.awsAccount === undefined ? {} : { awsAccount: options.awsAccount })
        },
        signal: controller.signal
      });
      const active = { controller, finished };
      activeTargetCheck = active;
      try {
        return await finished;
      } finally {
        if (activeTargetCheck === active) activeTargetCheck = undefined;
      }
    },
    deploy: async ({
      configFile,
      stage,
      region,
      keepPartialProgress,
      targetExpectation,
      urlResourceNames,
      onEvent,
      onLine,
      onCommand
    }) => {
      deployStartedAt ??= Date.now();
      const deployRequest = {
        repositoryRoot,
        configPath: configFile.filename,
        stage,
        region,
        projectName,
        ...(options.awsAccount === undefined ? {} : { awsAccount: options.awsAccount }),
        ...(targetExpectation === undefined ? {} : { targetExpectation }),
        ...(keepPartialProgress === true ? { keepPartialProgress: true } : {})
      };
      onCommand(deployCommandLine(deployRequest));
      say(`\nDeploying ${projectName} to ${region}, stage ${stage}. This creates real AWS resources.`);

      // The CLI ends its stream with exactly one result event, and that is the authority on what
      // happened. The exit code is the fallback for a child that died without emitting one.
      let reported: { ok: boolean; code: string; message: string } | undefined;
      let resultCount = 0;
      const handle = startDeploy({
        request: deployRequest,
        onEvent: (event) => {
          if (event.type === 'result') {
            resultCount += 1;
            reported =
              resultCount === 1
                ? { ok: event.ok, code: event.code, message: event.message }
                : {
                    ok: false,
                    code: 'DEPLOY_PROTOCOL_INVALID',
                    message: 'The deploy child emitted more than one terminal result.'
                  };
          }
          onEvent(event);
        },
        onLine
      });
      activeDeploy = handle;

      const exitCode = await handle.finished;
      if (activeDeploy === handle) activeDeploy = undefined;
      deployMs = Date.now() - deployStartedAt;
      say(exitCode === 0 ? 'Deploy finished.' : `Deploy failed (exit code ${exitCode}).`);
      const outcome =
        reported ??
        ({
          ok: exitCode === 0,
          code: exitCode === 0 ? 'OK' : 'DEPLOY_FAILED',
          message:
            exitCode === 0 ? 'Deployed.' : 'The deploy stopped without saying why. The output below is what it printed.'
        } as const);
      if (!outcome.ok) return outcome;

      const urls = (
        await Promise.all(
          urlResourceNames.map((resourceName) =>
            readResourceUrl({
              request: {
                projectName,
                stage,
                region,
                resourceName,
                ...(options.awsAccount === undefined ? {} : { awsAccount: options.awsAccount })
              }
            })
          )
        )
      ).filter((url): url is string => url !== undefined);
      return { ...outcome, urls: [...new Set(urls)] };
    },
    ...(bundle === undefined ? {} : { staticRoot: bundle }),
    // Only in a development checkout. A released CLI serves a bundle that cannot change underneath
    // it, so watching would burn a file handle to wait for something that never happens.
    ...(process.env.STP_DEV_MODE === 'true' ? { watchStatic: true } : {})
  });

  // Printed before the browser is asked to open, so the address is on screen whether or not that
  // works, and whatever the browser does with the window.
  say(`\nThe wizard is running on your machine at ${session.server.url}`);
  say(
    options.openBrowser === undefined
      ? 'Open that address in your browser. The link works once, for this session.'
      : 'Opening that address in your browser. The link works once, for this session.'
  );
  say('Leave this command running while you use the wizard, and press Ctrl+C when you are done.');
  await (options.openBrowser ?? (async () => {}))(session.server.url).catch(() => {
    // A browser that will not open is not a failure — the URL is printed above.
  });

  // No `result`: nothing has been read yet. The wizard owns the run from here, and its outcome lives
  // in the session the caller holds open.
  return {
    presentation,
    ...(agent === undefined ? {} : { agent }),
    wizardUrl: session.server.url,
    whenClosedItself: session.server.whenClosed.then((reason) => {
      if (reason === 'idle') {
        say('The wizard closed after half an hour with nothing happening. Run stacktape init to start again.');
      } else {
        // An explicit close is already being handled by whoever asked for it; resolving here too
        // would have the caller end a session that is ending. Stay quiet forever instead.
        return new Promise<void>(() => {});
      }
    }),
    close: async () => {
      const targetCheckToStop = activeTargetCheck;
      if (targetCheckToStop !== undefined) {
        targetCheckToStop.controller.abort();
        await Promise.race([
          targetCheckToStop.finished.then(() => undefined),
          new Promise<void>((resolveTimeout) => setTimeout(resolveTimeout, 2_000))
        ]);
      }
      const deploymentToStop = activeDeploy;
      if (deploymentToStop !== undefined) {
        deploymentToStop.cancel();
        // Give the child a short chance to close its streams so the command does not leave a CLI
        // process behind. Shutdown still completes if a platform refuses to reap it promptly.
        await Promise.race([
          deploymentToStop.finished.then(() => undefined),
          new Promise<void>((resolveTimeout) => setTimeout(resolveTimeout, 2_000))
        ]);
      }
      // The session summary goes out as the session ends, when the outcome is known. Categories
      // and counts only — see `initTelemetryEvent` for the rule and its reasons.
      await reportInitTelemetry(session.server.current(), {
        presentation: 'browser',
        ...(analysisMs === undefined ? {} : { analysisDurationMs: analysisMs }),
        ...(deployMs === undefined ? {} : { deployDurationMs: deployMs }),
        ...(agentWasSkipped ? { agentSkipped: true } : {})
      });
      await session.close();
    }
  };
};

/**
 * The terminal presentation.
 *
 * Says the same things the wizard says, in the order the wizard says them: what was found, what was
 * decided on the user's behalf, and what is unfinished. It is deliberately not a progress display —
 * by the time this runs, the work is done.
 */
export const describeResult = (result: GreenfieldResult): string[] => {
  const lines: string[] = [];
  const resources = Object.entries(result.composition.config.resources);

  if (result.agent !== undefined && result.agent.stopReason !== 'complete') {
    lines.push('The coding agent could not finish, so this result uses file scans only.');
    if (result.agent.errorMessage !== undefined) lines.push(`  ${result.agent.errorMessage.trim()}`);
  }

  if (resources.length === 0) {
    lines.push('Nothing here needs deploying yet.');
    return lines;
  }

  lines.push('', `Found ${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}:`);
  for (const [name, resource] of resources) {
    const reason = result.composition.provenance[name]?.reason;
    lines.push(`  ${name}  ${resource.type}`);
    if (reason !== undefined) lines.push(`      ${reason}`);
  }

  // Gaps first, and above the decisions: these are the things that will stop the deploy working,
  // and burying them under a list of what we chose is how a warning gets read as a footnote.
  if (result.composition.gaps.length > 0) {
    lines.push('', 'Before you deploy:');
    for (const gap of result.composition.gaps) lines.push(`  ! ${gap.message}`);
  }

  const notable = result.composition.assumptions.filter((assumption) => assumption.notable);
  if (notable.length > 0) {
    lines.push('', 'Decided for you, and worth a look:');
    // The kind and the value rather than a rendered sentence: the wording lives in the wizard, and
    // a second copy of it here would be a second copy to keep honest.
    for (const assumption of notable) lines.push(`  - ${assumption.kind}: ${assumption.chosen}`);
    lines.push('', 'Run without --headless to change any of them in the browser.');
  }

  return lines;
};
