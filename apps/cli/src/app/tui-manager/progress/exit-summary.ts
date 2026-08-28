import { bold, colorize, formatDuration, plainFallbackLink } from '../format/text';
import { sessionElapsedMs, type TuiPhase, type TuiState } from './types';

const phaseLines = (phases: TuiPhase[]): string[] => {
  const finishedPhases = phases.filter((p) => p.status === 'success' || p.status === 'error');
  if (finishedPhases.length === 0) return [];

  const lines = [colorize('gray', '─'.repeat(54))];
  for (const p of finishedPhases) {
    const pIcon = p.status === 'success' ? colorize('green', '✓') : colorize('red', '✗');
    const dur = p.duration ? colorize('gray', ` ${formatDuration(p.duration)}`) : '';
    lines.push(`  ${pIcon} ${p.name}${dur}`);
  }
  return lines;
};

/**
 * Plain-text summary inferred from the progress state shape. Used by plain
 * output mode and as the TTY fallback when the presenter never streamed an
 * early failure. In the normal TTY flow, the primary screen holds the record.
 *
 * Decision tree:
 *   state.summary exists          -> full detailed summary (success or failure)
 *   state.cancelDeployment set    -> cancellation summary with phase progress
 *   phases started but no summary -> interrupted summary
 *   nothing meaningful            -> no output
 */
export const renderExitSummaryLines = (state: TuiState): string[] => {
  const { summary, header, phases } = state;
  const elapsed = formatDuration(sessionElapsedMs(state, Date.now()));
  const headerText = header ? `${header.projectName} → ${header.stageName} (${header.region})` : '';
  const action =
    header?.action === 'DELETING'
      ? 'Deletion'
      : header?.action === 'COMPILING TEMPLATE'
        ? 'Template compilation'
        : 'Deployment';

  if (summary) {
    const icon = summary.success ? colorize('green', '✓') : colorize('red', '✗');
    const lines: string[] = [''];
    lines.push(`${icon} ${bold(summary.message)}`);
    if (headerText) lines.push(colorize('gray', headerText));
    lines.push(...phaseLines(phases));

    if (summary.links.length > 0) {
      lines.push(colorize('gray', '─'.repeat(54)));
      for (const link of summary.links) {
        lines.push(`  ${colorize('cyan', '•')} ${link.label}: ${colorize('blue', plainFallbackLink(link.url))}`);
      }
    }

    if (summary.consoleUrl) {
      lines.push(
        `  ${colorize('cyan', '•')} Stack details: ${colorize('blue', plainFallbackLink(summary.consoleUrl))}`
      );
    }

    lines.push(colorize('gray', `  Total: ${elapsed}`));

    const eventsWithOutput = phases.flatMap((p) => p.events.filter((e) => e.outputLines && e.outputLines.length > 0));
    for (const event of eventsWithOutput) {
      lines.push(colorize('gray', '─'.repeat(54)));
      const label = event.description || event.eventType;
      lines.push(`  ${colorize('cyan', '▸')} ${bold(label)}`);
      for (const line of event.outputLines!) {
        if (line.trim()) lines.push(`    ${line}`);
      }
    }

    lines.push('');
    return lines;
  }

  const hasErroredPhase = phases.some((p) => p.status === 'error');
  const hasRunningPhase = phases.some((p) => p.status === 'running');
  const wasCancelled = !!state.cancelDeployment;

  if (hasErroredPhase || (hasRunningPhase && !wasCancelled)) {
    const lines: string[] = [''];
    lines.push(`${colorize('red', '✗')} ${bold(`${action} failed`)}`);
    if (headerText) lines.push(colorize('gray', headerText));
    lines.push(...phaseLines(phases));

    const runningPhase = phases.find((p) => p.status === 'running');
    if (runningPhase) {
      lines.push(`  ${colorize('red', '✗')} ${runningPhase.name} ${colorize('gray', '(failed)')}`);
    }

    lines.push(colorize('gray', `  Elapsed: ${elapsed}`));
    lines.push('');
    return lines;
  }

  if (wasCancelled || hasRunningPhase) {
    const isCancelling = state.cancelDeployment?.isCancelling;
    const lines: string[] = [''];
    lines.push(
      `${colorize('yellow', '▲')} ${bold(isCancelling ? `${action} cancelled — rolling back` : `${action} cancelled`)}`
    );
    if (headerText) lines.push(colorize('gray', headerText));
    lines.push(...phaseLines(phases));

    const runningPhase = phases.find((p) => p.status === 'running');
    if (runningPhase) {
      lines.push(`  ${colorize('yellow', '▲')} ${runningPhase.name} ${colorize('gray', '(interrupted)')}`);
    }

    lines.push(colorize('gray', `  Elapsed: ${elapsed}`));
    lines.push('');
    return lines;
  }

  return [];
};
