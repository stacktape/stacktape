import { Show, For, Switch, Match, type JSX } from 'solid-js';
import type { ScrollbackItem } from '../feed';
import type { ErrorDisplayData } from '../../format/errors';
import { getErrorLabel, wrapText } from '../../format/errors';
import type { CfProgressData, TuiEvent, TuiPhase } from '../types';
import type { TuiDeploymentHeader, TuiMessageType } from '../../types';
import { ThemeProvider, useTheme } from '../../ui/theme';
import { glyphs } from '../../ui/glyphs';
import { formatDuration } from '../../format/text';
import { CF_EVENT_TYPES } from './live-panel';

/**
 * Scrollback is a document: everything here is written exactly once and becomes
 * the permanent terminal record. The grammar (2-cell icon gutter, right-aligned
 * duration rail, one indentation level for children, `│` gutter for raw output)
 * is shared by every block. The document measure is capped at 100 cells — in
 * ultra-wide terminals a longer duration rail reads as an accident.
 */
const MAX_DOCUMENT_WIDTH = 100;

const MESSAGE_GLYPHS: Record<TuiMessageType, string> = {
  info: glyphs.info,
  success: glyphs.success,
  error: glyphs.error,
  warn: glyphs.warning,
  debug: glyphs.pending,
  hint: glyphs.info,
  start: glyphs.selected,
  announcement: glyphs.accentBar
};

const DurationRail = (props: { duration?: number }) => {
  const { theme } = useTheme();
  return (
    <Show when={props.duration}>
      <box flexGrow={1} />
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {'  '}
        {formatDuration(props.duration!)}
      </text>
    </Show>
  );
};

const commandVerbLabel = (action?: TuiDeploymentHeader['action']): string => {
  if (!action) return 'RUN';
  if (action === 'DELETING') return 'DELETE';
  if (action === 'COMPILING TEMPLATE') return 'SYNTH';
  if (action === 'PREVIEWING CHANGES') return 'DIFF';
  if (action === 'VALIDATING') return 'VALIDATE';
  if (action.startsWith('RUNNING SCRIPT')) return 'SCRIPT';
  if (action === 'UPDATING') return 'UPDATE';
  if (action === 'RUNNING DEV MODE' || action === 'RUNNING DEV MODE (legacy)') return 'DEV';
  return 'DEPLOY';
};

const HeaderView = (props: { header: TuiDeploymentHeader }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="column">
      <box height={1} />
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={theme.running}>
          {glyphs.accentBar}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
          {' '}
          <b>{commandVerbLabel(props.header.action)}</b>
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {'  '}
          {props.header.projectName}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {' '}
          /{' '}
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
          {props.header.stageName}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          {' '}
          {glyphs.separator} {props.header.region}
        </text>
      </box>
      <Show when={props.header.subtitle}>
        <text fg={theme.muted}>
          {'  '}
          {props.header.subtitle}
        </text>
      </Show>
    </box>
  );
};

const PhaseDividerView = (props: { name: string; width: number }) => {
  const { theme } = useTheme();
  const prefix = () => `${glyphs.rule.repeat(2)} `;
  const fill = () => glyphs.rule.repeat(Math.max(0, props.width - props.name.length - 4));
  return (
    <box flexDirection="column">
      <box height={1} />
      <box height={1} flexDirection="row" overflow="hidden">
        <text flexShrink={0} wrapMode="none" fg={theme.border}>
          {prefix()}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          {props.name}
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.border}>
          {' '}
          {fill()}
        </text>
      </box>
    </box>
  );
};

type FinishedChild = {
  text: string;
  status: TuiEvent['status'];
  duration?: number;
};

const finishedChildren = (children: TuiEvent[]): FinishedChild[] => {
  const grouped = new Map<string, TuiEvent[]>();
  for (const child of children) {
    const key = child.instanceId || child.id;
    const group = grouped.get(key) || [];
    group.push(child);
    grouped.set(key, group);
  }

  const result: FinishedChild[] = [];
  for (const [instanceId, events] of grouped) {
    const lastFinished = [...events].reverse().find((e) => e.status === 'success' || e.status === 'error');
    const anyError = events.some((e) => e.status === 'error');
    const duration = events.reduce((sum, e) => sum + (e.duration || 0), 0) || undefined;
    result.push({
      text: lastFinished?.finalMessage || lastFinished?.description || instanceId,
      status: anyError ? 'error' : (lastFinished?.status ?? 'success'),
      duration
    });
  }
  return result;
};

