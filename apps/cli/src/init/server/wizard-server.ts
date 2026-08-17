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
import type { ServicePreflightResult } from '../preflight/preflight';
import { AddressInfo, type Socket } from 'node:net';
import { extname, join, normalize } from 'node:path';
import type { DeployTargetObservation } from '../deploy/stack-expectation';
import {
  isDeploymentPreferenceChange,
  type DeploymentPreferenceChange,
  type DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import {
  createSessionSecrets,
  isSameOrigin,
  readCookie,
  secretsMatch,
  SECURITY_HEADERS,
  sessionCookie,
  type SessionSecrets
} from './security';

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
};

/**
 * What AWS says about this machine's credentials.
 *
 * The account id and the principal ARN are shown to the user before they deploy, because "which
 * account" is the one thing they must confirm and the one thing no tool should assume. No secret is
 * involved: this is the identity, never the credentials behind it.
 */
export type WizardAwsIdentity =
  | { available: true; accountId: string; arn: string; region?: string }
  | { available: false; reason: 'no-credentials' | 'rejected'; detail: string };

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
  events: unknown[];
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
  /** Typed deployed-resource URLs resolved after success; never scraped from repository output. */
  urls?: string[];
};

/** What the page renders. Serialised as-is, so nothing here may contain a secret. */
export type WizardVerification = {
  /** `repairing` means it failed here and the agent is working out what we got wrong — locally. */
  status: 'running' | 'repairing' | 'completed' | 'unavailable' | 'dismissed';
  /** Per-service outcomes, once there are any. Shape owned by the preflight engine. */
  services?: ServicePreflightResult[];
};

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
  /**
   * The configuration on disk, once the user has asked for it.
   *
   * `existingPath` is set when the repository already had a configuration, which is why the file
   * written is a `.generated.` one — the page has to say so rather than imply the project is ready.
   */
  configFile?: { path: string; filename: string; format: 'yaml' | 'typescript'; existingPath?: string };
  /** Who this machine is to AWS, resolved before the deploy step offers a button. */
  awsIdentity?: WizardAwsIdentity;
  /** Deploying needs a signed-in Stacktape account; generating never does. Absent while checking. */
  stacktapeAccount?: { signedIn: boolean; detail: string };
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
  /** Exact target observed with the credential/account resolver the deploy child will use. */
  deployTarget?:
    | DeployTargetObservation
    | { status: 'unverified'; stackName: string; stage: string; region: string; detail: string };
  /**
   * The local try-out of the composed services, once the user has asked for one.
   *
   * Never present before they ask: running repository code is a permission, and the request that
   * grants it is the click itself. `dismissed` keeps the last results visible while removing their
   * hold on the deploy button — the user has seen them and decided to proceed anyway.
   */
  verification?: WizardVerification;
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
  /** Called when the user asks for the configuration to be written, in the format they chose. */
  onWrite: (format: 'yaml' | 'typescript') => Promise<void> | void;
  /** Called when the user asks to deploy. Publishes for itself, like `onStart`. */
  onDeploy: (input: {
    stage: string;
    region: string;
    expected: { kind: 'check' | 'create' } | { kind: 'update'; stackId: string };
  }) => Promise<void> | void;
  /**
   * Called when the user consents to trying the composed services on this machine.
   *
   * The click is the consent: nothing runs repository code before it. Publishes for itself, like
   * `onDeploy` — a build takes long enough that the answer arrives over the event stream.
   */
  onVerify: () => Promise<void> | void;
  /** Called when the user sets a verification result aside. Returns the state to broadcast. */
  onVerifyDismiss: () => Promise<WizardState> | WizardState;
  /** Called when the user asks for a deployment pipeline for their git host. */
  onPipeline: (input: { stage: string; region: string }) => Promise<void> | void;
  /**
   * Called when the user has just signed in somewhere and wants the page to notice.
   *
   * Re-resolves the AWS identity and the Stacktape account. Exists so that "run stacktape login,
   * then come back" ends with a button rather than with reloading the page and hoping.
   */
  onRecheck: () => Promise<WizardState> | WizardState;
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
  watchStatic = false
}: {
  initialState: WizardState;
  hooks: WizardServerHooks;
  idleTimeoutMs?: number;
  /** Reload connected pages when the bundle changes. For working on the wizard itself. */
  watchStatic?: boolean;
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
    state.deployment?.status === 'repairing' ||
    state.verification?.status === 'running' ||
    state.verification?.status === 'repairing';

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

      // Consent to run the repository's own code locally. No body: the click is the whole request,
      // and everything it may touch — the composed services — is already in the session.
      if (url.pathname === '/api/verify' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          await hooks.onVerify();
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
        }
        return;
      }

      if (url.pathname === '/api/verify/dismiss' && request.method === 'POST') {
        if (!secretsMatch(request.headers['x-csrf-token']?.toString() ?? '', secrets.csrfToken)) {
          json(response, 403, { error: 'Missing or invalid CSRF token.' });
          return;
        }
        try {
          publish(await hooks.onVerifyDismiss());
          json(response, 200, state);
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : 'Bad request.' });
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
