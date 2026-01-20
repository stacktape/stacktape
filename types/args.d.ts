// Command types derived from the Zod-based CLI definition
type StacktapeCommand = (typeof import('../src/config/cli/commands'))['cliCommands'][number];

// CLI Args type derived from Zod schema
type StacktapeCliArgs = import('../src/config/cli/options').StacktapeCliArgs;

type StacktapeArg = keyof StacktapeArgs;
type StacktapeArgs = StacktapeCliArgs;

type LogFormat = 'fancy' | 'normal' | 'basic' | 'json';
type LogLevel = 'info' | 'debug' | 'error';
type TokenType = 'idToken' | 'refreshToken' | 'accessToken';
type ResourceLogsType = 'access' | 'process';

type HookableCommand =
  | 'compile-template'
  | 'deploy'
  | 'package-workloads'
  | 'preview-changes'
  | 'logs'
  | 'userpool-create-user'
  | 'userpool-get-token'
  | 'fn:deploy-fast'
  | 'fn:develop'
  | 'cw:run-local'
  | 'cw:deploy-fast'
  | 'bucket:sync'
  | 'stack-info'
  | 'delete'
  | 'rollback';

type HookableEvent = keyof Hooks;
