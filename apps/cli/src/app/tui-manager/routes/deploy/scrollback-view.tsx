import { Show, For, Switch, Match } from 'solid-js';
import type { ScrollbackItem } from '../../scrollback-feed';
import type { ErrorDisplayData } from '../../error-rendering';
import type { TuiEvent, TuiMessageType, TuiPhase } from '../../types';
import { ThemeProvider, useTheme } from '../../context/theme';
import { formatDuration } from '../../utils';
import { EventRow } from './event-tree';
import { CfDeployView, HotswapView, CF_EVENT_TYPES, HOTSWAP_EVENT_TYPES } from './deploy-progress';

const MESSAGE_SYMBOLS: Record<TuiMessageType, string> = {
  info: 'ℹ',
  success: '✓',
  error: '✖',
  warn: '▲',
  debug: '·',
  hint: 'ℹ',
  start: '▶',
  announcement: '★'
};

const HeaderView = (props: { item: Extract<ScrollbackItem, { kind: 'header' }> }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="column">
      <box height={1} />
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={theme.running}>
          <b>{props.item.header.action}</b>
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
          {'  '}
          {props.item.header.projectName}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {' '}
          →{' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
          {props.item.header.stageName}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {'  '}
          {props.item.header.region}
        </text>
      </box>
      <Show when={props.item.header.subtitle}>
        <text fg={theme.muted}>{props.item.header.subtitle}</text>
      </Show>
    </box>
  );
};

const PhaseHeaderView = (props: { name: string }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="column">
      <box height={1} />
      <text fg={theme.muted}>
        <b>{props.name}</b>
      </text>
    </box>
  );
};

const EventView = (props: { event: TuiEvent }) => {
  const isCf = () => CF_EVENT_TYPES.includes(props.event.eventType);
  const isHotswap = () => HOTSWAP_EVENT_TYPES.includes(props.event.eventType);

  return (
    <box flexDirection="column" paddingLeft={2}>
      <Switch fallback={<EventRow event={props.event} />}>
        <Match when={isCf()}>
          <CfDeployView event={props.event} isDelete={props.event.eventType === 'DELETE_STACK'} />
        </Match>
        <Match when={isHotswap()}>
          <HotswapView event={props.event} />
        </Match>
      </Switch>
    </box>
  );
};

const OutputLineView = (props: { source?: string; line: string }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="row" width="100%">
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {'  '}
      </text>
      <Show when={props.source}>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          [{props.source}]{' '}
        </text>
      </Show>
      <text fg={theme.muted}>{props.line}</text>
    </box>
  );
};

const MessageView = (props: { type: TuiMessageType; text: string }) => {
  const { theme, messageColors } = useTheme();
  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={messageColors[props.type] ?? theme.text}>
        {MESSAGE_SYMBOLS[props.type] ?? 'ℹ'}{' '}
      </text>
      <text fg={messageColors[props.type] ?? theme.text}>{props.text}</text>
    </box>
  );
};

const PromptAnswerView = (props: { message: string; answer: string }) => {
  const { theme } = useTheme();
  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={theme.running}>
        ?{' '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.text}>
        {props.message}
      </text>
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {' '}
        →{' '}
      </text>
      <text fg={theme.textBright}>{props.answer}</text>
    </box>
  );
};

