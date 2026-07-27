import type { OrganizationActivityResponse } from '../../../../shared/trpc/api-key-protected';

export type InteractiveLauncherResult = {
  command: StacktapeCommand;
  args: StacktapeArgs;
};

export type RecentAction = OrganizationActivityResponse['items'][number] & {
  commandArgs?: StacktapeArgs | null;
};

export type CommandSuggestion = {
  type: 'command';
  command: StacktapeCommand;
  label: string;
  description: string;
};

export type RecentCommandSuggestion = {
  type: 'recent';
  command: StacktapeCommand;
  args: StacktapeArgs;
  label: string;
  description: string;
  status: 'success' | 'error' | 'inProgress' | 'unknown';
  occurredAt: number | null;
  userName?: string | null;
};

export type LauncherSuggestion = CommandSuggestion | RecentCommandSuggestion;
