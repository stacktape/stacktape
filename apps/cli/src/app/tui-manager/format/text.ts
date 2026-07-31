import { linksMap } from '@config';
import { getRelativePath, transformToUnixPath } from '@utils/fs-utils';
import kleur from 'kleur';
import stringWidth from 'string-width';
import terminalLink from 'terminal-link';
import { resolveOutputMode } from '../output/mode';

/**
 * Whether text styling (colors, bold, links) is applied. Driven by the resolved
 * output mode — styling is TTY-only. The tuiManager facade updates this whenever
 * the output mode changes; the initial value matches the facade's own default
 * resolution so formatting behaves consistently even before init.
 */
let stylingEnabled = resolveOutputMode({ forceTty: process.env.FORCE_TTY === '1' }) === 'tty';

export const setTextStylingEnabled = (enabled: boolean) => {
  stylingEnabled = enabled;
};

export const isTextStylingEnabled = () => stylingEnabled;

export const colorize = (color: string, text: string): string => {
  if (!stylingEnabled) return text;
  return (kleur[color as keyof typeof kleur] as (text: string) => string)?.(text) ?? text;
};

export const bold = (text: string | number): string => {
  if (!stylingEnabled) return text.toString();
  return kleur.bold(text);
};

export const underline = (text: string): string => {
  if (!stylingEnabled) return text;
  return kleur.underline(text);
};

export const styledLink = (url: string, placeholder: string): string =>
  colorize('blue', terminalLink(placeholder, url));

export const namedLink = (link: keyof typeof linksMap, placeholder: string): string => {
  const url = linksMap[link];
  return colorize('cyan', terminalLink(placeholder, url.endsWith('/') ? `${url.slice(0, -1)} ` : url));
};

export const plainFallbackLink = (url: string): string => terminalLink(url, url, { fallback: (text: string) => text });

export const prettyCommand = (command: string): string => {
  const normalizedCommand = command.trim().replace(/^stacktape\s+/, '');
  const commandParts = normalizedCommand.match(/"[^"]*"|'[^']*'|`[^`]*`|\S+/g) || [];
  const [commandName, ...args] = commandParts;

  if (!commandName) {
    return colorize('yellow', 'stacktape');
  }

  const formattedArgs = args.map((arg) => {
    if (!arg.startsWith('-')) return arg;

    if (!arg.includes('=')) {
      return colorize('gray', arg);
    }

    const [option, ...valueParts] = arg.split('=');
    const value = valueParts.join('=');
    const formattedOption = colorize('gray', option);
    return `${formattedOption}=${value}`;
  });

  return [colorize('yellow', 'stacktape'), commandName, ...formattedArgs].join(' ');
};

export const prettyOption = (option: string): string => bold(colorize('gray', `--${option}`));

export const prettyResourceName = (resourceName: string): string => bold(resourceName);

export const prettyStackName = (stackName: string): string => bold(stackName);

export const prettyConfigProperty = (property: string): string => bold(colorize('gray', property));

export const prettyResourceType = (type: string): string => bold(colorize('blue', type));

export const prettyFilePath = (filePath: string): string => {
  const relativePath = transformToUnixPath(getRelativePath(filePath));
  const underlined = underline(relativePath);
  return underlined.startsWith('./') ? underlined : `./${underlined}`;
};

export const prettyDuration = (durationInMs: number): string => colorize('yellow', formatDuration(durationInMs));

export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

export const formatPhaseTimer = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const getElapsedTime = (startTime: number | undefined, duration: number | undefined): number => {
  if (duration !== undefined) return duration;
  if (startTime === undefined) return 0;
  return Date.now() - startTime;
};

export const stripAnsi = (str?: string): string => {
  if (!str) return '';
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
};

export const visibleWidth = (value: string): number => stringWidth(stripAnsi(value));
