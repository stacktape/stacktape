import { filterDuplicates } from '@shared/utils/misc';

export const cliCommands = [
  'deploy',
  'dev',
  'codebuild:deploy',
  'deployment-script:run',
  'delete',
  'rollback',
  'init',
  'logs',
  'stack:info',
  'stack:list',
  'aws-profile:create',
  'aws-profile:update',
  'aws-profile:delete',
  'aws-profile:list',
  'secret:create',
  'secret:get',
  'secret:delete',
  'domain:add',
  'compile-template',
  'package-workloads',
  'preview-changes',
  'cf-module:update',
  'bucket:sync',
  'bastion:session',
  'bastion:tunnel',
  'container:session',
  'defaults:configure',
  'defaults:list',
  'script:run',
  'version',
  'help',
  'login',
  'logout',
  'param:get',
  'upgrade'
] as const;

export const sdkCommands = [
  'deploy',
  'dev',
  'codebuild:deploy',
  'deployment-script:run',
  'delete',
  'rollback',
  'logs',
  'stack:info',
  'stack:list',
  'aws-profile:create',
  'aws-profile:update',
  'aws-profile:delete',
  'aws-profile:list',
  'compile-template',
  'package-workloads',
  'preview-changes',
  'script:run',
  'bucket:sync',
  'version',
  'param:get'
] as const;

export const allCommands = cliCommands.concat(sdkCommands).filter(filterDuplicates);

const universalCliArgs: StacktapeCliArg[] = ['profile', 'logFormat', 'logLevel', 'help', 'awsAccount'];
const universalSdkArgs: StacktapeSdkArg[] = ['profile', 'awsAccount'];
const argsForCommandsWorkingWithStack = ['stage', 'region', 'projectName'] as const;
const cliArgsForConfigDependentCommands: StacktapeArg[] = ['configPath', 'currentWorkingDirectory', 'templateId'];
const sdkArgsForConfigDependentCommands: StacktapeSdkArg[] = [
  'configPath',
  'currentWorkingDirectory',
  'config',
  'templateId'
];

export const commandsWithDisabledAnnouncements: StacktapeCommand[] = ['dev', 'version', 'upgrade'];

export const commandsNotRequiringApiKey = [
  'login',
  'logout',
  'version',
  'help',
  'defaults:list',
  'defaults:configure',
  'upgrade'
];

