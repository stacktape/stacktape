import type { Hooks } from '@stacktape/config/shared';
import type { StacktapeCliArgs as CliArgsFromSchema } from './options';

// Command types derived from the Zod-based CLI definition
export type StacktapeCommand = (typeof import('./commands'))['cliCommands'][number];

// CLI Args type derived from Zod schema
export type StacktapeCliArgs = CliArgsFromSchema;

export type StacktapeArgs = StacktapeCliArgs;

export type LogLevel = 'info' | 'debug' | 'error';
export type HookableEvent = keyof Hooks;
