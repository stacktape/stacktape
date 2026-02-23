import kleur from 'kleur';
import stringWidth from 'string-width';
import type { TuiDeploymentHeader, TuiEvent, TuiMessage, TuiMessageType, TuiPhase, TuiWarning } from './types';
import { COMMAND_HEADER_BOX_MIN_WIDTH } from './command-header';
import { formatDuration, stripAnsi } from './utils';

const bold = (s: string) => kleur.bold(s);
const color = (c: string, s: string) => (kleur[c as keyof typeof kleur] as (t: string) => string)?.(s) ?? s;
const visibleWidth = (s: string) => stringWidth(stripAnsi(s));

export const renderHeaderToString = (header: TuiDeploymentHeader): string => {
  const actionLine = bold(color('cyan', header.action));
  const targetLine = `${header.projectName} ${color('gray', '→')} ${header.stageName} ${color('gray', `(${header.region})`)}`;
  const plainTarget = `${header.projectName} -> ${header.stageName} (${header.region})`;
  const totalWidth = Math.max(COMMAND_HEADER_BOX_MIN_WIDTH, visibleWidth(plainTarget) + 4);
  const innerWidth = totalWidth - 2;
  const textWidth = innerWidth - 2;

  const top = `╭${'─'.repeat(innerWidth)}╮`;
  const actionPad = Math.max(0, textWidth - visibleWidth(actionLine));
  const targetPad = Math.max(0, textWidth - visibleWidth(targetLine));
  const actionRow = `│ ${actionLine}${' '.repeat(actionPad)} │`;
  const targetRow = `│ ${targetLine}${' '.repeat(targetPad)} │`;
  const bottom = `╰${'─'.repeat(innerWidth)}╯`;

  return `${top}\n${actionRow}\n${targetRow}\n${bottom}\n`;
};

const CF_DEPLOY_EVENT_TYPES: LoggableEventType[] = ['UPDATE_STACK', 'DELETE_STACK', 'ROLLBACK_STACK', 'HOTSWAP_UPDATE'];

const statusIcon = (status: TuiEvent['status']): string => {
  switch (status) {
    case 'running':
      return color('yellow', '⠿');
    case 'success':
      return color('green', '✓');
    case 'error':
      return color('red', '✗');
    case 'warning':
      return color('yellow', '!');
    default:
      return color('gray', '•');
  }
};

type AggregatedEvent = TuiEvent & { boldPrefix?: string };

const getAggregatedChildren = (children: TuiEvent[]): AggregatedEvent[] => {
  if (children.length === 0) return [];
  const byKey = new Map<string, TuiEvent[]>();
  for (const child of children) {
    const key = child.instanceId || child.id;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(child);
  }
  return Array.from(byKey.entries())
    .sort(([, a], [, b]) => Math.min(...a.map((e) => e.startTime)) - Math.min(...b.map((e) => e.startTime)))
    .map(([instanceId, events]) => {
      const first = events[0];
      const running = events.find((e) => e.status === 'running');
      const anyError = events.some((e) => e.status === 'error');
      const allDone = events.every((e) => e.status === 'success' || e.status === 'error');
      const startTime = Math.min(...events.map((e) => e.startTime));
      const endTimes = events.filter((e) => e.endTime).map((e) => e.endTime!);
      const endTime = allDone && endTimes.length > 0 ? Math.max(...endTimes) : undefined;
      const last = events.filter((e) => e.status === 'success' || e.status === 'error').at(-1);
      return {
        ...first,
        id: `agg-${instanceId}`,
        boldPrefix: instanceId,
        description: '',
        additionalMessage: running ? (running.description || '') : undefined,
        finalMessage: allDone ? last?.finalMessage : undefined,
        status: running ? 'running' : allDone ? (anyError ? 'error' : 'success') : 'running',
        startTime,
        endTime,
        duration: allDone && endTime ? endTime - startTime : undefined,
        children: []
      } as AggregatedEvent;
    });
};

