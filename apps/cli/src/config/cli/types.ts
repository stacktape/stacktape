import type { Hooks } from '@stacktape/config/shared';

// Command types derived from the Zod-based CLI definition
export type StacktapeCommand = (typeof import('./commands'))['cliCommands'][number];

// CLI Args type derived from Zod schema
export type StacktapeCliArgs = import('./options').StacktapeCliArgs;

export type StacktapeArg = keyof StacktapeArgs;
export type StacktapeArgs = StacktapeCliArgs;

export type LogLevel = 'info' | 'debug' | 'error';
export type TokenType = 'idToken' | 'refreshToken' | 'accessToken';
export type ResourceLogsType = 'access' | 'process';

export type HookableEvent = keyof Hooks;