/** One finished event: never description AND finalMessage — one normalized outcome. */
const eventText = (event: TuiEvent): string => event.finalMessage || event.description || event.eventType;

const cfEventText = (event: TuiEvent): string => {
  const data = event.data as CfProgressData | undefined;
  const counts = data?.kind === 'cloudformation-progress' ? data.changeCounts : undefined;
  if (!counts || counts.created + counts.updated + counts.deleted === 0) return eventText(event);
  const parts: string[] = [];
  if (counts.created > 0) parts.push(`${counts.created} created`);
  if (counts.updated > 0) parts.push(`${counts.updated} updated`);
  if (counts.deleted > 0) parts.push(`${counts.deleted} deleted`);
  return `CloudFormation ${data!.stackAction} ${glyphs.separator} ${parts.join(` ${glyphs.separator} `)}`;
};

const StatusGlyph = (props: { status: TuiEvent['status'] }) => {
  const { theme } = useTheme();
  return (
    <text
      flexShrink={0}
      wrapMode="none"
      fg={props.status === 'error' ? theme.error : props.status === 'warning' ? theme.warning : theme.success}
    >
      {props.status === 'error' ? glyphs.error : props.status === 'warning' ? glyphs.warning : glyphs.success}
    </text>
  );
};

const EventView = (props: { event: TuiEvent }) => {
  const { theme } = useTheme();
  const isCf = () => CF_EVENT_TYPES.includes(props.event.eventType);
  const children = () =>
    props.event.hideChildrenWhenFinished && props.event.status === 'success'
      ? []
      : finishedChildren(props.event.children);

  return (
    <box flexDirection="column">
      <box flexDirection="row" width="100%">
        <StatusGlyph status={props.event.status} />
        <text flexShrink={1} wrapMode="none" fg={theme.text}>
          {' '}
          {isCf() ? cfEventText(props.event) : eventText(props.event)}
        </text>
        <DurationRail duration={props.event.duration} />
      </box>
      <For each={children()}>
        {(child, index) => (
          <box flexDirection="row" width="100%">
            <text flexShrink={0} wrapMode="none" fg={theme.border}>
              {'  '}
              {index() === children().length - 1 ? glyphs.treeEnd : glyphs.treeBranch}
            </text>
            <text flexShrink={0} wrapMode="none">
              {' '}
            </text>
            <StatusGlyph status={child.status} />
            <text flexShrink={1} wrapMode="none" fg={theme.text}>
              {' '}
              {child.text}
            </text>
            <DurationRail duration={child.duration} />
          </box>
        )}
      </For>
    </box>
  );
};

const OutputLineView = (props: { source?: string; line: string }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="row" width="100%">
      <text flexShrink={0} wrapMode="none" fg={theme.border}>
        {'    '}
        {glyphs.gutter}
      </text>
      <Show when={props.source}>
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          {' '}
          {props.source}{' '}
        </text>
      </Show>
      <text flexShrink={1} wrapMode="none" fg={theme.text}>
        {' '}
        {props.line}
      </text>
    </box>
  );
};

const MessageView = (props: { type: TuiMessageType; text: string }) => {
  const { theme, messageColors } = useTheme();
  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={messageColors[props.type] ?? theme.text}>
        {MESSAGE_GLYPHS[props.type] ?? glyphs.info}{' '}
      </text>
      <text
        fg={props.type === 'info' || props.type === 'debug' ? theme.muted : (messageColors[props.type] ?? theme.text)}
      >
        {props.text}
      </text>
    </box>
  );
};

