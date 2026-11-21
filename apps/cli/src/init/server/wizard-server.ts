/**
 * The localhost server the wizard page talks to.
 *
 * Bound to loopback on a random port, reachable for exactly one session, and gone when that session
 * ends. It holds the run's state, streams progress to the page, and takes the user's answers back.
 *
 * The transport split is deliberate: request/response for everything the page asks for, and one
 * long-lived Server-Sent Events stream for the firehose. SSE rather than WebSockets because a
 * one-way stream is all this needs, it reconnects by itself, and it leaves nothing to unwind when
 * the CLI process wants to exit.
 */

import { watch, type FSWatcher } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { AddressInfo, type Socket } from 'node:net';
import { extname, join, normalize } from 'node:path';
import type { DeployTargetObservation } from '../deploy/stack-expectation';
import type { FileView } from './file-view';
import type { RepositoryTree } from './repository-tree';
import type { EnvironmentValues } from './environment-values';
import {
  isDeploymentPreferenceChange,
  type DeploymentPreferenceChange,
  type DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import { isSettingChange, type SettingChange } from '@stacktape/config-inference/compose/resource-settings';
import {
  createSessionSecrets,
  isSameOrigin,
  readCookie,
  secretsMatch,
  SECURITY_HEADERS,
  sessionCookie,
  type SessionSecrets
} from './security';
import { parseSignInAction, type WizardSignIn, type WizardSignInAction } from './wizard-sign-in';
import type { DeployResource } from './deploy-resources';

/**
 * One way of reading the project, offered on the first screen.
 *
 * Sent to the page rather than chosen by it: the page picks an id from this list and nothing else,
 * so no string typed in a browser ever reaches a command line.
 */
export type WizardAgentOption = {
  id: string;
  label: string;
  /** As the agent's own CLI reported it. Absent for the no-agent option. */
  version?: string;
  description: string;
  models: Array<{ id: string; label: string; description: string }>;
  recommended?: boolean;
  /** One Stacktape can drive that is not on this machine: listed so the page can say so, never started. */
  installed?: false;
};

/**
 * What AWS says about this machine's credentials.
 *
 * The account id and the principal ARN are shown to the user before they deploy, because "which
 * account" is the one thing they must confirm and the one thing no tool should assume. No secret is
 * involved: this is the identity, never the credentials behind it.
 */
export type WizardAwsIdentity =
  | {
      available: true;
      accountId: string;
      arn: string;
      region?: string;
      /** The AWS profile these credentials came from, when one was selected rather than environment variables. */
      profile?: string;
      /** The account's alias (IAM account alias), the name people know it by, when the credentials may read it. */
      accountAlias?: string;
    }
  | { available: false; reason: 'no-credentials' | 'rejected'; detail: string; profile?: string };

/**
 * An AWS profile on this machine, by name, as `~/.aws/config` and `~/.aws/credentials` declare it. Never its keys: `kind`
 * says only how it signs in, so the page can say "SSO" or "access key" beside the name.
 */
export type WizardAwsProfile = { name: string; kind: 'sso' | 'keys' | 'role' | 'other'; region?: string };

/**
 * The Stacktape Console, after a successful deploy.
 *
 * `linked`: the deploy ran signed in, so the stage is already in the Console. Every other status belongs to a deploy
 * that ran on this machine's AWS credentials alone, and says how far connecting it to the Console has got. Connecting
 * signs in when needed, then connects the AWS account; nothing deployed changes.
 */
export type WizardConsoleConnection =
  | { status: 'linked' | 'offered' | 'dismissed' | 'signing-in' | 'connecting' | 'connected' }
  | { status: 'failed'; detail: string };

/**
 * A deploy in progress or finished.
 *
 * `events` is the CLI's own JSONL stream, forwarded verbatim. The page builds its view from it, the
 * same way Console does — one protocol, two renderers, no third description of what a deploy is.
 */
export type WizardDeployment = {
  /** `repairing` means the deploy failed and the agent is working out what we got wrong. */
  status: 'running' | 'repairing' | 'succeeded' | 'failed';
  stage: string;
  region: string;
  /** The command that was run, so anyone can reproduce or resume it in a terminal. */
  commandLine: string;
  /** When this attempt began. The event list is capped, so its first entry cannot say. */
  startedAt?: string;
  events: unknown[];
  /**
   * Every AWS resource this attempt's CloudFormation progress named, with its state and times. Kept whole however
   * long the deploy runs: `events` is capped, and its oldest progress leaves first.
   */
  resources?: DeployResource[];
  /** Output that was not part of the protocol: stderr, and anything unparseable. */
  lines: string[];
  /** Present once the deploy has finished. */
  outcome?: { ok: boolean; code: string; message: string };
  /**
   * One entry per failed attempt the agent was asked to explain.
   *
   * `applied: false` means it had nothing to change, which is why the deploy stopped rather than
   * trying again — the same configuration would fail the same way. `changedResources` names what a
   * repair rewrote, computed by diffing the compositions — never the agent's own words — so the page
   * can say what was deployed the second time differs from what was reviewed, and where.
   */
  repairs?: Array<{ attempt: number; applied: boolean; changedResources?: string[] }>;
  /**
   * Whether a failed deploy left its progress standing rather than rolling back.
   *
   * True only for a retry over an existing stack, where keeping the database that took eight
   * minutes is the point. The page must say so: resources that exist are resources that bill.
   */
  keptPartialProgress?: boolean;
  /** Typed deployed-resource URLs resolved after success, by resource; never scraped from repository output. */
  urls?: Array<{ resourceName: string; url: string }>;
};

/**
 * The CloudFormation template the configuration under review compiles to (`template-preview/`), or why it does not.
 * `config` is the configuration text it was compiled from, so the page knows which edit it describes.
 */
export type WizardTemplatePreview =
  | {
      status: 'ready';
      config: string;
      /** The template as `stacktape synth` writes it, its resources grouped by the configuration's resource. */
      text: string;
      /** The resource of the configuration each logical ID was created for; absent for the stack's shared ones. */
      owners: Record<string, string>;
      stage: string;
      region: string;
    }
  | { status: 'failed'; config: string; error: string }
  /** Nothing to compile yet, or the file does not parse. */
  | { status: 'unavailable'; detail: string };

export type WizardState = {
  /**
   * Increments on every publish. Assigned by the server; callers never set it.
   *
   * The page learns the state two ways — the reply to a request it made, and the event stream — and
   * those can arrive out of order. A reply is a snapshot from when the request was *handled*, and a
   * run that finishes while that reply is still being read will have pushed something newer. Without
   * a version, applying the reply last silently rewinds the page to a phase the run has left, and it
   * stays there: nothing else is coming. This is the number that lets the page drop what is old.
   */
  revision?: number;
  phase: 'ready' | 'analysing' | 'reviewing' | 'failed';
  projectName: string;
  /** The directory about to be read, so the first screen can say exactly what it will look at. */
  repositoryPath?: string;
  /**
   * A configuration already in the repository, if there is one.
   *
   * Known before anything is written so the Review step can say which filename it is about to create
   * — being told afterwards that the file is not the one you expected is a bad way to find out.
   */
  existingConfig?: string;
  /** The `--awsAccount` this run was started with; copyable commands name it. */
  awsAccount?: string;
  /** The Console the CLI talks to, without a trailing slash. Links on the page go there, not always to production. */
  consoleUrl?: string;
  /** How the project can be read, best first. Offered before anything runs. */
  agents?: WizardAgentOption[];
  /** What the user picked on the first screen. */
  choice?: { agentId: string; modelId: string };
  /** How much infrastructure this configuration is sized for. */
  mode?: 'low-cost' | 'standard' | 'production';
  /** Explicit choices shown beside the configuration and its current price. */
  preferences?: DeploymentPreferences;
  /** Fact-aware defaults used to mark the recommended card without overriding a changed choice. */
  recommendedPreferences?: DeploymentPreferences;
  /** The database engine versions RDS offers, newest first, by engine: what the version setting lists. */
  engineVersions?: Record<string, string[]>;
  /**
   * The configuration on disk, once the user has asked for it.
   *
   * `existingPath` is set when the repository already had a configuration, which is why the file
   * written is a `.generated.` one — the page has to say so rather than imply the project is ready.
   */
  configFile?: {
    path: string;
    filename: string;
    format: 'yaml' | 'typescript';
    existingPath?: string;
    region?: string;
  };
  /**
   * The region the configuration declares: the written file's, otherwise the one writing it would declare. That is
   * the region the user picked, else the one this machine's AWS setup names, else the pricing default.
   */
  region?: string;
  /** Who this machine is to AWS, resolved before the deploy step offers a button. */
  awsIdentity?: WizardAwsIdentity;
  /**
   * The AWS profiles on this machine and the one the wizard uses. `selected` is absent while the wizard uses the profile
   * the CLI would pick by itself (`AWS_PROFILE`, the Stacktape default, else `default`), which `awsIdentity.profile`
   * names. Absent when profiles cannot be listed or switched here.
   */
  awsProfiles?: { available: WizardAwsProfile[]; selected?: string };
  /**
   * Whether Docker answers on this machine. A release command on an SSR site builds an image, so the page offers it as
   * the migration runner only when it does. Absent until checked.
   */
  docker?: { available: boolean };
  /**
   * Whether this machine is signed in to Stacktape. Neither generating nor deploying needs it: signed out, the deploy
   * runs on this machine's AWS credentials alone. Absent while checking.
   *
   * `email` and `organization` are who the account check found, when it said: enough for the page
   * to confirm which account a deploy will run as.
   */
  stacktapeAccount?: { signedIn: boolean; detail: string; email?: string; organization?: string };
  /**
   * Where signing in from this page has got to. Absent when the session cannot sign anyone in, which
   * leaves the terminal as the only way.
   */
  signIn?: WizardSignIn;
  /** The git host this project pushes to, when it is one we generate a pipeline for. */
  gitHost?: 'github' | 'gitlab' | 'bitbucket';
  /** The deployment pipeline, once one has been asked for. */
  pipeline?: {
    filename: string;
    host: string;
    authSummary: string;
    requiredSecrets: Array<{ name: string; description: string }>;
    existingPath?: string;
  };
  /** The deploy, once one has been asked for. */
  deployment?: WizardDeployment;
  /** The Console, offered or linked once a deploy has succeeded. Absent before that. */
  consoleConnection?: WizardConsoleConnection;
  /**
   * Connecting the coding agent picked on the Start step to Stacktape, offered once a deploy has succeeded. Absent
   * when no coding agent was picked. It changes that agent's user-level configuration, outside the repository, so it
   * happens only when the user clicks.
   */
  codingAgentSetup?: {
    agentId: string;
    label: string;
    status: 'offered' | 'running' | 'connected' | 'failed';
    /** The same change from a terminal. */
    command: string;
    detail?: string;
  };
  /** Exact target observed with the credential/account resolver the deploy child will use. */
  deployTarget?:
    | DeployTargetObservation
    | { status: 'unverified'; stackName: string; stage: string; region: string; detail: string };
  /**
   * The configuration as the user edited it by hand on the Review step. While present it is what gets written and
   * deployed, and the infrastructure settings that would regenerate the file are off.
   *
   * A YAML edit is `yaml`. A TypeScript edit is `typescript`, with `yaml` the configuration it evaluated to last, which
   * the diagram, the price and the secrets read. `error` says why the text does not parse or evaluate, `errorLine`
   * where, when known.
   */
  configEdit?: { yaml: string; typescript?: string; error?: string; errorLine?: number };
  /** Secrets set from the page in this session, by name, and whether the user said the rest already exist. */
  secrets?: { set: string[]; confirmed: boolean; failure?: { name: string; detail: string } };
  /**
   * Secrets the user removed from the configuration on the Deploy step, by name: the variables that read them are gone
   * from the file, until they are put back.
   */
  dismissedSecrets?: string[];
  /** Saving pasted AWS access keys as a profile on this machine. Never carries the keys. */
  awsKeys?: { status: 'saving' | 'saved' | 'failed'; detail?: string; profile?: string };
  /** Folders below the project that look like apps of their own, for an analysis that found nothing to run. */
  nearbyApps?: string[];
  /** What each of `nearbyApps` is written in, by folder, when its marker files say ("Node.js", "Go"). */
  nearbyAppKinds?: Record<string, string>;
  /** Normalised agent timeline, newest last. */
  timeline: Array<{ kind: string; label: string }>;
  facts?: unknown;
  composition?: unknown;
  /** Answers already given, keyed by uncertainty id. */
  answers: Record<string, string>;
  error?: string;
};

export type WizardServerHooks = {
  /** Called when the user answers a question. Returns the state to broadcast afterwards. */
  onAnswer: (uncertaintyId: string, value: string) => Promise<WizardState> | WizardState;
  /**
   * Called when the user starts the analysis.
   *
   * Publishes for itself rather than returning a state, because the run it kicks off outlives this
   * call: a state captured here would be a stale snapshot that overwrites whatever the run has
   * already reported by the time it is broadcast.
   */
  onStart: (choice: {
    agentId: string;
    modelId: string;
    mode?: 'low-cost' | 'standard' | 'production';
  }) => Promise<void> | void;
  /** Legacy mode endpoint retained for headless clients. The browser uses `onPreference`. */
  onMode: (mode: 'low-cost' | 'standard' | 'production') => Promise<WizardState> | WizardState;
  /** Called when one explicit infrastructure preference changes. */
  onPreference: (change: DeploymentPreferenceChange) => Promise<WizardState> | WizardState;
  /**
   * Called when one setting of one resource changes: its size, a standby copy, a domain. The session checks the value
   * against the settings that resource offers before anything is written. Absent, the route answers with the state.
   */
  onSetting?: (change: SettingChange) => Promise<WizardState> | WizardState;
  /** Called when the user asks for the configuration to be written, in the format they chose. */
  onWrite: (format: 'yaml' | 'typescript') => Promise<void> | void;
  /** Called when the user asks to deploy. Publishes for itself, like `onStart`. */
  onDeploy: (input: {
    stage: string;
    region: string;
    expected: { kind: 'check' | 'create' } | { kind: 'update'; stackId: string };
  }) => Promise<void> | void;
  /** Called when the user asks for a deployment pipeline for their git host. */
  onPipeline: (input: { stage: string; region: string }) => Promise<void> | void;
  /**
   * Called when the user has just signed in somewhere and wants the page to notice.
   *
   * Re-resolves the AWS identity and the Stacktape account. Exists so that "run stacktape login,
   * then come back" ends with a button rather than with reloading the page and hoping.
   */
  onRecheck: () => Promise<WizardState> | WizardState;
  /**
   * The region the user picked for the file before it is written. The preview and the price follow it; the price
   * arrives later.
   */
  onRegion?: (region: string) => Promise<WizardState> | WizardState;
  /**
   * Called for every step of signing in from the page: starting the sign-in, choosing an
   * organization, or cancelling.
   *
   * Publishes for itself, like `onDeploy`: the approval arrives minutes after the request that started it.
   */
  onSignIn: (action: WizardSignInAction) => Promise<void> | void;
  /** Called when the user asks to connect their coding agent to Stacktape. Publishes for itself, like `onDeploy`. */
  onCodingAgentSetup: () => Promise<void> | void;
  /**
   * Called when the user accepts or sets aside the Console offer after a deploy. Publishes for itself, like
   * `onSignIn`: signing in and connecting finish minutes after the click.
   */
  onConsoleConnection: (action: 'connect' | 'dismiss') => Promise<void> | void;
  /** The configuration edited by hand, in either format, or `null` to go back to the generated one. */
  onConfigText?: (edit: { yaml: string } | { typescript: string } | null) => Promise<WizardState> | WizardState;
  /**
   * The CloudFormation template the configuration under review compiles to, for the page's read-only view. Compiled
   * on this machine without AWS; absent when the session cannot compile.
   */
  onTemplate?: () => Promise<WizardTemplatePreview>;
  /** Sets one secret the configuration reads, in the user's AWS account. The value is never stored or logged here. */
  onSecret?: (input: { name: string; value: string }) => Promise<WizardState> | WizardState;
  /** The user says the secrets the configuration reads already exist in their AWS account. */
  onSecretsConfirmed?: () => Promise<WizardState> | WizardState;
  /** Saves pasted AWS access keys as a profile on this machine, then checks the identity again. */
  onAwsKeys?: (input: { accessKeyId: string; secretAccessKey: string }) => Promise<WizardState> | WizardState;
  /** Deploys with another AWS profile on this machine: checks who it is, then the target again. */
  onAwsProfile?: (profile: string) => Promise<WizardState> | WizardState;
  /**
   * Removes a secret the app does not need from the configuration (its variables and their `$Secret` references), or
   * puts it back. Refused while the file is edited by hand.
   */
  onDismissSecret?: (input: { name: string; dismissed: boolean }) => Promise<WizardState> | WizardState;
  /**
   * The text of a repository file this session has seen (see `file-view.ts`), for the page's code window. Absent when
   * the session has no repository on disk to read.
   */
  onFile?: (path: string) => Promise<FileView>;
  /**
   * The repository's file names (see `repository-tree.ts`), for the page to draw the project while it is read. Names
   * only. Absent when the session has no repository on disk.
   */
  onTree?: () => Promise<RepositoryTree>;
  /**
   * The values the project's `.env` sets for the secrets the configuration reads, for the Deploy step's "Use the values
   * from .env" (see `environment-values.ts`). They go to the page on this machine and, when the user saves them, into
   * their AWS account; never into a log. Absent when the session has no repository on disk.
   */
  onEnvironmentValues?: () => Promise<EnvironmentValues>;
};

const json = (response: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}) => {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request: IncomingMessage, limitBytes = 64 * 1024): Promise<string> => {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    total += (chunk as Buffer).length;
    // A bounded read: this server is on the user's machine, but an unbounded one is a trivial way
    // for a stray page to exhaust its memory.
    if (total > limitBytes) throw new Error('Request body too large.');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
};

