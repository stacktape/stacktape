/**
 * Talking to the CLI that opened this page.
 *
 * The page arrives with a one-time token in its fragment, spends it immediately, and from then on
 * holds a cookie plus a CSRF token. Reading the fragment and then clearing it matters: a URL sitting
 * in the address bar is one screenshot or one shared link away from being someone else's, and the
 * token is single-use anyway, so leaving it visible only invites confusion when it stops working.
 */

import type { DeployResource } from './deploy-model';
import type {
  DeploymentPreferenceChange,
  DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import type { SettingChange } from '@stacktape/config-inference/compose/resource-settings';

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

/** An AWS profile on this machine, as `~/.aws` declares it: its name, how it signs in, and its region. */
export type WizardAwsProfile = { name: string; kind: 'sso' | 'keys' | 'role' | 'other'; region?: string };

export type WizardAgentOption = {
  id: string;
  label: string;
  version?: string;
  description: string;
  models: WizardModelOption[];
  recommended?: boolean;
  /** One Stacktape can drive that is not on this machine: shown so people know it exists, never started. */
  installed?: false;
};

/** What went wrong at the current sign-in step. `code` selects the way out the panel offers. */
export type WizardSignInError = { code: string; message: string };

/**
 * Where signing in to Stacktape from this page has got to, one step at a time.
 *
 * Held by the CLI, so a reload lands on the same step. It never contains a token or the API key:
 * those stay in the CLI's memory. The user code is meant to be shown; it cannot sign anyone in.
 */
export type WizardSignIn =
  | { step: 'signed-out'; error?: WizardSignInError }
  /** Waiting for approval in the Console tab. The addresses are here so the tab can be opened again. */
  | {
      step: 'waiting';
      userCode: string;
      verificationUri: string;
      verificationUriComplete: string;
      /** Milliseconds since the epoch. */
      expiresAt: number;
    }
  | { step: 'needs-organization'; organizations: Array<{ id: string; name: string }>; error?: WizardSignInError };

/** One step of signing in, as sent to the CLI. The route names the step; the rest is its body. */
export type SignInRequest = { route: 'start' | 'cancel' } | { route: 'organization'; organizationId: string };

export type WizardState = {
  /** Server-assigned, increasing on every update. See `publish` below for what it is for. */
  revision?: number;
  phase: 'ready' | 'analysing' | 'reviewing' | 'failed';
  projectName: string;
  /** The directory the scan will read. Shown before anything runs. */
  repositoryPath?: string;
  /** A configuration already in the repository. It is never modified; the new one lands beside it. */
  existingConfig?: string;
  /** The `--aws-account` the CLI was started with. Every copyable stack command names it. */
  awsAccount?: string;
  /** The Console the CLI talks to, without a trailing slash. Production when absent. */
  consoleUrl?: string;
  /** How the project can be read. Chosen on the first screen. */
  agents?: WizardAgentOption[];
  choice?: { agentId: string; modelId: string };
  /** How much infrastructure this configuration is sized for. */
  mode?: 'low-cost' | 'standard' | 'production';
  preferences?: DeploymentPreferences;
  recommendedPreferences?: DeploymentPreferences;
  /** The database engine versions RDS offers, newest first, by engine: what a version setting lists. */
  engineVersions?: Record<string, string[]>;
  /** Set once the configuration is on disk. `existingPath` means this is a file written beside one. */
  configFile?: {
    path: string;
    filename: string;
    format: 'yaml' | 'typescript';
    existingPath?: string;
    region?: string;
  };
  /** The region the file declares: the written file's, otherwise the one writing it would declare. */
  region?: string;
  /** Who this machine is to AWS. Absent until the check has answered. */
  awsIdentity?:
    | { available: true; accountId: string; arn: string; region?: string; profile?: string; accountAlias?: string }
    | { available: false; reason: 'no-credentials' | 'rejected'; detail: string; profile?: string };
  /**
   * The AWS profiles on this machine (names and how they sign in, never keys) and the one picked on this page. Absent
   * `selected`: the profile the CLI picks by itself, which `awsIdentity.profile` names.
   */
  awsProfiles?: { available: WizardAwsProfile[]; selected?: string };
  /** Whether Docker answers on this machine, which a release command on an SSR site needs. Absent until checked. */
  docker?: { available: boolean };
  /**
   * Whether this machine is signed in to Stacktape. Nothing in the wizard needs it: signed out, the deploy runs on this
   * machine's AWS credentials alone. Absent while checking. `email` and `organization` are present when the account
   * check could name them.
   */
  stacktapeAccount?: { signedIn: boolean; detail: string; email?: string; organization?: string };
  /** The sign-in step to render while signed out. Absent when this CLI cannot sign in from the page. */
  signIn?: WizardSignIn;
  /**
   * The Console after a successful deploy. `linked`: the deploy ran signed in, so the stage is already there. Any other
   * status belongs to a deploy that ran without an account, and says how far connecting it has got.
   */
  consoleConnection?:
    | { status: 'linked' | 'offered' | 'dismissed' | 'signing-in' | 'connecting' | 'connected' }
    | { status: 'failed'; detail: string };
  /**
   * Connecting the coding agent picked on the Start step to Stacktape, offered once a deploy has succeeded. It changes
   * that agent's user-level configuration, outside the repository, so it happens only on a click.
   */
  codingAgentSetup?: {
    agentId: string;
    label: string;
    status: 'offered' | 'running' | 'connected' | 'failed';
    /** The same change from a terminal. */
    command: string;
    detail?: string;
  };
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
    /** When this attempt began; the event list is capped, so its first entry cannot say. */
    startedAt?: string;
    events: unknown[];
    /**
     * Every AWS resource this attempt's CloudFormation progress named, with its state and times. Kept whole however
     * long the deploy runs, unlike `events`.
     */
    resources?: DeployResource[];
    lines: string[];
    outcome?: { ok: boolean; code: string; message: string };
    /**
     * One entry per failed attempt the agent was asked about. `applied` means it changed the file;
     * `changedResources` names where, computed by diffing — never taken from the agent's words.
     */
    repairs?: Array<{ attempt: number; applied: boolean; changedResources?: string[] }>;
    /** A failed attempt left its progress standing (a retry over an existing stack). It still bills. */
    keptPartialProgress?: boolean;
    /** Typed deployed-resource URLs, by resource; never inferred from build or application logs. */
    urls?: Array<{ resourceName: string; url: string }>;
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
  /**
   * The configuration as edited by hand. While present it is what gets written and deployed. A TypeScript edit carries
   * its text, with `yaml` the configuration it evaluated to last. `error` says why the text does not parse or run.
   */
  configEdit?: ConfigEdit;
  /** Secrets set from this page, and whether the user said the others already exist. Absent: setting is unavailable. */
  secrets?: { set: string[]; confirmed: boolean; failure?: { name: string; detail: string } };
  /** Saving pasted AWS keys as a profile on this machine. */
  awsKeys?: { status: 'saving' | 'saved' | 'failed'; detail?: string; profile?: string };
  /** Secrets removed from the configuration on the Deploy step, by name, until they are put back. */
  dismissedSecrets?: string[];
  /** Folders below the project that look like apps, offered when nothing was found here. */
  nearbyApps?: string[];
  /** What each of `nearbyApps` is written in, by folder, when its files say ("Node.js", "Go"). */
  nearbyAppKinds?: Record<string, string>;
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
    /** Settings the code reads with no fallback that nothing in the file sets, by service. */
    unsetSettings: Array<{
      serviceName: string;
      resourceName: string;
      variableName: string;
      evidence: Array<{ file: string; line: number; quote: string }>;
    }>;
    deployable: boolean;
    /**
     * What this would cost per month, once the estimate comes back.
     *
     * Absent until then, and absent for good if the machine is offline. The review screen renders
     * without it rather than waiting for it.
     */
    price?: {
      monthly: string;
      byResource: Record<string, string>;
      region: string;
      /** What each other answer to a choice changes the monthly price by, by choice and answer. */
      options?: Record<string, Record<string, string>>;
      /** The fixed monthly total as a number. Absent when the estimate is incomplete. */
      flatMonthly?: number;
      /** Each resource's fixed monthly amount, by name. Absent for a resource that could not be priced. */
      resourceFlat?: Record<string, number>;
      /** What each resource's price is made of: its instance, storage, requests. */
      lines?: Record<string, CostLine[]>;
      /** What each option of each priced setting would cost: the resource's amount and the stack's, by option value. */
      settings?: Record<string, Record<string, Record<string, { resource?: number; total?: number }>>>;
    };
    /** The price service did not answer for this configuration; nothing else depends on it. */
    priceUnavailable?: boolean;
    /** Infrastructure choices whose every answer composes the same file, so the page does not ask them. */
    inertChoices?: string[];
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

/** One product of a resource's price, as the estimator names it ("RDS-instance-db.t4g.micro-postgres"). */
export type CostLine = {
  name: string;
  priceModel: string;
  /** The fixed monthly amount, for a flat-priced product. */
  monthly?: number;
  /** The rate, for a product billed by use, per `unit`. */
  rate?: number;
  unit?: string;
  /** How many units the configuration asks for: two instances, 20 GB. */
  quantity?: number;
};

/**
 * A repository file as the CLI lets the page show it: only one the analysis read or cited, with `.env` values and URL
 * credentials masked. `not-shown` names the file and says why its text is not there.
 */
/** A hand edit of the configuration, as the CLI holds it (`WizardState['configEdit']` in the CLI). */
export type ConfigEdit = { yaml: string; typescript?: string; error?: string; errorLine?: number };

/** The template the configuration compiles to (`WizardTemplatePreview` in the CLI). */
export type TemplatePreview =
  | {
      status: 'ready';
      /** The configuration text it was compiled from. */
      config: string;
      text: string;
      /** The configuration's resource each logical ID belongs to; absent for the stack's shared ones. */
      owners: Record<string, string>;
      stage: string;
      region: string;
    }
  | { status: 'failed'; config: string; error: string }
  | { status: 'unavailable'; detail: string };

export type FileView =
  | { path: string; status: 'shown'; text: string; lineCount: number; truncated: boolean; masked: boolean }
  | {
      path: string;
      status: 'not-shown';
      reason: 'not-seen' | 'outside' | 'missing' | 'not-a-file' | 'too-large' | 'binary';
    };

/** The repository's file names, as the CLI lists them for the scan (no dependencies, build output or ignored files). */
export type RepositoryTree = { files: string[]; truncated: boolean };

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
  /** Change one explicit infrastructure choice. The configuration and price are rebuilt from it. */
  setPreference: (change: DeploymentPreferenceChange) => Promise<WizardState>;
  /** Change one setting of one resource: its size, a standby copy, a domain. The CLI checks it against what it offers. */
  setSetting: (change: SettingChange) => Promise<WizardState>;
  /** Write the configuration to the repository, in the format chosen on the Review step. */
  write: (format: 'yaml' | 'typescript') => Promise<WizardState>;
  /** Deploy it. Besides connecting a coding agent, the only thing here that changes anything outside the repository. */
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
  /** Connect the coding agent picked on the Start step to Stacktape, at user level. */
  connectCodingAgent: () => Promise<WizardState>;
  /** Re-check AWS credentials and the Stacktape sign-in, after the user fixed one in a terminal. */
  recheck: () => Promise<WizardState>;
  /** Pick the region the file declares, before it is written. The preview follows; the new price arrives later. */
  setRegion: (region: string) => Promise<WizardState>;
  /** Take one step of signing in to Stacktape. What it led to is in the returned state's `signIn`. */
  signIn: (request: SignInRequest) => Promise<WizardState>;
  /**
   * Accept the Console offer after a deploy (sign in when needed, then connect the AWS account), or set it aside.
   * Accepting while signed out starts the sign-in, so the returned state carries its first step.
   */
  consoleConnection: (action: 'connect' | 'dismiss') => Promise<WizardState>;
  answer: (questionId: string, value: string) => Promise<WizardState>;
  /** Replaces the generated configuration with hand-edited text, or goes back to the generated one with `null`. */
  setConfigText: (edit: { yaml: string } | { typescript: string } | null) => Promise<WizardState>;
  /** The CloudFormation template the configuration under review compiles to, compiled offline by the CLI. */
  readTemplate: () => Promise<TemplatePreview>;
  /** Stores one secret in the user's AWS account. The value goes to the CLI on this machine and nowhere else. */
  setSecret: (name: string, value: string) => Promise<WizardState>;
  /** The secrets the configuration reads already exist. */
  confirmSecrets: () => Promise<WizardState>;
  /** Saves pasted AWS access keys as a profile on this machine and checks the identity again. */
  saveAwsKeys: (accessKeyId: string, secretAccessKey: string) => Promise<WizardState>;
  /** Deploys with another AWS profile on this machine. The identity and the target are checked again. */
  setAwsProfile: (profile: string) => Promise<WizardState>;
  /** Removes a secret from the configuration (the variables that read it), or puts it back. */
  dismissSecret: (name: string, dismissed: boolean) => Promise<WizardState>;
  /** The text of a file the analysis read or cited, for the evidence it shows. Read-only. */
  readFile: (path: string) => Promise<FileView>;
  /** The repository's file names, for the tree the scan draws. Names only. */
  readTree: () => Promise<RepositoryTree>;
  /**
   * What the project's `.env` sets for the secrets the configuration reads, for "Use the values from .env". Held in
   * memory by the page only; saved only when the user saves them, through `setSecret`.
   */
  readEnvironmentValues: () => Promise<
    { file: string; values: Array<{ name: string; value: string }> } | { file: undefined }
  >;
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
      'Either this link was already opened in another browser, or stacktape init has stopped. Run stacktape init in your project again to start a new session.'
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

  const post = (path: string, body: unknown) =>
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body)
    });

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
    connectCodingAgent: async () => {
      const connected = await fetch('/api/coding-agent-setup', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken }
      });
      if (!connected.ok) {
        throw new SessionError('The coding agent could not be connected.');
      }
      publish((await connected.json()) as WizardState);
      return current;
    },
    setPreference: async (change) => {
      const changed = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(change)
      });
      if (!changed.ok) {
        throw new SessionError('That infrastructure choice could not be applied.');
      }
      publish((await changed.json()) as WizardState);
      return current;
    },
    setSetting: async (change) => {
      const changed = await fetch('/api/setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(change)
      });
      if (!changed.ok) {
        throw new SessionError('That setting could not be applied.');
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
    setRegion: async (region) => {
      const priced = await fetch('/api/region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ region })
      });
      if (!priced.ok) {
        throw new SessionError('That region could not be chosen.');
      }
      publish((await priced.json()) as WizardState);
      return current;
    },
    signIn: async ({ route, ...body }) => {
      const stepped = await fetch(`/api/sign-in/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body)
      });
      if (!stepped.ok) {
        const problem = (await stepped.json().catch(() => ({}))) as { error?: string };
        throw new SessionError(problem.error ?? 'That sign-in step could not be sent.');
      }
      publish((await stepped.json()) as WizardState);
      return current;
    },
    consoleConnection: async (action) => {
      const changed = await fetch(`/api/console-connection/${action}`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken }
      });
      if (!changed.ok) {
        throw new SessionError(
          action === 'connect' ? 'Connecting to the Console could not be started.' : 'Could not set the offer aside.'
        );
      }
      publish((await changed.json()) as WizardState);
      return current;
    },
    setConfigText: async (edit) => {
      const changed = await post('/api/config-text', edit ?? { yaml: null });
      if (!changed.ok) throw new SessionError('The edited file could not be sent to stacktape init.');
      publish((await changed.json()) as WizardState);
      return current;
    },
    setSecret: async (name, value) => {
      const saved = await post('/api/secret', { name, value });
      if (!saved.ok) {
        const problem = (await saved.json().catch(() => ({}))) as { error?: string };
        throw new SessionError(problem.error ?? 'The secret could not be saved.');
      }
      publish((await saved.json()) as WizardState);
      return current;
    },
    confirmSecrets: async () => {
      const confirmed = await post('/api/secrets/confirm', {});
      if (!confirmed.ok) throw new SessionError('Could not record that.');
      publish((await confirmed.json()) as WizardState);
      return current;
    },
    saveAwsKeys: async (accessKeyId, secretAccessKey) => {
      const saved = await post('/api/aws-keys', { accessKeyId, secretAccessKey });
      if (!saved.ok) {
        const problem = (await saved.json().catch(() => ({}))) as { error?: string };
        throw new SessionError(problem.error ?? 'The keys could not be saved.');
      }
      publish((await saved.json()) as WizardState);
      return current;
    },
    setAwsProfile: async (profile) => {
      const switched = await post('/api/aws-profile', { profile });
      if (!switched.ok) {
        const problem = (await switched.json().catch(() => ({}))) as { error?: string };
        throw new SessionError(problem.error ?? 'That AWS profile could not be used.');
      }
      publish((await switched.json()) as WizardState);
      return current;
    },
    dismissSecret: async (name, dismissed) => {
      const changed = await post('/api/secret-dismiss', { name, dismissed });
      if (!changed.ok) {
        throw new SessionError(dismissed ? 'The secret could not be removed.' : 'The secret could not be put back.');
      }
      publish((await changed.json()) as WizardState);
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
    readFile: async (path) => {
      const read = await fetch(`/api/file?path=${encodeURIComponent(path)}`, {
        headers: { 'x-csrf-token': csrfToken }
      });
      if (!read.ok) throw new SessionError('The file could not be read.');
      return (await read.json()) as FileView;
    },
    readTemplate: async () => {
      const read = await fetch('/api/template', { headers: { 'x-csrf-token': csrfToken } });
      if (!read.ok) throw new SessionError('The template could not be compiled.');
      return (await read.json()) as TemplatePreview;
    },
    readTree: async () => {
      const read = await fetch('/api/tree', { headers: { 'x-csrf-token': csrfToken } });
      if (!read.ok) throw new SessionError('The file tree could not be read.');
      return (await read.json()) as RepositoryTree;
    },
    readEnvironmentValues: async () => {
      const read = await fetch('/api/environment-values', { headers: { 'x-csrf-token': csrfToken } });
      if (!read.ok) return { file: undefined };
      return (await read.json()) as
        | { file: string; values: Array<{ name: string; value: string }> }
        | { file: undefined };
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