const ErrorView = (props: { error: ErrorDisplayData }) => {
  const { theme } = useTheme();
  const typeLabel = () => (props.error.isExpected === false ? 'Unexpected Error' : `${props.error.errorType} Error`);

  return (
    <box flexDirection="column" width="100%">
      <box height={1} />
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={theme.error}>
          <b>✗ {typeLabel()}</b>
        </text>
      </box>
      <text fg={theme.text}>{props.error.message}</text>
      <Show when={props.error.errorDetails}>
        {(details) => (
          <box flexDirection="column">
            <box height={1} />
            <text fg={theme.error}>
              <b>▌ {details().title}</b>
            </text>
            <Show when={details().codeFrame}>
              {(frame) => (
                <For each={frame().split('\n')}>
                  {(l) => (
                    <box flexDirection="row">
                      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
                        {'  │ '}
                      </text>
                      <text fg={theme.muted}>{l}</text>
                    </box>
                  )}
                </For>
              )}
            </Show>
          </box>
        )}
      </Show>
      <Show when={props.error.userStackTrace}>
        {(trace) => (
          <box flexDirection="column">
            <box height={1} />
            <text fg={theme.textBright}>
              <b>Stack trace in your code:</b>
            </text>
            <text fg={theme.running}>{trace()}</text>
          </box>
        )}
      </Show>
      <Show when={props.error.hints && props.error.hints.length > 0}>
        <box flexDirection="column">
          <box height={1} />
          <text fg={theme.textBright}>
            <b>Hints:</b>
          </text>
          <For each={props.error.hints}>
            {(hint) => (
              <box flexDirection="row">
                <text flexShrink={0} wrapMode="none" fg={theme.dim}>
                  {'  → '}
                </text>
                <text fg={theme.text}>{hint}</text>
              </box>
            )}
          </For>
        </box>
      </Show>
      <box height={1} />
    </box>
  );
};

const SummaryView = (props: { item: Extract<ScrollbackItem, { kind: 'summary' }> }) => {
  const { theme } = useTheme();
  const icon = () => (props.item.summary.success ? '✓' : '✗');
  const iconColor = () => (props.item.summary.success ? theme.success : theme.error);
  const finishedPhases = () =>
    props.item.phases.filter((p: TuiPhase) => (p.status === 'success' || p.status === 'error') && p.duration);
  const phaseRecap = () =>
    finishedPhases()
      .map((p) => `${p.name} ${formatDuration(p.duration!)}`)
      .join(' · ');

  return (
    <box flexDirection="column">
      <box height={1} />
      <box flexDirection="row">
        <text flexShrink={0} wrapMode="none" fg={iconColor()}>
          {icon()}{' '}
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
          <b>{props.item.summary.message}</b>
        </text>
        <text flexShrink={0} wrapMode="none" fg={theme.dim}>
          {'  '}
          {formatDuration(props.item.totalDurationMs)}
        </text>
      </box>
      <Show when={phaseRecap()}>
        <text fg={theme.dim}>
          {'  '}
          {phaseRecap()}
        </text>
      </Show>
      <For each={props.item.summary.links}>
        {(link) => (
          <box flexDirection="row">
            <text flexShrink={0} wrapMode="none" fg={theme.running}>
              {'  • '}
            </text>
            <text flexShrink={0} wrapMode="none" fg={theme.text}>
              {link.label}:{' '}
            </text>
            <text fg={theme.blue}>{link.url}</text>
          </box>
        )}
      </For>
      <Show when={props.item.summary.consoleUrl}>
        <box flexDirection="row">
          <text flexShrink={0} wrapMode="none" fg={theme.running}>
            {'  • '}
          </text>
          <text flexShrink={0} wrapMode="none" fg={theme.text}>
            Stack details:{' '}
          </text>
          <text fg={theme.blue}>{props.item.summary.consoleUrl}</text>
        </box>
      </Show>
      <box height={1} />
    </box>
  );
};

export const ScrollbackItemView = (props: { item: ScrollbackItem; width: number }) => {
  return (
    <ThemeProvider>
      <box width={props.width} flexDirection="column">
        <Switch>
          <Match when={props.item.kind === 'header'}>
            <HeaderView item={props.item as Extract<ScrollbackItem, { kind: 'header' }>} />
          </Match>
          <Match when={props.item.kind === 'phase-header'}>
            <PhaseHeaderView name={(props.item as Extract<ScrollbackItem, { kind: 'phase-header' }>).name} />
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
            <ErrorView error={(props.item as Extract<ScrollbackItem, { kind: 'error' }>).error} />
          </Match>
          <Match when={props.item.kind === 'summary'}>
            <SummaryView item={props.item as Extract<ScrollbackItem, { kind: 'summary' }>} />
          </Match>
        </Switch>
      </box>
    </ThemeProvider>
  );
};