/** Content types for the handful of things a built Vite bundle actually contains. */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  // The `stacktape` type declarations the TypeScript editor checks against (`stacktape-types/*.d.ts`).
  '.ts': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

export type WizardServer = {
  /** The URL to open, carrying the one-time token in its fragment. */
  url: string;
  port: number;
  /** Push a new state to every connected page. */
  publish: (state: WizardState) => void;
  /** The state as last published, for anyone summarising the session after the fact. */
  current: () => WizardState;
  /** Tell every connected page to reload itself. Used when the bundle on disk changes. */
  publishReload: () => void;
  close: () => Promise<void>;
  /**
   * Resolves once the server has shut down, however that came about.
   *
   * `idle` means the server closed itself after a stretch with no page connected and nothing
   * running. The command layer waits on this as well as on Ctrl+C, because a session that ends
   * without it would otherwise just stop existing — no goodbye in the terminal, no telemetry.
   */
  whenClosed: Promise<'idle' | 'explicit'>;
};

/**
 * How long to wait after a change before telling pages to reload.
 *
 * A bundler writes several files per build, and reloading on the first one lands the browser on a
 * half-written bundle. Waiting for the writes to stop costs a moment and avoids a class of confusing
 * failure that looks like a bug in the page.
 */
const RELOAD_DEBOUNCE_MS = 150;