export const allowedCliArgs: { [_command in StacktapeCliCommand]: StacktapeCliArg[] } = {
  deploy: [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'disableDriftDetection',
    'preserveTempFiles',
    'dockerArgs',
    'noCache',
    'disableDockerRemoteCache',
    'disableAutoRollback',
    'autoConfirmOperation',
    'showSensitiveValues',
    'hotSwap',
    'disableLayerOptimization'
  ],
  'codebuild:deploy': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'disableDriftDetection',
    'preserveTempFiles',
    'dockerArgs',
    'noCache',
    'disableDockerRemoteCache',
    'disableAutoRollback',
    'autoConfirmOperation',
    'showSensitiveValues',
    'hotSwap',
    'disableLayerOptimization'
  ],
  dev: [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'watch',
    'container',
    'disableEmulation',
    'resourceName',
    'preserveTempFiles',
    'dockerArgs'
  ],
  'deployment-script:run': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'resourceName'
  ],
  'package-workloads': [...universalCliArgs, ...argsForCommandsWorkingWithStack, ...cliArgsForConfigDependentCommands],
  delete: [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'autoConfirmOperation'
  ],
  'compile-template': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'outFile',
    'preserveTempFiles'
  ],
  'stack:info': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    'configPath',
    'detailed',
    'outFile',
    'outFormat',
    'showSensitiveValues'
  ],
  'param:get': [...universalCliArgs, ...argsForCommandsWorkingWithStack, 'configPath', 'resourceName', 'paramName'],
  'stack:list': [...universalCliArgs, ...argsForCommandsWorkingWithStack],
  help: ['command'],
  version: [],
  'domain:add': [...universalCliArgs, 'profile', 'region'],
  // 'domain:buy': [...universalCliArgs, 'profile', 'region'],
  'cf-module:update': [...universalCliArgs, 'profile', 'region'],
  'secret:create': [...universalCliArgs, 'profile', 'region'],
  'secret:delete': [...universalCliArgs, 'profile', 'region'],
  'secret:get': [...universalCliArgs, 'profile', 'region'],
  'aws-profile:create': ['logLevel', 'logFormat'],
  'aws-profile:update': ['logLevel', 'logFormat'],
  'aws-profile:delete': ['logLevel', 'logFormat'],
  'aws-profile:list': ['logLevel', 'logFormat'],
  rollback: [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'resourcesToSkip'
  ],
  'preview-changes': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'preserveTempFiles'
  ],
  logs: [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'resourceName',
    'startTime',
    'filter',
    'raw'
  ],
  init: ['logLevel', 'logFormat', 'starterId', 'projectDirectory', 'templateId', 'initializeProjectTo', 'configFormat'],
  'bucket:sync': [
    'logFormat',
    'logLevel',
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'bucketId',
    'sourcePath',
    'invalidateCdnCache',
    'headersPreset',
    'resourceName',
    'awsAccount'
  ],
  'bastion:session': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'bastionResource'
  ],
  'bastion:tunnel': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'bastionResource',
    'resourceName',
    'localTunnelingPort'
  ],
  'container:session': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'resourceName',
    'container',
    'command'
  ],
  'script:run': [
    ...universalCliArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'env',
    'scriptName',
    'assumeRoleOfResource'
  ],
  'defaults:configure': [],
  'defaults:list': [],
  login: [...universalCliArgs, 'apiKey'],
  logout: [...universalCliArgs, 'apiKey'],
  upgrade: []
};

export const requiredCliArgs: { [_command in StacktapeCliCommand]: StacktapeCliArg[] } = {
  deploy: ['stage', 'region'],
  'codebuild:deploy': ['stage', 'region'],
  dev: ['region', 'stage'],
  delete: ['region'],
  'stack:info': ['region'],
  'param:get': ['region', 'resourceName', 'paramName'],
  'stack:list': ['region'],
  help: [],
  version: [],
  'deployment-script:run': ['stage', 'region', 'resourceName'],
  'aws-profile:create': [],
  'aws-profile:delete': [],
  'aws-profile:update': [],
  'aws-profile:list': [],
  'domain:add': ['region'],
  // 'domain:buy': [],
  'cf-module:update': ['region'],
  'secret:create': ['region'],
  'secret:get': ['region'],
  'secret:delete': ['region'],
  'compile-template': ['stage', 'region'],
  rollback: ['region'],
  'package-workloads': ['stage', 'region'],
  'preview-changes': ['stage', 'region'],
  logs: ['stage', 'region', 'resourceName'],
  init: [],
  'bucket:sync': ['region'],
  'bastion:session': ['region', 'stage'],
  'bastion:tunnel': ['region', 'stage', 'resourceName'],
  'container:session': ['region', 'stage', 'resourceName'],
  'script:run': ['scriptName', 'stage'],
  'defaults:configure': [],
  'defaults:list': [],
  login: [],
  logout: [],
  upgrade: []
};

