/**
 * Talking to the CLI that opened this page.
 *
 * The page arrives with a one-time token in its fragment, spends it immediately, and from then on
 * holds a cookie plus a CSRF token. Reading the fragment and then clearing it matters: a URL sitting
 * in the address bar is one screenshot or one shared link away from being someone else's, and the
 * token is single-use anyway, so leaving it visible only invites confusion when it stops working.
 */

export type InfrastructureMode = 'low-cost' | 'standard' | 'production';

/** A decision taken on the user's behalf, with what else it could have been. */
export type WizardDecision = {
  id: string;
  kind: string;
  /** The value that was used. */
  chosen: string;
  /** Everything else it could be, so the control never invents an option. */
  alternatives: string[];
  parameters: Record<string, unknown>;
  evidence: Array<{ file: string; line: number; quote: string; field?: string }>;
  /** Worth a glance: getting this one wrong is discovered in production. */
  notable: boolean;
};

type WizardService = {
  name: string;
  path: string;
  language: string;
  framework?: string;
  exposesHttp: boolean;
  port?: number;
  executionModel: 'long-running' | 'per-request' | 'scheduled';
  servesStaticAssets?: { path: string };
  functionTriggers?: Array<{ type: string }>;
  source: 'probe' | 'agent';
  evidence: Array<{ file: string; line: number; quote: string }>;
};

type WizardDependency = {
  name: string;
  kind: string;
  consumedBy: string[];
  currentlyHostedOn?: string;
  source: 'probe' | 'agent';
  evidence: Array<{ file: string; line: number; quote: string }>;
};

type WizardExistingDeployment = {
  tool: string;
  managesAws: boolean;
};

type WizardModelOption = { id: string; label: string; description: string };

export type WizardAgentOption = {
  id: string;
  label: string;
  version?: string;
  description: string;
  models: WizardModelOption[];
  recommended?: boolean;
};

export type WizardState = {
  /** Server-assigned, increasing on every update. See `publish` below for what it is for. */
  revision?: number;
  phase: 'ready' | 'analysing' | 'reviewing' | 'failed';
  projectName: string;
  /** The directory the scan will read. Shown before anything runs. */
  repositoryPath?: string;
  /** A configuration already in the repository. It is never modified; the new one lands beside it. */
  existingConfig?: string;
  /** How the project can be read. Chosen on the first screen. */
  agents?: WizardAgentOption[];
  choice?: { agentId: string; modelId: string };
  /** How much infrastructure this configuration is sized for. */
  mode?: InfrastructureMode;
  /** Set once the configuration is on disk. `existingPath` means this is a file written beside one. */
  configFile?: { path: string; filename: string; format: 'yaml' | 'typescript'; existingPath?: string };
  /** Who this machine is to AWS. Absent until the check has answered. */
  awsIdentity?:
    | { available: true; accountId: string; arn: string; region?: string }
    | { available: false; reason: 'no-credentials' | 'rejected'; detail: string };
  /** Deploying needs a signed-in Stacktape account; generating never does. Absent while checking. */
  stacktapeAccount?: { signedIn: boolean; detail: string };
  /** The git host this project pushes to, when it is one we generate a pipeline for. */
  gitHost?: 'github' | 'gitlab' | 'bitbucket';
  /** The deployment pipeline, once one has been written. */
  pipeline?: {
    filename: string;
    host: string;
    authSummary: string;
    requiredSecrets: Array<{ name: string; description: string }>;
    existingPath?: string;
  };
  /** The deploy, once one has been asked for. `events` is the CLI's own JSONL stream. */
  deployment?: {
    /** `repairing` means the deploy failed and the agent is working out what we got wrong. */
    status: 'running' | 'repairing' | 'succeeded' | 'failed';
    stage: string;
    region: string;
    commandLine: string;
    events: unknown[];
    lines: string[];
    outcome?: { ok: boolean; code: string; message: string };
    /**
     * One entry per failed attempt the agent was asked about. `applied` means it changed the file;
     * `changedResources` names where, computed by diffing — never taken from the agent's words.
     */
    repairs?: Array<{ attempt: number; applied: boolean; changedResources?: string[] }>;
    /** A failed attempt left its progress standing (a retry over an existing stack). It still bills. */
    keptPartialProgress?: boolean;
    /** Typed deployed-resource URLs; never inferred from build or application logs. */
    urls?: string[];
  };
  /** Exact CloudFormation target observed with the credentials the deploy command will use. */
  deployTarget?:
    | {
        status: 'absent';
        accountId: string;
        stackName: string;
        projectName: string;
        stage: string;
        region: string;
      }
    | {
        status: 'updateable';
        accountId: string;
        stackName: string;
        projectName: string;
        stage: string;
        region: string;
        stackId: string;
        stackStatus: string;
        createdAt?: string;
        updatedAt?: string;
      }
    | {
        status: 'blocked';
        accountId: string;
        stackName: string;
        projectName: string;
        stage: string;
        region: string;
        reason: 'foreign-stack' | 'identity-mismatch' | 'unsafe-status' | 'incomplete-stack-data';
        stackId?: string;
        stackStatus?: string;
      }
    | { status: 'unverified'; stackName: string; stage: string; region: string; detail: string };
  /**
   * The local try-out of the composed services, once one has been asked for.
   *
   * `dismissed` keeps the last results visible while removing their hold on the deploy button.
   * Absent until the user clicks — running their code is a permission the page never assumes.
   */
  verification?: {
    status: 'running' | 'repairing' | 'completed' | 'unavailable' | 'dismissed';
    services?: Array<{
      serviceName: string;
      resourceName: string;
      status: 'passed' | 'failed' | 'inconclusive' | 'skipped';
      reason: string;
      observations: {
        listeningPorts: number[];
        dialedDependency: boolean;
        missingEnvironmentVariables: string[];
        logTail: string[];
      };
    }>;
  };
  timeline: Array<{ kind: string; label: string }>;
  facts?: {
    services: WizardService[];
    dependencies: WizardDependency[];
    existingDeployments: WizardExistingDeployment[];
    decisions: WizardDecision[];
  };
  composition?: {
    resources: Record<string, { type: string; properties: Record<string, unknown> }>;
    provenance: Record<string, { reason: string; evidence: Array<{ file: string; line: number; quote: string }> }>;
    gaps: Array<{ subject: string; message: string }>;
    deployable: boolean;
    /**
     * What this would cost per month, once the estimate comes back.
     *
     * Absent until then, and absent for good if the machine is offline. The review screen renders
     * without it rather than waiting for it.
     */
    price?: { monthly: string; byResource: Record<string, string>; region: string };
    /** The real monthly figure per size, as each estimate lands, so the size cards can compare. */
    modePrices?: Partial<Record<InfrastructureMode, string>>;
    /**
     * The configuration file exactly as saving it will write it.
     *
     * YAML arrives with the composition; the TypeScript rendering is formatted server-side and
     * lands a beat later, so it is optional until then.
     */
    configText?: { yaml: string; typescript?: string };
  };
  answers: Record<string, string>;
  error?: string;
};

