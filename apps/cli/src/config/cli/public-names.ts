/** Public spellings are presentation only. Persisted commands and JSON arguments keep their internal names. */
const commandOverrides: Record<string, string> = {
  'info:stack': 'status',
  'info:stacks': 'stack list',
  'info:operations': 'stack history',
  'info:whoami': 'whoami',
  'cf:rollback': 'stack recover',
  'cf-module:update': 'stack update-modules',
  incidents: 'incident list',
  alarms: 'alarm list',
  'alarms:export': 'alarm export',
  'container:session': 'container shell',
  'bastion:session': 'bastion shell',
  'defaults:configure': 'defaults set'
};

export const publicCommandName = (id: string): string =>
  commandOverrides[id] ??
  id
    .replace(/^incidents:/, 'incident:')
    .replace(/^(errors|issues):/, 'error:')
    .replaceAll(':', ' ');

const flagOverrides: Record<string, string> = {
  projectName: 'project',
  configPath: 'config',
  currentWorkingDirectory: 'cwd',
  autoConfirmOperation: 'yes',
  startTime: 'since',
  endTime: 'until',
  preserveTempFiles: 'keep-temp-files',
  showSensitiveValues: 'show-secrets',
  outFile: 'out',
  incidentStatus: 'status',
  issueStatus: 'status',
  incidentWatchTimeoutSeconds: 'timeout',
  incidentWatchStabilitySeconds: 'stable-for',
  fullDeploy: 'full',
  secretValue: 'value',
  secretFile: 'file',
  noCache: 'no-cache',
  noTunnel: 'no-tunnel',
  noBrowser: 'no-browser',
  disableEmulation: 'no-emulation',
  disableDockerRemoteCache: 'no-remote-cache',
  disableLayerOptimization: 'no-layer-optimization'
};
export const publicFlag = (arg: string): string =>
  flagOverrides[arg] ?? arg.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
export const shortFlags: Readonly<Record<string, string>> = {
  stage: 's',
  region: 'r',
  profile: 'p',
  configPath: 'c',
  autoConfirmOperation: 'y',
  help: 'h',
  outFile: 'o',
  version: 'v'
};
const hiddenArgs = new Set(['agent', 'agentPort', 'agentChild', 'ui', 'outputFormat', 'recoverOperation']);
/** Hidden options that a command documents because they are part of what it does. */
const argsShownFor: Readonly<Record<string, readonly string[]>> = {
  dev: ['agent', 'agentPort'],
  'dev:stop': ['agentPort']
};
export const isHiddenArg = (command: string | undefined, arg: string): boolean =>
  hiddenArgs.has(arg) && !(command && argsShownFor[command]?.includes(arg));
export const globalArgs = new Set(['help', 'logLevel', 'outputFormat', 'quiet']);

export const commandPositionals: Readonly<Record<string, readonly string[]>> = {
  logs: ['resourceName'],
  metrics: ['resourceName', 'metric'],
  'secret:set': ['secretName'],
  'secret:get': ['secretName'],
  'secret:delete': ['secretName'],
  'param:get': ['resourceName', 'paramName'],
  'incidents:show': ['incidentId'],
  'incidents:watch': ['incidentId'],
  'incidents:ack': ['incidentId'],
  'incidents:resolve': ['incidentId'],
  'errors:resolve': ['issueId'],
  'errors:ignore': ['issueId'],
  'errors:reopen': ['issueId'],
  'script:run': ['scriptName'],
  'deployment-script:run': ['resourceName'],
  'query:sql': ['resourceName', 'sql'],
  'query:dynamodb': ['resourceName'],
  'query:redis': ['resourceName'],
  'query:opensearch': ['resourceName'],
  'aws:call': ['service', 'command'],
  'container:session': ['resourceName'],
  'container:exec': ['resourceName', 'command'],
  'bastion:tunnel': ['resourceName'],
  'bucket:sync': ['resourceName'],
  help: ['command'],
  upgrade: ['newVersion'],
  'org:create': ['organizationName'],
  'org:delete': ['organizationId'],
  'project:create': ['projectName'],
  'ai:connect': ['aiProvider'],
  'ai:disconnect': ['aiProvider'],
  'defaults:configure': ['key', 'value']
};

/** Resolve an entire name, never a partial group or an arbitrary command prefix. */
export const resolveCommandName = <T extends string>(name: string, ids: readonly T[]): T | undefined =>
  ids.find(
    (id) => id === name.replace(/^issues:/, 'errors:') || publicCommandName(id) === name.trim().replace(/\s+/g, ' ')
  );

export const shellQuote = (value: string): string =>
  /^[a-zA-Z0-9_./:@%+=,-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;

export const publicCommandLine = (command: string, args: Record<string, unknown> = {}): string =>
  [
    'stacktape',
    ...publicCommandName(command).split(' '),
    ...Object.entries(args).flatMap(([key, value]) => {
      if (value === undefined || value === null || value === false) return [];
      const flag = `--${publicFlag(key)}`;
      return value === true
        ? [flag]
        : [flag, ...(Array.isArray(value) ? value : [value]).map((v) => shellQuote(String(v)))];
    })
  ].join(' ');