const NEVER_FLATTEN: LoggableEventType[] = ['PACKAGE_ARTIFACTS', 'UPLOAD_DEPLOYMENT_ARTIFACTS', 'SYNC_BUCKET'];

const renderEventToLines = (event: TuiEvent, opts: { isChild?: boolean; isLast?: boolean; depth?: number }): string[] => {
  const { isChild = false, isLast = false, depth = 0 } = opts;
  const lines: string[] = [];

  const prefix = isChild ? (isLast ? '└' : '├') : '';
  const indent = isChild ? ' '.repeat(depth) : '';

  const hasChildren = event.children.length > 0;
  const hasOutput = event.outputLines && event.outputLines.length > 0;
  const allChildrenDone = event.children.every((c) => c.status === 'success' || c.status === 'error');
  const hideChildren = event.hideChildrenWhenFinished && event.status === 'success' && allChildrenDone;

  const isHotswap = event.eventType === 'HOTSWAP_UPDATE';
  let displayChildren: AggregatedEvent[];
  if (hasChildren && isHotswap) {
    displayChildren = getAggregatedChildren(event.children);
  } else if (hasChildren) {
    displayChildren = getAggregatedChildren(event.children);
  } else {
    displayChildren = [];
  }

  const shouldFlatten = displayChildren.length === 1 && !hasOutput && !NEVER_FLATTEN.includes(event.eventType);
  const flat = shouldFlatten ? displayChildren[0] : null;

  const dStatus = flat ? flat.status : event.status;
  const dDuration = flat ? flat.duration : event.duration;
  const dFinal = flat ? flat.finalMessage : event.finalMessage;
  const dAdditional = flat ? flat.additionalMessage : event.additionalMessage;
  const bPrefix = flat?.boldPrefix ?? (event as AggregatedEvent).boldPrefix;
  const descPrefix = event.description;
  const descSuffix = flat?.description || '';

  let line = `${indent}`;
  if (isChild) line += `${color('gray', prefix)} `;
  line += `${statusIcon(dStatus)} `;
  if (descPrefix) line += descPrefix;
  if (descPrefix && bPrefix) line += ' ';
  if (bPrefix) line += bold(bPrefix);
  if (descSuffix) line += `: ${descSuffix}`;
  if (dDuration !== undefined && dStatus !== 'running') line += ` ${color('yellow', formatDuration(dDuration))}`;
  if (dFinal && dStatus !== 'running') line += ` ${color('gray', dFinal)}`;
  if (dAdditional && dStatus === 'running') line += ` ${color('gray', dAdditional)}`;
  lines.push(line);

  if (hasOutput) {
    for (const ol of event.outputLines!.filter((l) => l.trim())) {
      lines.push(`   ${color('gray', ol)}`);
    }
  }

  if (hasChildren && !hideChildren && !shouldFlatten) {
    for (let i = 0; i < displayChildren.length; i++) {
      lines.push(
        ...renderEventToLines(displayChildren[i], {
          isChild: true,
          isLast: i === displayChildren.length - 1,
          depth: depth + 1
        })
      );
    }
  }

  return lines;
};

export const renderEventToString = (event: TuiEvent): string => {
  return renderEventToLines(event, {}).join('\n') + '\n';
};

const parseSummaryCounts = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { created: 0, updated: 0, deleted: 0 };
  const match = cleaned.match(/Summary:\s*created=(\d+)\s*updated=(\d+)\s*deleted=(\d+)/i);
  if (!match) return { created: 0, updated: 0, deleted: 0 };
  return { created: Number(match[1]), updated: Number(match[2]), deleted: Number(match[3]) };
};

const parseDetailLists = (message?: string) => {
  const cleaned = stripAnsi(message);
  if (!cleaned) return { created: null, updated: null, deleted: null };
  const match = cleaned.match(/Details:\s*created=([^;]+);\s*updated=([^;]+);\s*deleted=([^.]+)\./i);
  if (!match) return { created: null, updated: null, deleted: null };
  return { created: match[1].trim(), updated: match[2].trim(), deleted: match[3].trim() };
};