export class SessionError extends Error {}

/** Reads the handshake token out of the fragment and removes it from the address bar. */
const takeTokenFromFragment = (): string | undefined => {
  const match = /(?:^|[#&])token=([^&]+)/.exec(window.location.hash);
  if (match === null) return undefined;
  window.history.replaceState(null, '', window.location.pathname);
  return decodeURIComponent(match[1]!);
};

export type Session = {
  state: WizardState;
  /** Begin reading the project with the chosen agent. Nothing is read before this. */
  start: (agentId: string, modelId: string) => Promise<WizardState>;
  /** Change how big the infrastructure should be. The configuration and price are rebuilt from it. */
  setMode: (mode: InfrastructureMode) => Promise<WizardState>;
  /** Write the configuration to the repository, in the format chosen on the Review step. */
  write: (format: 'yaml' | 'typescript') => Promise<WizardState>;
  /** Deploy it. The only thing in this wizard that creates anything outside the repository. */
  deploy: (
    stage: string,
    region: string,
    expected: { kind: 'check' | 'create' } | { kind: 'update'; stackId: string }
  ) => Promise<WizardState>;
  /** Try the composed services on this machine. The click is the consent to run the project's code. */
  verify: () => Promise<WizardState>;
  /** Set a verification result aside: it stays visible, but stops holding the deploy button. */
  dismissVerification: () => Promise<WizardState>;
  /** Write a deployment pipeline for the project's git host. */
  pipeline: (stage: string, region: string) => Promise<WizardState>;
  /** Re-check AWS credentials and the Stacktape sign-in, after the user fixed one in a terminal. */
  recheck: () => Promise<WizardState>;
  answer: (questionId: string, value: string) => Promise<WizardState>;
  /** Calls back on every server-pushed update and connection transition. */
  subscribe: (
    onState: (state: WizardState) => void,
    onConnectionState?: (state: 'connected' | 'reconnecting') => void
  ) => () => void;
};

export const connect = async (): Promise<Session> => {
  const token = takeTokenFromFragment();

  // Two ways in, tried in order, because the token is single-use and gets spent by whichever load
  // happens first — often the one the CLI performs when it opens your browser for you. Insisting on
  // the token would then make an ordinary reload, or opening the same link in a second tab, look
  // like the session had ended.
  let response: Response | undefined;
  if (token !== undefined) {
    response = await fetch(`/api/handshake?token=${encodeURIComponent(token)}`, { method: 'POST' });
  }
  if (response === undefined || !response.ok) {
    // Either there was no token, or it had already been spent. Both are fine if this browser is
    // already holding the session cookie.
    response = await fetch('/api/session');
  }

  if (!response.ok) {
    throw new SessionError(
      'This wizard session is no longer available in this browser. Run `stacktape init` again to start a new one.'
    );
  }

  const { csrfToken, state } = (await response.json()) as { csrfToken: string; state: WizardState };
  let current = state;
  const listeners = new Set<(next: WizardState) => void>();

  /**
   * Apply a state, unless something newer has already been applied.
   *
   * Two channels deliver state — the reply to a request this page made, and the event stream — and
   * they race. A reply describes the moment the request was handled; by the time its body has been
   * read, a run that finished in the meantime has already pushed something newer. Applying the reply
   * afterwards rewinds the page to a phase that has been left behind, and nothing arrives later to
   * correct it. So the newest revision wins, whichever channel it came from.
   */
  const publish = (next: WizardState) => {
    if ((next.revision ?? 0) < (current.revision ?? 0)) return;
    current = next;
    for (const listener of listeners) listener(next);
  };

  return {
    get state() {
      return current;
    },
    start: async (agentId, modelId) => {
      const started = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ agentId, modelId })
      });
      if (!started.ok) {
        throw new SessionError('That analysis could not be started.');
      }
      const next = (await started.json()) as WizardState;
      publish(next);
      return current;
    },
    write: async (format) => {
      const wrote = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ format })
      });
      if (!wrote.ok) {
        throw new SessionError('The configuration could not be written.');
      }
      publish((await wrote.json()) as WizardState);
      return current;
    },
    deploy: async (stage, region, expected) => {
      const deploying = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ stage, region, expected })
      });
      if (!deploying.ok) {
        const problem = (await deploying.json().catch(() => ({}))) as { error?: string };
        throw new SessionError(problem.error ?? 'The deploy could not be started.');
      }
      publish((await deploying.json()) as WizardState);
      return current;
    },
    verify: async () => {
      const verifying = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: '{}'
      });
      if (!verifying.ok) {
        throw new SessionError('The local try-out could not be started.');
      }
      publish((await verifying.json()) as WizardState);
      return current;
    },
    dismissVerification: async () => {
      const dismissed = await fetch('/api/verify/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: '{}'
      });
      if (!dismissed.ok) {
        throw new SessionError('Could not set the result aside.');
      }
      publish((await dismissed.json()) as WizardState);
      return current;
    },
    pipeline: async (stage, region) => {
      const written = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ stage, region })
      });
      if (!written.ok) {
        throw new SessionError('The pipeline could not be written.');
      }
      publish((await written.json()) as WizardState);
      return current;
    },
    setMode: async (mode) => {
      const changed = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ mode })
      });
      if (!changed.ok) {
        throw new SessionError('That size could not be applied.');
      }
      publish((await changed.json()) as WizardState);
      return current;
    },
    recheck: async () => {
      const checked = await fetch('/api/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: '{}'
      });
      if (!checked.ok) {
        throw new SessionError('Could not re-check the sign-ins.');
      }
      publish((await checked.json()) as WizardState);
      return current;
    },
    answer: async (questionId, value) => {
      const answered = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ id: questionId, value })
      });
      if (!answered.ok) {
        throw new SessionError('That answer could not be recorded.');
      }
      const next = (await answered.json()) as WizardState;
      publish(next);
      // `current`, not `next`: the reply may already have been superseded by the stream, and the
      // caller should be told what the page is showing rather than what this request happened to see.
      return current;
    },
    subscribe: (onState, onConnectionState) => {
      listeners.add(onState);
      // One EventSource per subscriber is wasteful, but a wizard has one subscriber and the
      // alternative is a shared connection with its own lifecycle to get wrong.
      const stream = new EventSource('/api/events');
      stream.addEventListener('open', () => onConnectionState?.('connected'));
      // EventSource retries automatically. Naming that state prevents a dead CLI or broken tunnel
      // from looking like a long operation whose progress simply stopped.
      stream.addEventListener('error', () => onConnectionState?.('reconnecting'));
      // Sent when the bundle on disk changes, so working on the wizard does not mean restarting the
      // CLI and losing the session to see a style change.
      stream.addEventListener('reload', () => window.location.reload());
      stream.addEventListener('message', (event) => {
        try {
          publish(JSON.parse(event.data) as WizardState);
        } catch {
          // A malformed frame is not worth tearing the page down for; the next one will be fine.
        }
      });
      return () => {
        stream.close();
        listeners.delete(onState);
      };
    }
  };
};