const PromptAnswerView = (props: { message: string; answer: string }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="row" width="100%">
      <text flexShrink={0} wrapMode="none" fg={theme.running}>
        ?{' '}
      </text>
      <text flexShrink={1} wrapMode="none" fg={theme.muted}>
        {props.message}
      </text>
      <box flexGrow={1} />
      <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
        {'  '}
        {props.answer}
      </text>
    </box>
  );
};

const GutterRow = (props: { color: string; children?: JSX.Element }) => (
  <box flexDirection="row" width="100%">
    <text flexShrink={0} wrapMode="none" fg={props.color}>
      {'  '}
      {glyphs.gutter}
    </text>
    {props.children}
  </box>
);

const ErrorView = (props: { error: ErrorDisplayData; commandVerb?: string; width: number }) => {
  const { theme } = useTheme();
  // Semantic line breaks: wrapping is done here, never by the terminal, so the
  // gutter column stays intact on every line.
  const textWidth = () => Math.max(24, props.width - 6);
  const title = () => {
    const verb = props.commandVerb;
    if (verb && verb !== 'RUN') return `${verb} FAILED`;
    return props.error.isExpected === false ? 'UNEXPECTED ERROR' : getErrorLabel(props.error.errorType).toUpperCase();
  };

  return (
    <box flexDirection="column" width="100%">
      <box height={1} />
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={theme.error}>
          {glyphs.accentBar} <b>{title()}</b>
        </text>
      </box>
      <GutterRow color={theme.error} />
      <For each={wrapText(props.error.message, textWidth())}>
        {(line) => (
          <GutterRow color={theme.error}>
            <text flexShrink={1} wrapMode="none" fg={theme.text}>
              {' '}
              {line}
            </text>
          </GutterRow>
        )}
      </For>
      <Show when={props.error.errorDetails}>
        {(details) => (
          <>
            <GutterRow color={theme.error} />
            <GutterRow color={theme.error}>
              <text flexShrink={1} wrapMode="none" fg={theme.textBright}>
                {' '}
                <b>{details().title}</b>
              </text>
            </GutterRow>
            <Show when={details().codeFrame}>
              {(frame) => (
                <For each={frame().split('\n')}>
                  {(line) => (
                    <GutterRow color={theme.error}>
                      <text flexShrink={1} wrapMode="none" fg={theme.muted}>
                        {' '}
                        {line}
                      </text>
                    </GutterRow>
                  )}
                </For>
              )}
            </Show>
          </>
        )}
      </Show>
      <Show when={props.error.userStackTrace}>
        {(trace) => (
          <>
            <GutterRow color={theme.error} />
            <For each={trace().split('\n')}>
              {(line) => (
                <GutterRow color={theme.error}>
                  <text flexShrink={1} wrapMode="none" fg={theme.muted}>
                    {' '}
                    {line}
                  </text>
                </GutterRow>
              )}
            </For>
          </>
        )}
      </Show>
      <Show when={props.error.hints && props.error.hints.length > 0}>
        <GutterRow color={theme.error} />
        <GutterRow color={theme.error}>
          <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
            {' '}
            <b>Fix</b>
          </text>
        </GutterRow>
        <For each={props.error.hints}>
          {(hint) => (
            <For each={wrapText(hint, textWidth() - 2)}>
              {(line, lineIndex) => (
                <box flexDirection="row" width="100%">
                  <text flexShrink={0} wrapMode="none" fg={theme.error}>
                    {'  '}
                    {glyphs.gutter}
                  </text>
                  <text flexShrink={0} wrapMode="none" fg={theme.running}>
                    {' '}
                    {lineIndex() === 0 ? glyphs.selected : ' '}
                  </text>
                  <text flexShrink={1} wrapMode="none" fg={theme.text}>
                    {' '}
                    {line}
                  </text>
                </box>
              )}
            </For>
          )}
        </For>
      </Show>
      <Show when={props.error.stackTrace}>
        {(trace) => (
          <>
            <GutterRow color={theme.error} />
            <For each={trace().split('\n')}>
              {(line) => (
                <GutterRow color={theme.error}>
                  <text flexShrink={1} wrapMode="none" fg={theme.dim}>
                    {' '}
                    {line}
                  </text>
                </GutterRow>
              )}
            </For>
          </>
        )}
      </Show>
      <Show when={props.error.sentryEventId}>
        <GutterRow color={theme.error}>
          <text flexShrink={1} wrapMode="none" fg={theme.dim}>
            {' '}
            error id {props.error.sentryEventId}
          </text>
        </GutterRow>
      </Show>
      <box height={1} />
    </box>
  );
};