const formatListSummary = (items: string | null, count: number, max: number) => {
  if (count === 0) return null;
  if (!items || items === 'none') return '...';
  const list = items.split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.length) return null;
  const visible = list.slice(0, max);
  const overflow = list.length - visible.length;
  const needsEllipsis = overflow > 0 || count > list.length;
  return `${visible.join(', ')}${needsEllipsis ? ', ...' : ''}`;
};

const getActiveDeployEvent = (events: TuiEvent[]) => {
  const running = events.find((e) => CF_DEPLOY_EVENT_TYPES.includes(e.eventType) && e.status === 'running');
  if (running) return running;
  const finished = [...events].reverse().find(
    (e) => CF_DEPLOY_EVENT_TYPES.includes(e.eventType) && (e.status === 'success' || e.status === 'error')
  );
  if (finished) return finished;
  return events.find((e) => CF_DEPLOY_EVENT_TYPES.includes(e.eventType));
};

const hasRunningDescendant = (event: TuiEvent): boolean =>
  event.children.some((child) => child.status === 'running' || hasRunningDescendant(child));

const renderDeployPhaseBody = (phase: TuiPhase, warnings: TuiWarning[], messages: TuiMessage[]): string[] => {
  const lines: string[] = [];
  const deployEvent = getActiveDeployEvent(phase.events);
  const isDeployDone = deployEvent?.status === 'success' || deployEvent?.status === 'error';
  const isHotswap = deployEvent?.eventType === 'HOTSWAP_UPDATE';
  const isDelete = deployEvent?.eventType === 'DELETE_STACK';
  const deployChildren = deployEvent?.children || [];

  const phaseLevelEvents = phase.events.filter((e) => {
    const isDeploy = CF_DEPLOY_EVENT_TYPES.includes(e.eventType);
    const isChild = deployChildren.some((c) => c.id === e.id);
    return !isDeploy && !isChild;
  });
  const visibleEvents = phaseLevelEvents.filter(
    (e) => phase.status !== 'running' || e.status !== 'pending' || hasRunningDescendant(e)
  );
  const deployStart = deployEvent?.startTime || Infinity;
  const before = visibleEvents.filter((e) => e.startTime < deployStart);
  const after = visibleEvents.filter((e) => e.startTime >= deployStart);

  for (const ev of before) lines.push(...renderEventToLines(ev, {}));

  if (isHotswap && deployEvent) {
    lines.push(...renderEventToLines(deployEvent, {}));
  }

  if (!isHotswap && isDeployDone && deployEvent) {
    const summaryCounts = parseSummaryCounts(deployEvent.additionalMessage);
    const detailLists = parseDetailLists(deployEvent.additionalMessage);
    const nothingToUpdate = !isDelete &&
      summaryCounts.created === 0 && summaryCounts.updated === 0 && summaryCounts.deleted === 0;

    const statusChar = deployEvent.status === 'success' ? color('green', '✓') : color('red', '✗');
    const verb = isDelete ? 'Deleting' : 'Deploying';
    let summaryLine = `${statusChar} ${verb}`;
    if (deployEvent.duration !== undefined) summaryLine += ` ${color('yellow', formatDuration(deployEvent.duration))}`;
    if (nothingToUpdate) summaryLine += ` ${color('gray', 'Nothing to update')}`;
    lines.push(summaryLine);

    if (!isDelete && !nothingToUpdate) {
      const fmtList = (label: string, items: string | null, count: number, prefix: string) => {
        let l = `   ${color('gray', prefix)} ${label}: ${count}`;
        const summary = formatListSummary(items, count, 4);
        if (summary) l += ` ${color('gray', `(${summary})`)}`;
        return l;
      };
      lines.push(fmtList('Created', detailLists.created, summaryCounts.created, '├'));
      lines.push(fmtList('Updated', detailLists.updated, summaryCounts.updated, '├'));
      lines.push(fmtList('Deleted', detailLists.deleted, summaryCounts.deleted, '└'));
    }
    if (isDelete) {
      let l = `   ${color('gray', '└')} Deleted: ${summaryCounts.deleted}`;
      const summary = formatListSummary(detailLists.deleted, summaryCounts.deleted, 4);
      if (summary) l += ` ${color('gray', `(${summary})`)}`;
      lines.push(l);
    }
  }

  if (isHotswap && isDeployDone) {
    lines.push(`${color('green', '✓')} Hotswap deployment completed.`);
  }

  for (const ev of after) lines.push(...renderEventToLines(ev, {}));

  const phaseWarnings = warnings.filter((w) => w.phase === phase.id);
  for (const w of phaseWarnings) {
    const wLines = w.message.split('\n');
    for (let i = 0; i < wLines.length; i++) {
      lines.push(i === 0 ? `${color('yellow', '⚠')} ${color('yellow', wLines[i])}` : `  ${color('yellow', wLines[i])}`);
    }
  }

  const phaseMessages = messages.filter((m) => m.phase === phase.id);
  for (const m of phaseMessages) lines.push(...renderMessageToLines(m));

  return lines;
};