export const allowedSdkArgs: { [_command in StacktapeSdkCommand]: StacktapeSdkArg[] } = {
  deploy: [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'disableDriftDetection',
    'preserveTempFiles',
    'dockerArgs',
    'noCache',
    'disableDockerRemoteCache',
    'disableAutoRollback',
    'hotSwap',
    'disableLayerOptimization'
  ],
  'codebuild:deploy': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'disableDriftDetection',
    'preserveTempFiles',
    'dockerArgs',
    'noCache',
    'disableDockerRemoteCache',
    'disableAutoRollback',
    'hotSwap',
    'disableLayerOptimization'
  ],
  dev: [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'watch',
    'container',
    'disableEmulation',
    'resourceName',
    'preserveTempFiles',
    'dockerArgs'
  ],
  'deployment-script:run': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'resourceName'
  ],
  'package-workloads': [...universalSdkArgs, ...argsForCommandsWorkingWithStack, ...sdkArgsForConfigDependentCommands],
  delete: [...universalSdkArgs, ...argsForCommandsWorkingWithStack, ...sdkArgsForConfigDependentCommands],
  'stack:info': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    'configPath',
    'detailed',
    'outFile',
    'outFormat'
  ],
  'param:get': [...universalSdkArgs, ...argsForCommandsWorkingWithStack, 'configPath', 'resourceName', 'paramName'],
  'stack:list': [...universalSdkArgs, ...argsForCommandsWorkingWithStack],
  'compile-template': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'outFile',
    'preserveTempFiles'
  ],
  version: [],
  'aws-profile:create': [],
  'aws-profile:update': [],
  'aws-profile:delete': [],
  'aws-profile:list': [],
  rollback: [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'resourcesToSkip'
  ],
  'preview-changes': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'preserveTempFiles'
  ],
  logs: [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'resourceName',
    'startTime',
    'filter',
    'raw'
  ],
  'bucket:sync': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...sdkArgsForConfigDependentCommands,
    'bucketId',
    'sourcePath',
    'invalidateCdnCache',
    'headersPreset',
    'resourceName'
  ],
  'script:run': [
    ...universalSdkArgs,
    ...argsForCommandsWorkingWithStack,
    ...cliArgsForConfigDependentCommands,
    'env',
    'scriptName'
  ]
};

export const requiredSdkArgs: { [_command in StacktapeSdkCommand]: StacktapeSdkArg[] } = {
  deploy: [],
  'codebuild:deploy': [],
  dev: ['resourceName', 'region', 'stage'],
  delete: [],
  'deployment-script:run': ['resourceName'],
  'stack:info': [],
  'param:get': ['resourceName', 'paramName'],
  'stack:list': [],
  version: [],
  'aws-profile:create': [],
  'aws-profile:delete': [],
  'aws-profile:update': [],
  'aws-profile:list': [],
  'compile-template': [],
  rollback: [],
  'package-workloads': [],
  'preview-changes': [],
  logs: ['resourceName'],
  'script:run': ['scriptName', 'stage'],
  'bucket:sync': []
};

export const cliArgsAliases: { [_cliArg in StacktapeCliArg | StacktapeSdkArg]: string } = {
  event: 'e',
  jsonEvent: 'je',
  stage: 's',
  configPath: 'cp',
  profile: 'p',
  disableDriftDetection: 'ddd',
  preserveTempFiles: 'ptf',
  region: 'r',
  resourceName: 'rn',
  watch: 'w',
  command: 'cmd',
  disableEmulation: 'de',
  portMapping: 'pm',
  logFormat: 'lf',
  logLevel: 'll',
  filter: 'f',
  startTime: 'st',
  raw: 'rw',
  dockerArgs: 'da',
  sourcePath: 'sp',
  bucketId: 'bi',
  currentWorkingDirectory: 'cwd',
  noCache: 'nc',
  env: 'env',
  detailed: 'd',
  outFile: 'out',
  outFormat: 'of',
  config: 'cfg',
  password: 'pw',
  username: 'un',
  disableAutoRollback: 'dar',
  autoConfirmOperation: 'aco',
  showSensitiveValues: 'ssv',
  fullHistory: 'fh',
  help: 'h',
  container: 'cnt',
  invalidateCdnCache: 'icc',
  headersPreset: 'hp',
  scriptName: 'scn',
  newVersion: 'nv',
  projectDirectory: 'pd',
  hotSwap: 'hs',
  apiKey: 'ak',
  awsAccount: 'aa',
  initializeProjectTo: 'ipt',
  paramName: 'pn',
  templateId: 'ti',
  bastionResource: 'br',
  projectName: 'prj',
  starterId: 'sid',
  assumeRoleOfResource: 'aror',
  configFormat: 'cf',
  localTunnelingPort: 'ltp',
  disableDockerRemoteCache: 'drc',
  resourcesToSkip: 'rts',
  disableLayerOptimization: 'dlo'
};