const PHASE_TIMING_LABELS: Record<string, string> = {
  INITIALIZE: 'init',
  BUILD_AND_PACKAGE: 'package',
  UPLOAD: 'upload',
  DEPLOY: 'deploy',
  POST_DEPLOY: 'finalize'
};

const cfChangesFromPhases = (phases: TuiPhase[]) => {
  for (const phase of [...phases].reverse()) {
    for (const event of [...phase.events].reverse()) {
      const data = event.data as CfProgressData | undefined;
      if (data?.kind === 'cloudformation-progress') {
        return { counts: data.changeCounts, total: data.totalPlanned };
      }
    }
  }
  return null;
};

/**
 * The deployment receipt — the signature block of the CLI. Brand + outcome +
 * change magnitude + performance, written once at the end of the run.
 */
const SummaryView = (props: { item: Extract<ScrollbackItem, { kind: 'summary' }>; width: number }) => {
  const { theme } = useTheme();
  const success = () => props.item.summary.success;
  const icon = () => (success() ? glyphs.success : glyphs.error);
  const iconColor = () => (success() ? theme.success : theme.error);
  const totalText = () => `total ${formatDuration(props.item.totalDurationMs)}`;

  const titleFill = () => {
    const used = 2 + 1 + ' stacktape '.length + 2 + 2 + props.item.summary.message.length + 1 + totalText().length + 1;
    return glyphs.rule.repeat(Math.max(2, props.width - used));
  };

  const links = () => {
    const rows: Array<{ label: string; url: string }> = props.item.summary.links.map((link) => ({
      label: link.label,
      url: link.url
    }));
    if (props.item.summary.consoleUrl) rows.push({ label: 'console', url: props.item.summary.consoleUrl });
    return rows;
  };
  const labelWidth = () => Math.min(18, Math.max(7, ...links().map((l) => l.label.length), 'changes'.length));

  const changes = () => cfChangesFromPhases(props.item.phases);
  const changesText = () => {
    const data = changes();
    if (!data || data.counts.created + data.counts.updated + data.counts.deleted === 0) return null;
    const parts: string[] = [];
    if (data.total) parts.push(`${data.total} resources`);
    if (data.counts.created > 0) parts.push(`+${data.counts.created} created`);
    if (data.counts.updated > 0) parts.push(`~${data.counts.updated} updated`);
    if (data.counts.deleted > 0) parts.push(`-${data.counts.deleted} deleted`);
    return parts.join(` ${glyphs.separator} `);
  };

  const timingText = () => {
    const finished = props.item.phases.filter((p) => (p.status === 'success' || p.status === 'error') && p.duration);
    if (finished.length === 0) return null;
    return finished
      .map((p) => `${PHASE_TIMING_LABELS[p.id] ?? p.name.toLowerCase()} ${formatDuration(p.duration!)}`)
      .join(` ${glyphs.separator} `);
  };

  const target = () => {
    const header = props.item.header;
    if (!header) return null;
    return `${header.projectName} / ${header.stageName} ${glyphs.separator} ${header.region}`;
  };

  return (
    <box flexDirection="column" width="100%">
      <box height={1} />
      <box height={1} flexDirection="row" overflow="hidden">
        <text flexShrink={0} wrapMode="none" fg={theme.border}>
          {glyphs.rule.repeat(2)}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.muted}>
          {' '}
          stacktape{' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.border}>
          {glyphs.rule.repeat(2)}
        </text>
        <text flexShrink={0} wrapMode="none" fg={iconColor()}>
          {' '}
          {icon()}{' '}
        </text>
        <text flexShrink={1} wrapMode="none" fg={iconColor()}>
          <b>{props.item.summary.message}</b>
        </text>
        <text flexShrink={1} wrapMode="none" fg={theme.border}>
          {' '}
          {titleFill()}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {' '}
          {totalText()}
        </text>
      </box>
      <Show when={target()}>
        <text wrapMode="none" fg={theme.muted}>
          {'   '}
          {target()}
        </text>
      </Show>
      <Show when={links().length > 0}>
        <box height={1} />
        <For each={links()}>
          {(link) => (
            <box flexDirection="row" width="100%">
              <text flexShrink={0} wrapMode="none" fg={theme.text}>
                {'   '}
                {link.label.padEnd(labelWidth())}
              </text>
              <text flexShrink={1} wrapMode="none" fg={theme.running}>
                {'  '}
                {link.url}
              </text>
            </box>
          )}
        </For>
      </Show>
      <Show when={changesText() || timingText()}>
        <box height={1} />
        <Show when={changesText()}>
          <box flexDirection="row" width="100%">
            <text flexShrink={0} wrapMode="none" fg={theme.text}>
              {'   '}
              {'changes'.padEnd(labelWidth())}
            </text>
            <text flexShrink={1} wrapMode="none" fg={theme.muted}>
              {'  '}
              {changesText()}
            </text>
          </box>
        </Show>
        <Show when={timingText()}>
          <box flexDirection="row" width="100%">
            <text flexShrink={0} wrapMode="none" fg={theme.text}>
              {'   '}
              {'timing'.padEnd(labelWidth())}
            </text>
            <text flexShrink={1} wrapMode="none" fg={theme.muted}>
              {'  '}
              {timingText()}
            </text>
          </box>
        </Show>
      </Show>
      <text wrapMode="none" fg={theme.border}>
        {glyphs.rule.repeat(props.width)}
      </text>
      <box height={1} />
    </box>
  );
};