export const startWizardServer = async ({
  initialState,
  hooks,
  idleTimeoutMs = 30 * 60_000,
  staticRoot,
  watchStatic = false,
  configSchemaPath
}: {
  initialState: WizardState;
  hooks: WizardServerHooks;
  idleTimeoutMs?: number;
  /** Reload connected pages when the bundle changes. For working on the wizard itself. */
  watchStatic?: boolean;
  /**
   * The Stacktape config JSON schema, served at `/config-schema.json` for the page's YAML editor (hover docs,
   * completion, validation). Same-origin, so the strict CSP needs no change. Omitted, the editor works without them.
   */
  configSchemaPath?: string;
  /**
   * Directory holding the built wizard bundle.
   *
   * Omitted in tests, which exercise the API without needing a build to exist.
   */
  staticRoot?: string;
}): Promise<WizardServer> => {
  const secrets: SessionSecrets = createSessionSecrets();
  let handshakeSpent = false;
  let revision = 0;
  let state: WizardState = { ...initialState, revision: (revision += 1) };
  const streams = new Set<ServerResponse>();

  let idleTimer: NodeJS.Timeout | undefined;
  let server: Server;
  /** Every open connection, so shutting down does not depend on the browser losing interest first. */
  const sockets = new Set<Socket>();

  let closeReason: 'idle' | 'explicit' = 'explicit';
  let closing: Promise<void> | undefined;
  let resolveWhenClosed: (reason: 'idle' | 'explicit') => void = () => {};
  const whenClosed = new Promise<'idle' | 'explicit'>((resolveClosed) => {
    resolveWhenClosed = resolveClosed;
  });

  /**
   * Whether closing now would take something away from someone.
   *
   * A connected page counts even when nothing is happening — an open tab is a user, and the events
   * feed it holds open makes no HTTP requests, so the idle timer never hears from it. So does work
   * in flight with nobody watching: a database deploy runs longer than any idle timeout, and the
   * page may well have been closed to be reopened later.
   */
  const inUse = (): boolean =>
    streams.size > 0 ||
    state.phase === 'analysing' ||
    state.deployment?.status === 'running' ||
    state.deployment?.status === 'repairing';

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (inUse()) {
        resetIdleTimer();
        return;
      }
      closeReason = 'idle';
      void close();
    }, idleTimeoutMs);
    idleTimer.unref?.();
  };

  const doClose = async (): Promise<void> => {
    if (idleTimer) clearTimeout(idleTimer);
    if (reloadTimer) clearTimeout(reloadTimer);
    watcher?.close();
    for (const stream of streams) stream.end();
    streams.clear();
    // `server.close()` stops accepting and then waits for every open connection — and a browser
    // holds its keep-alive socket open long after the last request. Without destroying them the CLI
    // would sit there after the user pressed Ctrl+C, waiting for a page that has nothing left to say.
    for (const socket of sockets) socket.destroy();
    sockets.clear();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    resolveWhenClosed(closeReason);
  };

  // Idempotent, because both ends of the lifecycle can reach for it: the idle timer closes and then
  // the command layer, told the server is gone, closes again on its way out.
  const close = (): Promise<void> => (closing ??= doClose());

  // Every state the page can see leaves through here, and every one of them is numbered. Serving an
  // unnumbered state anywhere would give the page something it cannot order against the rest.
  const publish = (next: WizardState) => {
    state = { ...next, revision: (revision += 1) };
    const payload = `data: ${JSON.stringify(state)}\n\n`;
    for (const stream of streams) stream.write(payload);
  };

  // A *named* event, so a page can tell "reload yourself" from "here is new state" without having to
  // inspect the payload. Unnamed messages stay the state channel the client already listens to.
  const publishReload = () => {
    for (const stream of streams) stream.write('event: reload\ndata: {}\n\n');
  };

  let watcher: FSWatcher | undefined;
  let reloadTimer: NodeJS.Timeout | undefined;
  if (watchStatic && staticRoot !== undefined) {
    try {
      watcher = watch(staticRoot, { recursive: true }, () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(publishReload, RELOAD_DEBOUNCE_MS);
        reloadTimer.unref?.();
      });
    } catch {
      // Watching is a convenience for whoever is working on the wizard. A platform that will not do
      // recursive watches costs them live reload, never the session.
    }
  }

  const authorised = (request: IncomingMessage): boolean => {
    const cookie = readCookie(request.headers.cookie ?? null, 'stacktape_init');
    return cookie !== undefined && secretsMatch(cookie, secrets.sessionToken);
  };

  server = createServer((request, response) => {
    resetIdleTimer();

    void (async () => {
      const port = (server.address() as AddressInfo | null)?.port ?? 0;
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
      const isNavigation = request.method === 'GET' && request.headers.accept?.includes('text/html') === true;

      if (
        !isSameOrigin({
          origin: request.headers.origin ?? null,
          host: request.headers.host ?? null,
          port,
          secFetchSite: request.headers['sec-fetch-site']?.toString() ?? null,
          isNavigation
        })
      ) {
        json(response, 403, { error: 'This request did not come from the wizard.' });
        return;
      }

      // The handshake: the page arrives with the one-time token, spends it, and receives a cookie
      // plus the CSRF token it must echo from then on.
      if (url.pathname === '/api/handshake' && request.method === 'POST') {
        const token = url.searchParams.get('token') ?? '';
        if (handshakeSpent || !secretsMatch(token, secrets.handshakeToken)) {
          json(response, 401, { error: 'This link has already been used. Start the wizard again.' });
          return;
        }
        handshakeSpent = true;
        json(
          response,
          200,
          { csrfToken: secrets.csrfToken, state },
          { 'Set-Cookie': sessionCookie(secrets.sessionToken) }
        );
        return;
      }

      // Served BEFORE the authorisation gate, and it has to be: the page cannot present a session
      // cookie until it has loaded and run the handshake, so gating the bundle on the cookie means
      // the browser gets "Not authorised" instead of the wizard. The bundle is our own compiled UI,
      // byte-identical for every user and every run — the session data behind the gate below is what
      // actually needs protecting. Restricted to GET and to non-/api/ paths so no API route can ever
      // be shadowed by a file that happens to share its name.
      // The config schema is public product data, the same file the CLI release ships beside its binary.
      if (configSchemaPath !== undefined && request.method === 'GET' && url.pathname === '/config-schema.json') {
        try {
          const body = await readFile(configSchemaPath);
          response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': CONTENT_TYPES['.json']! });
          response.end(body);
        } catch {
          json(response, 404, { error: 'The configuration schema is not available.' });
        }
        return;
      }

      if (staticRoot !== undefined && request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        // Normalised and confined to the bundle directory. The bundle is ours, but the path in the
        // request is not, and `/assets/../../..` is the oldest trick there is.
        const requested = url.pathname === '/' ? 'index.html' : normalize(url.pathname).replace(/^[\/]+/, '');
        if (!requested.split(/[\/]/).includes('..')) {
          try {
            const body = await readFile(join(staticRoot, requested));
            response.writeHead(200, {
              ...SECURITY_HEADERS,
              'Content-Type': CONTENT_TYPES[extname(requested).toLowerCase()] ?? 'application/octet-stream'
            });
            response.end(body);
            return;
          } catch {
            // Falls through: a single-page app asked for a route, not a file.
          }
        }
        try {
          const shell = await readFile(join(staticRoot, 'index.html'));
          response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': CONTENT_TYPES['.html']! });
          response.end(shell);
          return;
        } catch {
          // No bundle built. Falls through to the 404 below, which is the honest answer.
        }
      }

      if (!authorised(request)) {
        json(response, 401, { error: 'Not authorised.' });
        return;
      }

      if (url.pathname === '/api/state' && request.method === 'GET') {
        json(response, 200, state);
        return;
      }

      // Resuming an established session. The handshake token is single-use, so a page reload — which
      // is an entirely ordinary thing to do — has no token to present and must be able to continue
      // on the cookie alone. Without this, opening the wizard and pressing F5 ends the session.
      // Repository content: same cookie as every route, and the CSRF token as well, although it only reads. Which files
      // it may return is decided by `file-view.ts`, not by what the request asks for.
      if (url.pathname === '/api/file' && request.method === 'GET' && hooks.onFile !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        const path = url.searchParams.get('path');
        if (path === null || path.length === 0 || path.length > 1024) {
          json(response, 400, { error: 'Expected a file path.' });
          return;
        }
        json(response, 200, await hooks.onFile(path));
        return;
      }

      // The repository's file names: same cookie and CSRF token as the file route. The session decides what is listed.
      if (url.pathname === '/api/tree' && request.method === 'GET' && hooks.onTree !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        json(response, 200, await hooks.onTree());
        return;
      }

      // Secret values from the project's `.env`: same cookie and CSRF token as the file route, and never logged. The
      // session decides which variables, not the request.
      if (
        url.pathname === '/api/environment-values' &&
        request.method === 'GET' &&
        hooks.onEnvironmentValues !== undefined
      ) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        json(response, 200, await hooks.onEnvironmentValues());
        return;
      }

      if (url.pathname === '/api/session' && request.method === 'GET') {
        json(response, 200, { csrfToken: secrets.csrfToken, state });
        return;
      }

      if (url.pathname === '/api/events' && request.method === 'GET') {
        response.writeHead(200, {
          ...SECURITY_HEADERS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          Connection: 'keep-alive'
        });
        // The current state immediately, so a page that connects late is never blank.
        response.write(`data: ${JSON.stringify(state)}\n\n`);
        streams.add(response);
        request.on('close', () => streams.delete(response));
        return;
      }

      // Starting the analysis is a mutation like any other: same cookie, same CSRF token. It is also
      // the one request that spends the user's agent subscription, which is exactly why it is a
      // request at all rather than something that happened before they saw the screen.
      if (url.pathname === '/api/start' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as {
            agentId?: unknown;
            modelId?: unknown;
            mode?: unknown;
          };
          if (typeof body.agentId !== 'string' || typeof body.modelId !== 'string') {
            json(response, 400, { error: 'Expected an agentId and a modelId.' });
            return;
          }
          // Also a closed vocabulary: the mode names a sizing profile, so an unknown one is a
          // rejected request rather than a new kind of infrastructure.
          if (
            body.mode !== undefined &&
            body.mode !== 'low-cost' &&
            body.mode !== 'standard' &&
            body.mode !== 'production'
          ) {
            json(response, 400, { error: 'That is not one of the infrastructure modes.' });
            return;
          }
          await hooks.onStart({
            agentId: body.agentId,
            modelId: body.modelId,
            ...(body.mode === undefined ? {} : { mode: body.mode as 'low-cost' | 'standard' | 'production' })
          });
          // Whatever the hook published, which may already be further along than "started".
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/mode' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { mode?: unknown };
          // The same closed vocabulary as /api/start: a mode names a sizing profile, so an unknown
          // one is a rejected request rather than a new kind of infrastructure.
          if (body.mode !== 'low-cost' && body.mode !== 'standard' && body.mode !== 'production') {
            json(response, 400, { error: 'That is not one of the infrastructure modes.' });
            return;
          }
          json(response, 200, await hooks.onMode(body.mode));
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/preferences' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body: unknown = JSON.parse(await readBody(request));
          if (!isDeploymentPreferenceChange(body)) {
            json(response, 400, { error: 'That is not a supported infrastructure preference.' });
            return;
          }
          json(response, 200, await hooks.onPreference(body));
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/setting' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body: unknown = JSON.parse(await readBody(request));
          // Only the shape here; whether the resource offers that setting and value is the session's to check.
          if (!isSettingChange(body)) {
            json(response, 400, { error: 'That is not a resource setting.' });
            return;
          }
          json(response, 200, hooks.onSetting === undefined ? state : await hooks.onSetting(body));
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/recheck' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          json(response, 200, await hooks.onRecheck());
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/region' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { region?: unknown };
          if (typeof body.region !== 'string' || !/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(body.region)) {
            json(response, 400, { error: 'That is not an AWS region.' });
            return;
          }
          json(response, 200, hooks.onRegion === undefined ? state : await hooks.onRegion(body.region));
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // Signing in to Stacktape from the page. One prefix for every step, so the CSRF gate cannot be
      // forgotten on one of them; the route names the step and the body is read against that step's
      // exact shape. No credential ever arrives here: the person signs in on the Console page, and
      // the token the CLI receives for it stays in the sign-in flow.
      if (url.pathname.startsWith('/api/sign-in/') && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const text = await readBody(request);
          const body: unknown = text.trim() === '' ? {} : JSON.parse(text);
          const action = parseSignInAction(url.pathname.slice('/api/sign-in/'.length), body);
          if (action === undefined) {
            json(response, 400, { error: 'That is not a supported sign-in request.' });
            return;
          }
          await hooks.onSignIn(action);
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // Writing to the user's repository. Same gate as everything else that changes something, and
      // the format is checked here rather than trusted, because it decides a filename.
      if (url.pathname === '/api/write' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { format?: unknown };
          if (body.format !== 'yaml' && body.format !== 'typescript') {
            json(response, 400, { error: 'Expected a format of yaml or typescript.' });
            return;
          }
          await hooks.onWrite(body.format);
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // The only request in this server that spends money. Same CSRF gate as the rest; the stage and
      // region are validated by shape here and by the CLI itself when it runs.
      if (url.pathname === '/api/deploy' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as {
            stage?: unknown;
            region?: unknown;
            expected?: { kind?: unknown; stackId?: unknown };
          };
          // Both end up on a command line, so both are checked against the shapes AWS and Stacktape
          // accept rather than passed through as free text.
          if (
            typeof body.stage !== 'string' ||
            !/^[a-z0-9-]{1,12}$/.test(body.stage) ||
            typeof body.region !== 'string' ||
            !/^[a-z]{2}(-gov)?-[a-z]+-\d$/.test(body.region)
          ) {
            json(response, 400, { error: 'Expected a stage of up to 12 lowercase characters and an AWS region.' });
            return;
          }
          const expected = body.expected;
          if (
            expected === undefined ||
            (expected.kind !== 'check' && expected.kind !== 'create' && expected.kind !== 'update')
          ) {
            json(response, 400, { error: 'Expected a closed deploy-target confirmation.' });
            return;
          }
          let confirmedExpected: { kind: 'check' | 'create' } | { kind: 'update'; stackId: string };
          if (expected.kind === 'update') {
            if (
              typeof expected.stackId !== 'string' ||
              expected.stackId.length < 1 ||
              expected.stackId.length > 2_048
            ) {
              json(response, 400, { error: 'Expected the reviewed stack id for an update.' });
              return;
            }
            confirmedExpected = { kind: 'update', stackId: expected.stackId };
          } else {
            confirmedExpected = { kind: expected.kind };
          }
          await hooks.onDeploy({
            stage: body.stage,
            region: body.region,
            expected: confirmedExpected
          });
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // Writes a pipeline file into the repository. Same gate, same shape checks as the deploy it
      // will eventually run.
      if (url.pathname === '/api/pipeline' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { stage?: unknown; region?: unknown };
          if (
            typeof body.stage !== 'string' ||
            !/^[a-z0-9-]{1,12}$/.test(body.stage) ||
            typeof body.region !== 'string' ||
            !/^[a-z]{2}(-gov)?-[a-z]+-\d$/.test(body.region)
          ) {
            json(response, 400, { error: 'Expected a stage of up to 12 lowercase characters and an AWS region.' });
            return;
          }
          await hooks.onPipeline({ stage: body.stage, region: body.region });
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // Changes the coding agent's user-level configuration. No body: the agent is the one picked on the Start step,
      // which the page names on the button.
      if (url.pathname === '/api/coding-agent-setup' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          await hooks.onCodingAgentSetup();
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // Accepts or sets aside the Console offer. The action is in the path; there is no body.
      if (url.pathname.startsWith('/api/console-connection/') && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        const action = url.pathname.slice('/api/console-connection/'.length);
        if (action !== 'connect' && action !== 'dismiss') {
          json(response, 404, { error: 'Not found.' });
          return;
        }
        try {
          await hooks.onConsoleConnection(action);
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      // The four requests below carry what the user typed: a configuration, a secret value, AWS keys. Each is
      // shape-checked here, and none of it is echoed in an error or written to a log.
      if (url.pathname === '/api/config-text' && request.method === 'POST' && hooks.onConfigText !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request, 512 * 1024)) as { yaml?: unknown; typescript?: unknown };
          const edit =
            typeof body.typescript === 'string'
              ? { typescript: body.typescript }
              : typeof body.yaml === 'string'
                ? { yaml: body.yaml }
                : body.yaml === null
                  ? null
                  : undefined;
          const text = edit === null || edit === undefined ? '' : 'yaml' in edit ? edit.yaml : edit.typescript;
          if (edit === undefined || text.length > 256 * 1024) {
            json(response, 400, { error: 'Expected the configuration text, or null.' });
            return;
          }
          json(response, 200, await hooks.onConfigText(edit));
        } catch {
          json(response, 400, { error: 'Bad request.' });
        }
        return;
      }

      // The compiled template: same cookie and CSRF token as the file route. It only reads, and compiling can take a
      // second, so the page asks for it when it shows it rather than with every state.
      if (url.pathname === '/api/template' && request.method === 'GET' && hooks.onTemplate !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        json(response, 200, await hooks.onTemplate());
        return;
      }

      if (url.pathname === '/api/secret' && request.method === 'POST' && hooks.onSecret !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { name?: unknown; value?: unknown };
          if (
            typeof body.name !== 'string' ||
            !/^[A-Za-z0-9_./+=@-]{1,256}$/.test(body.name) ||
            typeof body.value !== 'string' ||
            body.value.length === 0 ||
            body.value.length > 32 * 1024
          ) {
            json(response, 400, { error: 'Expected a secret name and a value of up to 32 KB.' });
            return;
          }
          json(response, 200, await hooks.onSecret({ name: body.name, value: body.value }));
        } catch {
          json(response, 400, { error: 'Bad request.' });
        }
        return;
      }

      if (
        url.pathname === '/api/secrets/confirm' &&
        request.method === 'POST' &&
        hooks.onSecretsConfirmed !== undefined
      ) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        json(response, 200, await hooks.onSecretsConfirmed());
        return;
      }

      if (url.pathname === '/api/aws-keys' && request.method === 'POST' && hooks.onAwsKeys !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { accessKeyId?: unknown; secretAccessKey?: unknown };
          if (
            typeof body.accessKeyId !== 'string' ||
            !/^[A-Z0-9]{16,128}$/.test(body.accessKeyId) ||
            typeof body.secretAccessKey !== 'string' ||
            !/^[A-Za-z0-9/+=]{16,128}$/.test(body.secretAccessKey)
          ) {
            json(response, 400, {
              error:
                'Those do not look like AWS access keys. The key ID starts with AKIA and the secret is 40 characters.'
            });
            return;
          }
          json(
            response,
            200,
            await hooks.onAwsKeys({ accessKeyId: body.accessKeyId, secretAccessKey: body.secretAccessKey })
          );
        } catch {
          json(response, 400, { error: 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/aws-profile' && request.method === 'POST' && hooks.onAwsProfile !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { profile?: unknown };
          // Only a name the session listed is used; the shape check keeps anything else out of an argument list.
          if (typeof body.profile !== 'string' || !/^[A-Za-z0-9_.+=@-]{1,128}$/.test(body.profile)) {
            json(response, 400, { error: 'Expected the name of an AWS profile on this machine.' });
            return;
          }
          json(response, 200, await hooks.onAwsProfile(body.profile));
        } catch {
          json(response, 400, { error: 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/secret-dismiss' && request.method === 'POST' && hooks.onDismissSecret !== undefined) {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { name?: unknown; dismissed?: unknown };
          if (
            typeof body.name !== 'string' ||
            !/^[A-Za-z0-9_./+=@-]{1,256}$/.test(body.name) ||
            typeof body.dismissed !== 'boolean'
          ) {
            json(response, 400, { error: 'Expected a secret name and whether to remove it.' });
            return;
          }
          json(response, 200, await hooks.onDismissSecret({ name: body.name, dismissed: body.dismissed }));
        } catch {
          json(response, 400, { error: 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/answer' && request.method === 'POST') {
        // A cookie alone would let any other page trigger this, so a mutation must also echo the
        // CSRF token, which only the wizard page ever received.
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          const body = JSON.parse(await readBody(request)) as { id?: unknown; value?: unknown };
          if (typeof body.id !== 'string' || typeof body.value !== 'string') {
            json(response, 400, { error: 'Expected an id and a value.' });
            return;
          }
          publish(await hooks.onAnswer(body.id, body.value));
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      json(response, 404, { error: 'Not found.' });
    })().catch(() => {
      if (!response.headersSent) json(response, 500, { error: 'Internal error.' });
    });
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise<void>((resolveListen) => {
    // Port 0 asks the OS for a free port; binding to 127.0.0.1 specifically keeps this off every
    // other interface, so it is unreachable from the network however the machine is configured.
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  resetIdleTimer();

  const port = (server.address() as AddressInfo).port;
  return {
    port,
    publishReload,
    // The token rides in the fragment: fragments are never sent to a server, so it cannot leak
    // through a proxy log or a Referer header on the way in.
    url: `http://127.0.0.1:${port}/#token=${secrets.handshakeToken}`,
    publish,
    current: () => state,
    close,
    whenClosed
  };
};
