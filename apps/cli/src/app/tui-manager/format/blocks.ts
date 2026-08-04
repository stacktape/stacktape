import boxen from 'boxen';
import type { TuiDeploymentHeader } from '../types';
import { bold, colorize, isTextStylingEnabled, visibleWidth } from './text';

type CommandHeaderLike = {
  action: string;
  projectName: string;
  stageName: string;
  region: string;
};

export const COMMAND_HEADER_BOX_MIN_WIDTH = 54;

export const formatCommandHeaderLine = ({ action, projectName, stageName, region }: CommandHeaderLike): string =>
  `--- ${action}: ${projectName} -> ${stageName} (${region}) ---`;

export const formatCommandHeaderProgressMessage = ({
  action,
  projectName,
  stageName,
  region
}: TuiDeploymentHeader): string => `${action}: ${projectName} -> ${stageName} (${region})`;

export const formatCommandHeaderTarget = ({
  projectName,
  stageName,
  region
}: Omit<CommandHeaderLike, 'action'>): string => `${projectName} -> ${stageName} (${region})`;

export const formatSectionHeaderLine = (title: string): string => `--- ${title} ---`;

export const renderCommandHeaderBox = (header: TuiDeploymentHeader): string[] => {
  const actionLine = bold(colorize('cyan', header.action));
  const targetLine = `${header.projectName} ${colorize('gray', '→')} ${header.stageName} ${colorize('gray', `(${header.region})`)}`;
  const plainTarget = formatCommandHeaderTarget(header);
  const totalWidth = Math.max(COMMAND_HEADER_BOX_MIN_WIDTH, visibleWidth(plainTarget) + 4);
  const innerWidth = totalWidth - 2;
  const textWidth = innerWidth - 2;

  const top = `╭${'─'.repeat(innerWidth)}╮`;
  const actionPadding = Math.max(0, textWidth - visibleWidth(actionLine));
  const targetPadding = Math.max(0, textWidth - visibleWidth(targetLine));
  const actionRow = `│ ${actionLine}${' '.repeat(actionPadding)} │`;
  const targetRow = `│ ${targetLine}${' '.repeat(targetPadding)} │`;
  const bottom = `╰${'─'.repeat(innerWidth)}╯`;

  return [top, actionRow, targetRow, bottom];
};

export const formatAsciiTable = (header: string[], rows: string[][]): string[] => {
  const widths = header.map((h) => visibleWidth(h));
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cellLength = visibleWidth(row[i] || '');
      if (cellLength > (widths[i] || 0)) {
        widths[i] = cellLength;
      }
    }
  }

  const horizontalLine = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
  const formatRow = (cells: string[]) => {
    const paddedCells = cells.map((cell, i) => {
      const visibleLength = visibleWidth(cell || '');
      const padding = (widths[i] || 0) - visibleLength;
      return (cell || '') + ' '.repeat(Math.max(0, padding));
    });
    return `| ${paddedCells.join(' | ')} |`;
  };

  return [horizontalLine, formatRow(header), horizontalLine, ...rows.map(formatRow), horizontalLine];
};

export const renderTitledBox = ({
  title,
  lines,
  minWidth = 0
}: {
  title: string;
  lines: string[];
  minWidth?: number;
}): string[] => {
  const content = (lines.length > 0 ? lines : ['']).join('\n');
  const visibleLines = lines.length > 0 ? lines : [''];
  const titleWidth = visibleWidth(title);
  const widestLine = Math.max(0, ...visibleLines.map((line) => visibleWidth(line)));
  const naturalWidth = Math.max(titleWidth, widestLine) + 4;
  const styled = isTextStylingEnabled();
  const terminalWidth = styled ? Math.max(20, (process.stdout.columns || 120) - 1) : naturalWidth;
  const width = Math.min(Math.max(minWidth, naturalWidth), terminalWidth);
  const rendered = boxen(content, {
    title: bold(title),
    titleAlignment: 'left',
    borderStyle: 'round',
    borderColor: 'cyan',
    padding: { top: 0, right: 1, bottom: 0, left: 1 },
    width,
    ...(styled ? {} : { dimBorder: false })
  });

  return rendered.split('\n');
};