const MESSAGE_ICONS: Record<TuiMessageType, { symbol: string; color: string }> = {
  info: { symbol: 'i', color: 'cyan' },
  success: { symbol: '✓', color: 'green' },
  error: { symbol: '✖', color: 'red' },
  warn: { symbol: '⚠', color: 'yellow' },
  debug: { symbol: '⚙', color: 'gray' },
  hint: { symbol: '💡', color: 'blue' },
  start: { symbol: '▶', color: 'magenta' },
  announcement: { symbol: '★', color: 'magenta' }
};

const renderMessageToLines = (message: TuiMessage): string[] => {
  const { symbol, color: c } = MESSAGE_ICONS[message.type];
  const msgLines = message.message.split('\n');
  return msgLines.map((line, i) => (i === 0 ? `${color(c, symbol)} ${line}` : `  ${line}`));
};

export const renderPhaseToString = (
  phase: TuiPhase,
  phaseNumber: number,
  warnings: TuiWarning[],
  messages: TuiMessage[],
  showPhaseHeader: boolean
): string => {
  const lines: string[] = [];
  const hasCfEvents = phase.events.some((e) => CF_DEPLOY_EVENT_TYPES.includes(e.eventType));

  if (showPhaseHeader) {
    const timerStr = phase.duration !== undefined
      ? ` ${color('gray', formatDuration(phase.duration))}`
      : '';
    lines.push(`${bold(`PHASE ${phaseNumber}`)} • ${bold(phase.name)}${timerStr}`);
    lines.push(color('gray', '─'.repeat(54)));
  }

  if (hasCfEvents) {
    lines.push(...renderDeployPhaseBody(phase, warnings, messages));
  } else {
    const visibleEvents = phase.events.filter(
      (e) => phase.status !== 'running' || e.status !== 'pending' || hasRunningDescendant(e)
    );
    for (const ev of visibleEvents) lines.push(...renderEventToLines(ev, {}));

    const phaseWarnings = warnings.filter((w) => w.phase === phase.id);
    for (const w of phaseWarnings) {
      const wLines = w.message.split('\n');
      for (let i = 0; i < wLines.length; i++) {
        lines.push(i === 0 ? `${color('yellow', '⚠')} ${color('yellow', wLines[i])}` : `  ${color('yellow', wLines[i])}`);
      }
    }

    const phaseMessages = messages.filter((m) => m.phase === phase.id);
    for (const m of phaseMessages) lines.push(...renderMessageToLines(m));
  }

  lines.push('');
  return lines.join('\n') + '\n';
};

export const renderGlobalMessageToString = (message: TuiMessage): string => {
  return renderMessageToLines(message).join('\n') + '\n';
};
