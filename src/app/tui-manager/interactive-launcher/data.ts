import { cliCommands, type StacktapeCommand } from '../../../config/cli/commands';
import { getAllowedArgs, getCommandDescription, getRequiredArgs } from '../../../config/cli/utils';
import { SUPPORTED_AWS_REGIONS } from '@config';
import { ApiKeyProtectedClient } from '../../../../shared/trpc/api-key-protected';
import { loadPersistedState } from '../../global-state-manager/utils';
import type { CommandSuggestion, RecentAction, RecentCommandSuggestion } from './types';

const SENSITIVE_RECENT_ARG_NAMES = new Set([
  'apiKey',
  'secretValue',
  'secretFile',
  'env',
  'sdkInput',
  'sqlQuery',
  'showSensitiveValues'
]);

// Commands that don't make sense to launch from an interactive picker (covered by other flows
// or not useful without piping into other tooling).
const HIDDEN_LAUNCHER_COMMANDS = new Set<StacktapeCommand>(['help', 'mcp', 'mcp:add', 'version']);

// Args that aren't required by the Zod schema but should be required by the interactive launcher
// (so users always end up with a usable command line for deploys / deletes / dev / etc.).
const LAUNCHER_EXTRA_REQUIRED_ARGS = ['projectName'];

export const getLauncherRequiredArgs = (command: StacktapeCommand): string[] => {
  const allowed = new Set(getAllowedArgs(command));
  const required = [...getRequiredArgs(command)];
  for (const extra of LAUNCHER_EXTRA_REQUIRED_ARGS) {
    if (allowed.has(extra) && !required.includes(extra)) required.push(extra);
  }
  return required;
};

const commandSet = new Set<StacktapeCommand>(cliCommands);

export const launcherCommands = (): StacktapeCommand[] =>
  cliCommands.filter((command) => !HIDDEN_LAUNCHER_COMMANDS.has(command));

export const commandSuggestions = (): CommandSuggestion[] => {
  return launcherCommands().map((command) => ({
    type: 'command',
    command,
    label: `/${command}`,
    description: firstParagraph(getCommandDescription(command))
  }));
};

export const getLauncherDefaultArgs = async (): Promise<StacktapeArgs> => {
  const persistedState = await loadPersistedState();
  const profile = process.env.AWS_PROFILE || persistedState.cliArgsDefaults?.profile;
  // Drop the AWS profile from launcher defaults when it's the implicit "default" — surfacing
  // `--profile default` in the preview is noise, since omitting the flag selects the same profile.
  const isMeaningfulProfile = profile && profile !== 'default';
  return {
    ...persistedState.cliArgsDefaults,
    ...(persistedState.cliArgsDefaults?.profile === 'default' ? { profile: undefined } : {}),
    ...(process.env.AWS_DEFAULT_REGION ? { region: process.env.AWS_DEFAULT_REGION as AWSRegion } : {}),
    ...(process.env.PROJECT_NAME ? { projectName: process.env.PROJECT_NAME } : {}),
    ...(isMeaningfulProfile ? { profile } : {})
  } as StacktapeArgs;
};

export const fetchRecentCommandSuggestions = async (): Promise<RecentCommandSuggestion[]> => {
  const persistedState = await loadPersistedState();
  const apiKey = process.env.STACKTAPE_API_KEY || persistedState.otherDefaults?.apiKey;
  if (!apiKey) {
    return [];
  }

  try {
    const client = new ApiKeyProtectedClient();
    await client.init({ apiKey });
    const activity = await client.organizationActivity({
      commands: launcherCommands(),
      currentUserOnly: true,
      page: 1,
      pageSize: 12,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    });
    return toRecentCommandSuggestions(activity.items as RecentAction[]).slice(0, 5);
  } catch {
    return [];
  }
};

export const toRecentCommandSuggestions = (actions: RecentAction[]): RecentCommandSuggestion[] => {
  return actions
    .map(actionToRecentSuggestion)
    .filter((suggestion): suggestion is RecentCommandSuggestion => Boolean(suggestion));
};

export const normalizeArgValue = ({ value, allowedTypes }: { value: string; allowedTypes: string[] }): any => {
  const trimmed = value.trim();
  if (allowedTypes.includes('boolean')) {
    if (['true', 't', 'yes', 'y', '1'].includes(trimmed.toLowerCase())) return true;
    if (['false', 'f', 'no', 'n', '0'].includes(trimmed.toLowerCase())) return false;
    return Boolean(trimmed);
  }
  if (allowedTypes.includes('number')) {
    return Number(trimmed);
  }
  if (allowedTypes.includes('array')) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return trimmed;
};

export const formatCommandLine = (command: StacktapeCommand, args: StacktapeArgs) => {
  const parts = ['stacktape', command];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') {
      if (value) parts.push(`--${key}`);
      continue;
    }
    if (SENSITIVE_RECENT_ARG_NAMES.has(key)) {
      parts.push(`--${key}`, '<redacted>');
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`--${key}`, String(item));
      }
      continue;
    }
    parts.push(`--${key}`, String(value));
  }
  return parts.join(' ');
};

export const getAllowedValuesForArg = (argName: string, allowedValues?: string[]) => {
  if (allowedValues?.length) return allowedValues;
  if (argName === 'region') return [...SUPPORTED_AWS_REGIONS];
  return undefined;
};

const actionToRecentSuggestion = (action: RecentAction): RecentCommandSuggestion | null => {
  const command = normalizeRecentCommand(action.command);
  if (!command) return null;
  const args = sanitizeRecentArgs(command, {
    ...(action.commandArgs || {}),
    ...(action.region ? { region: action.region as AWSRegion } : {}),
    ...(action.stage ? { stage: action.stage } : {}),
    ...(action.projectName ? { projectName: action.projectName } : {})
  } as StacktapeArgs);

  const status = recentStatus(action);
  const occurredAt = parseDate(action.createdAt);
  return {
    type: 'recent',
    command,
    args,
    label: formatCommandLine(command, args),
    description: describeRecentAction(action),
    status,
    occurredAt,
    userName: action.user?.name ?? null
  };
};

const recentStatus = (action: RecentAction): RecentCommandSuggestion['status'] => {
  if (action.inProgress) return 'inProgress';
  if (action.success === true) return 'success';
  if (action.success === false) return 'error';
  return 'unknown';
};

const parseDate = (value: Date | string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatRelativeTime = (timestamp: number | null, now = Date.now()): string => {
  if (!timestamp) return '';
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.round(diff / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(days / 365);
  return `${years}y ago`;
};

const normalizeRecentCommand = (command?: string | null): StacktapeCommand | null => {
  if (!command) return null;
  const normalized = command.startsWith('codebuild:')
    ? (command.replace('codebuild:', '') as StacktapeCommand)
    : command;
  return commandSet.has(normalized as StacktapeCommand) ? (normalized as StacktapeCommand) : null;
};

const sanitizeRecentArgs = (command: StacktapeCommand, args: StacktapeArgs): StacktapeArgs => {
  const allowedArgs = new Set(getAllowedArgs(command));
  const sanitized: StacktapeArgs = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (!allowedArgs.has(key) || SENSITIVE_RECENT_ARG_NAMES.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    sanitized[key] = value;
  }
  return sanitized;
};

const describeRecentAction = (action: RecentAction) => {
  const parts = [action.projectName, action.stage, action.region].filter(Boolean);
  if (parts.length) return parts.join(' / ');
  if (action.description) return action.description;
  return 'Recent action';
};

const firstParagraph = (description: string) => {
  return (
    description
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean)
      ?.replace(/^#+\s*/, '')
      .slice(0, 110) || ''
  );
};