export const ScrollbackItemView = (props: { item: ScrollbackItem; width: number }) => {
  const documentWidth = () => Math.min(props.width, MAX_DOCUMENT_WIDTH);
  return (
    <ThemeProvider>
      <box width={documentWidth()} flexDirection="column">
        <Switch>
          <Match when={props.item.kind === 'header'}>
            <HeaderView header={(props.item as Extract<ScrollbackItem, { kind: 'header' }>).header} />
          </Match>
          <Match when={props.item.kind === 'phase-header'}>
            <PhaseDividerView
              name={(props.item as Extract<ScrollbackItem, { kind: 'phase-header' }>).name}
              width={documentWidth()}
            />
          </Match>
          <Match when={props.item.kind === 'event'}>
            <EventView event={(props.item as Extract<ScrollbackItem, { kind: 'event' }>).event} />
          </Match>
          <Match when={props.item.kind === 'output-line'}>
            <OutputLineView
              source={(props.item as Extract<ScrollbackItem, { kind: 'output-line' }>).source}
              line={(props.item as Extract<ScrollbackItem, { kind: 'output-line' }>).line}
            />
          </Match>
          <Match when={props.item.kind === 'message'}>
            <MessageView
              type={(props.item as Extract<ScrollbackItem, { kind: 'message' }>).type}
              text={(props.item as Extract<ScrollbackItem, { kind: 'message' }>).text}
            />
          </Match>
          <Match when={props.item.kind === 'prompt-answer'}>
            <PromptAnswerView
              message={(props.item as Extract<ScrollbackItem, { kind: 'prompt-answer' }>).message}
              answer={(props.item as Extract<ScrollbackItem, { kind: 'prompt-answer' }>).answer}
            />
          </Match>
          <Match when={props.item.kind === 'error'}>
            <ErrorView
              error={(props.item as Extract<ScrollbackItem, { kind: 'error' }>).error}
              commandVerb={commandVerbLabel((props.item as Extract<ScrollbackItem, { kind: 'error' }>).header?.action)}
              width={documentWidth()}
            />
          </Match>
          <Match when={props.item.kind === 'summary'}>
            <SummaryView item={props.item as Extract<ScrollbackItem, { kind: 'summary' }>} width={documentWidth()} />
          </Match>
        </Switch>
      </box>
    </ThemeProvider>
  );
};
