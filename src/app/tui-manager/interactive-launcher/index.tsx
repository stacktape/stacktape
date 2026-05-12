import { createMemo, createSignal, For, Show } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import { getAllowedArgs, getArgInfo, validateCommandArgs } from '../../../config/cli/utils';
import { getStacktapeVersion } from '../../../utils/versioning';
import { createOpenTuiApp } from '../opentui-renderer';
import {
  commandSuggestions,
  fetchRecentCommandSuggestions,
  formatCommandLine,
  formatRelativeTime,
  getAllowedValuesForArg,
  getLauncherDefaultArgs,
  getLauncherRequiredArgs,
  normalizeArgValue
} from './data';
import type { CommandSuggestion, InteractiveLauncherResult, RecentCommandSuggestion } from './types';

type LauncherMode = 'home' | 'arg' | 'optional' | 'review';

type LauncherAppProps = {
  defaults: StacktapeArgs;
  recentCommands: RecentCommandSuggestion[];
  onComplete: (result: InteractiveLauncherResult | null) => void;
};

type OptionalChoice = { type: 'arg'; argName: string; label: string; description: string };

type PaletteSelectable =
  | { kind: 'recent'; recent: RecentCommandSuggestion }
  | { kind: 'command'; command: CommandSuggestion };

type PaletteEntry = PaletteSelectable | { kind: 'header'; title: string };

type Hint = { key: string; label: string };

const POPOVER_VISIBLE = 10;
const PANEL_MAX_WIDTH = 84;

// Stacktape brand palette (sourced from website/src/styles/variables.ts).
const BG = '#171D1D'; // mainBackground
const PANEL_BG = '#202525'; // inputBackground
const ACCENT = '#36BEBE'; // stacktapeGreen — selection, cursor, accent bar
const ACCENT_TEXT = '#0c1414'; // dark contrast on accent bg
const LOGO_COLOR = '#36BEBE';
const TEXT_BRIGHT = '#F4F4F5';
const TEXT = '#DEDEDE';
const MUTED = '#8C8C8C';
const DIM = '#5A6060';
const SUCCESS = '#0ABBB5';
const ERROR = '#EB6161';
const WARNING = '#ED8B00';

const launcherTheme = {
  bg: BG,
  running: ACCENT,
  text: TEXT,
  textBright: TEXT_BRIGHT,
  muted: MUTED,
  dim: DIM,
  success: SUCCESS,
  error: ERROR,
  warning: WARNING
};

const InteractiveLauncherAppInner = (props: LauncherAppProps) => {
  const allCommands = commandSuggestions();

  const [mode, setMode] = createSignal<LauncherMode>('home');
  const [input, setInput] = createSignal('');
  const [paletteIndex, setPaletteIndex] = createSignal(0);
  const [argSuggestionIndex, setArgSuggestionIndex] = createSignal(0);
  const [optionalIndex, setOptionalIndex] = createSignal(0);
  const [selectedCommand, setSelectedCommand] = createSignal<StacktapeCommand | null>(null);
  const [args, setArgs] = createSignal<StacktapeArgs>({});
  const [argQueue, setArgQueue] = createSignal<string[]>([]);
  const [currentArg, setCurrentArg] = createSignal<string | null>(null);
  const [argReturnMode, setArgReturnMode] = createSignal<LauncherMode>('optional');
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const isPaletteOpen = () => mode() === 'home' && input().startsWith('/');
  const paletteQuery = () => (isPaletteOpen() ? input().slice(1).toLowerCase() : '');

  const paletteEntries = createMemo<PaletteEntry[]>(() => {
    if (!isPaletteOpen()) return [];
    const q = paletteQuery();
    const recentMatches = props.recentCommands.filter((r) => `${r.command} ${r.label}`.toLowerCase().includes(q));
    const commandMatches = q ? allCommands.filter((c) => c.command.toLowerCase().includes(q)) : allCommands;
    const entries: PaletteEntry[] = [];
    if (recentMatches.length) {
      entries.push({ kind: 'header', title: 'recent' });
      for (const recent of recentMatches) entries.push({ kind: 'recent', recent });
    }
    if (commandMatches.length) {
      entries.push({ kind: 'header', title: 'commands' });
      for (const command of commandMatches) entries.push({ kind: 'command', command });
    }
    return entries;
  });

  const paletteSelectables = createMemo(() =>
    paletteEntries().filter((e): e is PaletteSelectable => e.kind !== 'header')
  );

  const argInfo = createMemo(() => {
    const command = selectedCommand();
    const argName = currentArg();
    return command && argName ? getArgInfo(command, argName) : null;
  });

  const isCurrentArgLauncherRequired = () => {
    const command = selectedCommand();
    const argName = currentArg();
    if (!command || !argName) return false;
    return getLauncherRequiredArgs(command).includes(argName);
  };

  const argSuggestions = createMemo<string[]>(() => {
    const argName = currentArg();
    const info = argInfo();
    if (!argName) return [];
    const allowed = getAllowedValuesForArg(argName, info?.allowedValues);
    if (!allowed?.length) return [];
    const q = input().toLowerCase();
    if (!q) return allowed;
    const filtered = allowed.filter((v) => v.toLowerCase().includes(q));
    return filtered.length ? filtered : allowed;
  });

  const optionalChoices = createMemo<OptionalChoice[]>(() => {
    const command = selectedCommand();
    if (!command) return [];
    const requiredArgs = new Set(getLauncherRequiredArgs(command));
    const alreadySet = new Set(Object.keys(args()));
    return getAllowedArgs(command)
      .filter((argName) => !requiredArgs.has(argName) && !alreadySet.has(argName))
      .map<OptionalChoice>((argName) => {
        const info = getArgInfo(command, argName);
        return {
          type: 'arg',
          argName,
          label: `--${argName}`,
          description: info.description ? firstLine(info.description) : ''
        };
      });
  });

  const startCommand = (command: StacktapeCommand, initialArgs: StacktapeArgs = {}) => {
    const mergedArgs = compactArgs({ ...props.defaults, ...initialArgs });
    const missingRequired = getLauncherRequiredArgs(command).filter((argName) => !hasArgValue(mergedArgs[argName]));
    setSelectedCommand(command);
    setArgs(mergedArgs);
    setArgQueue([...missingRequired]);
    setErrorMessage(null);
    setInput('');
    if (missingRequired.length) {
      beginArgPrompt(missingRequired[0], 'arg');
    } else {
      setMode('optional');
      setOptionalIndex(0);
    }
  };

  const beginArgPrompt = (argName: string, returnMode: LauncherMode) => {
    const currentArgs = args();
    const defaultValue = hasArgValue(currentArgs[argName]) ? String(currentArgs[argName]) : '';
    setCurrentArg(argName);
    setInput(defaultValue);
    setArgSuggestionIndex(0);
    setArgReturnMode(returnMode);
    setErrorMessage(null);
    setMode('arg');
  };

  const finishArgPrompt = () => {
    const command = selectedCommand();
    const argName = currentArg();
    if (!command || !argName) return;
    const info = getArgInfo(command, argName);
    const entered = input();
    const launcherRequired = getLauncherRequiredArgs(command).includes(argName);
    if (!entered.trim() && !hasArgValue(args()[argName]) && launcherRequired) {
      setErrorMessage(`${argName} is required.`);
      return;
    }
    const nextArgs = {
      ...args(),
      [argName]: normalizeArgValue({
        value: entered || String(args()[argName] || ''),
        allowedTypes: info.allowedTypes
      })
    };
    setArgs(compactArgs(nextArgs));
    const queue = argQueue().filter((name) => name !== argName);
    setArgQueue(queue);
    setInput('');
    if (queue.length) {
      beginArgPrompt(queue[0], 'arg');
      return;
    }
    setCurrentArg(null);
    setOptionalIndex(0);
    setMode(argReturnMode() === 'arg' ? 'optional' : argReturnMode());
  };

  const submitSelection = () => {
    const command = selectedCommand();
    if (!command) return;
    const validation = validateCommandArgs(command, args());
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue ? `${issue.path.join('.') || command}: ${issue.message}` : 'Invalid command arguments.');
      setMode('review');
      return;
    }
    props.onComplete({ command, args: validation.data as StacktapeArgs });
  };

  const cancelLauncher = () => props.onComplete(null);

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'c') {
      cancelLauncher();
      return;
    }

    if (mode() === 'home') {
      if (key.name === 'escape') {
        // Esc only clears typed input; quitting is reserved for Ctrl+C.
        if (input()) {
          setInput('');
          setPaletteIndex(0);
        }
        return;
      }
      if (isPaletteOpen()) {
        const selectables = paletteSelectables();
        if (key.name === 'up') {
          setPaletteIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, selectables.length - 1)));
          return;
        }
        if (key.name === 'down') {
          setPaletteIndex((prev) => (prev < selectables.length - 1 ? prev + 1 : 0));
          return;
        }
        if (key.name === 'tab' || key.name === 'return') {
          const choice = selectables[paletteIndex()];
          if (!choice) return;
          if (choice.kind === 'recent') {
            props.onComplete({ command: choice.recent.command, args: choice.recent.args });
          } else {
            startCommand(choice.command.command);
          }
          return;
        }
      }
      handleTextEntry(key, input(), setInput);
      if (input().startsWith('/')) setPaletteIndex(0);
      return;
    }

    if (mode() === 'arg') {
      const suggestions = argSuggestions();
      if (key.ctrl && key.name === 'return') {
        // Commit the current value (if any) and run, skipping any remaining required prompts.
        // submitSelection() validates and bounces to review on error.
        const command = selectedCommand();
        const argName = currentArg();
        if (command && argName) {
          const info = getArgInfo(command, argName);
          const entered = input();
          if (entered.trim()) {
            const merged = compactArgs({
              ...args(),
              [argName]: normalizeArgValue({ value: entered, allowedTypes: info.allowedTypes })
            });
            setArgs(merged);
          }
        }
        submitSelection();
        return;
      }
      if (key.name === 'escape') {
        setInput('');
        setMode(argReturnMode() === 'arg' ? 'home' : 'optional');
        return;
      }
      if (suggestions.length) {
        if (key.name === 'up') {
          setArgSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          return;
        }
        if (key.name === 'down') {
          setArgSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          return;
        }
        if (key.name === 'tab') {
          const value = suggestions[argSuggestionIndex()];
          if (value) setInput(value);
          return;
        }
        if (key.name === 'return') {
          const value = suggestions[argSuggestionIndex()];
          if (value && !input().trim()) {
            setInput(value);
          }
          finishArgPrompt();
          return;
        }
      }
      if (key.name === 'return') {
        finishArgPrompt();
        return;
      }
      handleTextEntry(key, input(), setInput);
      setArgSuggestionIndex(0);
      return;
    }

    if (mode() === 'optional') {
      const choices = optionalChoices();
      if (key.ctrl && key.name === 'return') {
        submitSelection();
        return;
      }
      if (key.name === 'escape') {
        setMode('home');
        setSelectedCommand(null);
        setInput('');
        return;
      }
      if (key.name === 'up') {
        setOptionalIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, choices.length - 1)));
        return;
      }
      if (key.name === 'down') {
        setOptionalIndex((prev) => (prev < choices.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.name === 'return') {
        const choice = choices[optionalIndex()];
        if (!choice) return;
        beginArgPrompt(choice.argName, 'optional');
      }
      return;
    }

    if (mode() === 'review') {
      if (key.name === 'escape') {
        setMode('optional');
        return;
      }
      if (key.name === 'return') {
        submitSelection();
      }
    }
  });

  const hints = (): Hint[] => {
    if (mode() === 'home') {
      if (isPaletteOpen()) {
        return [
          { key: '↑↓', label: 'navigate' },
          { key: 'enter', label: 'pick' },
          { key: 'esc', label: 'clear' },
          { key: 'ctrl+c', label: 'quit' }
        ];
      }
      return [
        { key: '/', label: 'commands' },
        { key: 'ctrl+c', label: 'quit' }
      ];
    }
    if (mode() === 'arg') {
      return argSuggestions().length
        ? [
            { key: '↑↓', label: 'pick' },
            { key: 'tab', label: 'fill' },
            { key: 'enter', label: 'next' },
            { key: 'ctrl+enter', label: 'run' },
            { key: 'esc', label: 'back' }
          ]
        : [
            { key: 'enter', label: 'next' },
            { key: 'ctrl+enter', label: 'run' },
            { key: 'esc', label: 'back' }
          ];
    }
    if (mode() === 'optional') {
      return [
        { key: '↑↓', label: 'add option' },
        { key: 'ctrl+enter', label: 'run' },
        { key: 'esc', label: 'commands' }
      ];
    }
    return [
      { key: 'enter', label: 'run' },
      { key: 'esc', label: 'back' }
    ];
  };

  const inputPrefix = () => {
    if (mode() === 'home') return '';
    if (mode() === 'arg' && currentArg()) return '';
    return '';
  };

  const placeholder = () => {
    if (mode() === 'home') return 'type / for commands';
    if (mode() === 'arg') {
      const argName = currentArg();
      if (!argName) return '';
      return argInfo()?.allowedValues?.length ? `pick a value or type to filter` : `enter ${argName}`;
    }
    return '';
  };

  const contextLine = () => {
    if (mode() === 'home') {
      return describeDefaults(props.defaults);
    }
    if (mode() === 'arg') {
      const cmd = selectedCommand();
      const argName = currentArg();
      if (!cmd || !argName) return '';
      return `> ${formatCommandLine(cmd, {
        ...args(),
        [argName]: input().trim() || `{${argName}}`
      })}`;
    }
    if (mode() === 'optional') {
      const cmd = selectedCommand();
      if (!cmd) return '';
      return `> ${formatCommandLine(cmd, args())}`;
    }
    return '';
  };

  const showLogo = () => mode() === 'home' && !isPaletteOpen();

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={BG} paddingX={2} paddingY={1}>
      <box flexGrow={1} flexDirection="row" justifyContent="center">
        <box flexDirection="column" width={PANEL_MAX_WIDTH} flexShrink={1}>
          <box flexGrow={3} />
          <Show when={showLogo()}>
            <Logo />
          </Show>

          <Show when={mode() === 'home'}>
            <Panel>
              <Show when={isPaletteOpen()}>
                <PaletteList entries={paletteEntries()} selectedIndex={paletteIndex()} />
                <PanelGap />
              </Show>
              <PanelInput prefix={inputPrefix()} value={input()} display={input()} placeholder={placeholder()} />
              <PanelFooter text={contextLine()} />
            </Panel>
          </Show>

          <Show when={mode() === 'arg'}>
            <Panel>
              <Show when={argSuggestions().length}>
                <SuggestionList items={argSuggestions()} selectedIndex={argSuggestionIndex()} />
                <PanelGap />
              </Show>
              <ArgHeader
                argName={currentArg()}
                description={argInfo()?.description}
                required={isCurrentArgLauncherRequired()}
              />
              <PanelGap />
              <PanelInput prefix="" value={input()} display={input()} placeholder={placeholder()} />
              <PanelFooter text={contextLine()} />
            </Panel>
          </Show>

          <Show when={mode() === 'optional'}>
            <Panel>
              <OptionalList choices={optionalChoices()} selectedIndex={optionalIndex()} />
              <PanelFooter text={contextLine()} />
            </Panel>
          </Show>

          <Show when={mode() === 'review'}>
            <Panel>
              <ReviewBody command={selectedCommand()} args={args()} error={errorMessage()} />
              <PanelFooter text="ready" />
            </Panel>
          </Show>

          <Show when={errorMessage() && mode() !== 'review'}>
            <box paddingX={1} marginTop={1}>
              <text fg={ERROR}>{errorMessage()}</text>
            </box>
          </Show>

          <HintsBar hints={hints()} />
          <box flexGrow={2} />
        </box>
      </box>

      <box flexDirection="row" justifyContent="space-between" paddingX={1} marginTop={1}>
        <text fg={DIM}>~</text>
        <text fg={DIM}>v{getStacktapeVersion()}</text>
      </box>
    </box>
  );
};

const Logo = () => (
  <box flexDirection="row" justifyContent="center" marginBottom={1}>
    <ascii_font text="stacktape" font="tiny" color={LOGO_COLOR} />
  </box>
);

const Panel = (props: { children: any }) => (
  <box flexDirection="column" backgroundColor={PANEL_BG} paddingX={0} paddingY={1}>
    {props.children}
  </box>
);

const PanelEmpty = (props: { message: string }) => {
  const theme = launcherTheme;
  return (
    <box paddingX={2}>
      <text fg={theme.muted}>{props.message}</text>
    </box>
  );
};

const PaletteList = (props: { entries: PaletteEntry[]; selectedIndex: number }) => {
  const selectables = createMemo(() => props.entries.filter((e): e is PaletteSelectable => e.kind !== 'header'));
  const visibleSelectable = createMemo(() => visibleWindow(selectables(), props.selectedIndex, POPOVER_VISIBLE));
  const counts = () => hiddenCounts(selectables().length, visibleSelectable());

  // Project the visible selectables back into their original entry list, including each
  // section's header whenever the section has any visible item in the window.
  const visibleRows = createMemo(() => {
    const rows: Array<{ entry: PaletteEntry; selectableIndex: number | null }> = [];
    const visibleSet = new Set(visibleSelectable().map((v) => v.index));
    let selectableIdx = -1;
    let lastHeader: PaletteEntry | null = null;
    let headerEmitted = false;
    for (const entry of props.entries) {
      if (entry.kind === 'header') {
        lastHeader = entry;
        headerEmitted = false;
        continue;
      }
      selectableIdx++;
      if (!visibleSet.has(selectableIdx)) continue;
      if (lastHeader && !headerEmitted) {
        rows.push({ entry: lastHeader, selectableIndex: null });
        headerEmitted = true;
      }
      rows.push({ entry, selectableIndex: selectableIdx });
    }
    return rows;
  });

  const colWidth = createMemo(() => {
    const labels: string[] = [];
    for (const entry of props.entries) {
      if (entry.kind === 'recent') labels.push(entry.recent.command);
      else if (entry.kind === 'command') labels.push(entry.command.label);
    }
    return maxLabelWidth(labels);
  });

  return (
    <box flexDirection="column">
      <Show when={props.entries.length} fallback={<PanelEmpty message="No commands match." />}>
        <MoreIndicator count={counts().above} direction="up" />
        <For each={visibleRows()}>
          {(row) => (
            <Show
              when={row.entry.kind === 'header'}
              fallback={
                <PaletteSelectableRow
                  entry={row.entry as PaletteSelectable}
                  selected={row.selectableIndex === props.selectedIndex}
                  colWidth={colWidth()}
                />
              }
            >
              <SectionHeader title={(row.entry as { kind: 'header'; title: string }).title} />
            </Show>
          )}
        </For>
        <MoreIndicator count={counts().below} direction="down" />
      </Show>
    </box>
  );
};

const SectionHeader = (props: { title: string }) => {
  const theme = launcherTheme;
  return (
    <box flexDirection="row" paddingX={2} backgroundColor={PANEL_BG} marginTop={0}>
      <text flexShrink={0} wrapMode="none" fg={theme.dim} bg={PANEL_BG}>
        {props.title}
      </text>
    </box>
  );
};

const PaletteSelectableRow = (props: { entry: PaletteSelectable; selected: boolean; colWidth: number }) => {
  if (props.entry.kind === 'recent') {
    return <RecentRow recent={props.entry.recent} selected={props.selected} colWidth={props.colWidth} />;
  }
  return <PaletteRow item={props.entry.command} selected={props.selected} colWidth={props.colWidth} />;
};

const PaletteRow = (props: { item: CommandSuggestion; selected: boolean; colWidth: number }) => {
  const theme = launcherTheme;
  const labelText = () => padRight(props.item.label, props.colWidth);
  return (
    <box flexDirection="row" paddingX={2} backgroundColor={props.selected ? theme.running : PANEL_BG}>
      <text
        flexShrink={0}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : theme.textBright}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        <b>{labelText()}</b>
      </text>
      <text
        flexShrink={1}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : theme.muted}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        {' '}
        {props.item.description}
      </text>
    </box>
  );
};

const SuggestionList = (props: { items: string[]; selectedIndex: number }) => {
  const theme = launcherTheme;
  const visible = createMemo(() => visibleWindow(props.items, props.selectedIndex, POPOVER_VISIBLE));
  const counts = () => hiddenCounts(props.items.length, visible());
  return (
    <box flexDirection="column">
      <MoreIndicator count={counts().above} direction="up" />
      <For each={visible()}>
        {(row) => (
          <box flexDirection="row" paddingX={2} backgroundColor={row.selected ? theme.running : PANEL_BG}>
            <text
              flexShrink={0}
              wrapMode="none"
              fg={row.selected ? ACCENT_TEXT : theme.text}
              bg={row.selected ? theme.running : PANEL_BG}
            >
              <b>{row.item}</b>
            </text>
          </box>
        )}
      </For>
      <MoreIndicator count={counts().below} direction="down" />
    </box>
  );
};

const RecentRow = (props: { recent: RecentCommandSuggestion; selected: boolean; colWidth: number }) => {
  const theme = launcherTheme;
  const statusColor = () => {
    if (props.recent.status === 'success') return theme.success;
    if (props.recent.status === 'error') return theme.error;
    if (props.recent.status === 'inProgress') return theme.running;
    return theme.dim;
  };
  const statusGlyph = () => {
    if (props.recent.status === 'inProgress') return '◐';
    if (props.recent.status === 'unknown') return '○';
    return '●';
  };
  const occurredText = () => formatRelativeTime(props.recent.occurredAt);
  return (
    <box flexDirection="row" paddingX={2} backgroundColor={props.selected ? theme.running : PANEL_BG}>
      <text
        flexShrink={0}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : statusColor()}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        {statusGlyph()}{' '}
      </text>
      <text
        flexShrink={0}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : theme.textBright}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        <b>{padRight(props.recent.command, props.colWidth)}</b>
      </text>
      <text
        flexShrink={1}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : theme.muted}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        {' '}
        {props.recent.description}
      </text>
      <box flexGrow={1} backgroundColor={props.selected ? theme.running : PANEL_BG} />
      <text
        flexShrink={0}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : theme.dim}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        {occurredText()}
      </text>
    </box>
  );
};

const ArgHeader = (props: { argName: string | null; description?: string; required: boolean }) => {
  const theme = launcherTheme;
  return (
    <box flexDirection="column" paddingX={2} paddingY={0}>
      <box flexDirection="row">
        <text fg={theme.textBright}>
          Enter <b>{props.argName ?? ''}</b>
        </text>
        <Show when={props.required}>
          <text fg={theme.muted}> (required)</text>
        </Show>
      </box>
      <Show when={props.description}>
        <text fg={theme.muted}>{cleanDescription(props.description!)}</text>
      </Show>
    </box>
  );
};

const OptionalList = (props: { choices: OptionalChoice[]; selectedIndex: number }) => {
  const colWidth = createMemo(() => maxLabelWidth(props.choices.map((c) => c.label)));
  const visible = createMemo(() => visibleWindow(props.choices, props.selectedIndex, POPOVER_VISIBLE));
  const counts = () => hiddenCounts(props.choices.length, visible());
  return (
    <box flexDirection="column">
      <MoreIndicator count={counts().above} direction="up" />
      <For each={visible()}>
        {(row) => <OptionalRow choice={row.item} selected={row.selected} colWidth={colWidth()} />}
      </For>
      <MoreIndicator count={counts().below} direction="down" />
    </box>
  );
};

const OptionalRow = (props: { choice: OptionalChoice; selected: boolean; colWidth: number }) => {
  const theme = launcherTheme;
  const labelColor = () => (props.selected ? ACCENT_TEXT : theme.textBright);
  return (
    <box flexDirection="row" paddingX={2} backgroundColor={props.selected ? theme.running : PANEL_BG}>
      <text flexShrink={0} wrapMode="none" fg={labelColor()} bg={props.selected ? theme.running : PANEL_BG}>
        <b>{padRight(props.choice.label, props.colWidth)}</b>
      </text>
      <text
        flexShrink={1}
        wrapMode="none"
        fg={props.selected ? ACCENT_TEXT : theme.muted}
        bg={props.selected ? theme.running : PANEL_BG}
      >
        {' '}
        {props.choice.description}
      </text>
    </box>
  );
};

const ReviewBody = (props: { command: StacktapeCommand | null; args: StacktapeArgs; error: string | null }) => {
  const theme = launcherTheme;
  return (
    <box flexDirection="column" paddingX={2}>
      <text fg={theme.dim}>ready to run</text>
      <box marginTop={1}>
        <text fg={theme.success} wrapMode="word">
          {props.command ? formatCommandLine(props.command, props.args) : ''}
        </text>
      </box>
      <Show when={props.error}>
        <box marginTop={1}>
          <text fg={theme.error}>{props.error}</text>
        </box>
      </Show>
    </box>
  );
};

const PanelInput = (props: { prefix: string; value: string; display: string; placeholder: string }) => {
  const theme = launcherTheme;
  return (
    <box flexDirection="row" backgroundColor={PANEL_BG}>
      <text flexShrink={0} wrapMode="none" fg={theme.running} bg={PANEL_BG}>
        {' ▎'}
      </text>
      <box flexDirection="row" paddingX={1} backgroundColor={PANEL_BG} flexGrow={1}>
        <Show when={props.prefix}>
          <text flexShrink={0} wrapMode="none" fg={theme.muted} bg={PANEL_BG}>
            {props.prefix}
          </text>
        </Show>
        <Show
          when={props.display}
          fallback={
            <>
              <text flexShrink={0} wrapMode="none" fg={theme.textBright} bg={PANEL_BG}>
                ▌
              </text>
              <text flexShrink={1} wrapMode="none" fg={theme.dim} bg={PANEL_BG}>
                {props.placeholder}
              </text>
            </>
          }
        >
          <text flexShrink={1} wrapMode="none" fg={theme.textBright} bg={PANEL_BG}>
            {props.display}
          </text>
          <text flexShrink={0} wrapMode="none" fg={theme.textBright} bg={PANEL_BG}>
            ▌
          </text>
        </Show>
      </box>
    </box>
  );
};

const PanelFooter = (props: { text: string }) => {
  const theme = launcherTheme;
  return (
    <Show when={props.text}>
      <box flexDirection="column" backgroundColor={PANEL_BG}>
        <box height={1} backgroundColor={PANEL_BG} />
        <box flexDirection="row" backgroundColor={PANEL_BG} paddingX={2}>
          <text flexShrink={1} wrapMode="none" fg={theme.muted} bg={PANEL_BG}>
            {props.text}
          </text>
        </box>
      </box>
    </Show>
  );
};

const PanelGap = () => <box height={1} backgroundColor={PANEL_BG} />;

const HintsBar = (props: { hints: Hint[] }) => {
  const theme = launcherTheme;
  return (
    <box flexDirection="row" justifyContent="flex-end" paddingX={1} marginTop={1}>
      <For each={props.hints}>
        {(hint, index) => (
          <>
            <Show when={index() > 0}>
              <text fg={theme.dim}>{'   '}</text>
            </Show>
            <text flexShrink={0} wrapMode="none" fg={theme.textBright}>
              <b>{hint.key}</b>
            </text>
            <text flexShrink={0} wrapMode="none" fg={theme.muted}>
              {' '}
              {hint.label}
            </text>
          </>
        )}
      </For>
    </box>
  );
};

const handleTextEntry = (
  key: { name?: string; sequence?: string; ctrl?: boolean; meta?: boolean },
  value: string,
  setValue: (next: string) => void
) => {
  if (key.name === 'backspace') {
    if (value.length > 0) setValue(value.slice(0, -1));
    return;
  }
  if (!key.sequence || key.ctrl || key.meta) return;
  // Single-line only: drop CR / LF and any non-printing control chars.
  const sanitized = key.sequence.replace(/[\r\n]/g, '');
  if (sanitized.length === 1 && sanitized.charCodeAt(0) >= 0x20) {
    setValue(value + sanitized);
  }
};

const visibleWindow = <T,>(items: readonly T[], selectedIndex: number, size: number) => {
  if (items.length === 0) return [];
  const window = Math.min(size, items.length);
  const start = Math.max(0, Math.min(selectedIndex - Math.floor(window / 2), items.length - window));
  return items.slice(start, start + window).map((item, offset) => {
    const index = start + offset;
    return { item, index, selected: index === selectedIndex };
  });
};

const hiddenCounts = (total: number, visible: ReadonlyArray<{ index: number }>) => {
  if (visible.length === 0) return { above: 0, below: 0 };
  const firstIndex = visible[0].index;
  const lastIndex = visible[visible.length - 1].index;
  return { above: firstIndex, below: Math.max(0, total - 1 - lastIndex) };
};

const MoreIndicator = (props: { count: number; direction: 'up' | 'down' }) => {
  const theme = launcherTheme;
  return (
    <Show when={props.count > 0}>
      <box paddingX={2} backgroundColor={PANEL_BG}>
        <text fg={theme.dim} bg={PANEL_BG}>
          {props.direction === 'up' ? '↑' : '↓'} {props.count} more
        </text>
      </box>
    </Show>
  );
};

const hasArgValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const compactArgs = (args: StacktapeArgs) => {
  const compacted: StacktapeArgs = {};
  for (const [key, value] of Object.entries(args)) {
    if (hasArgValue(value)) compacted[key] = value;
  }
  return compacted;
};

const cleanDescription = (raw: string) => {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== '---' && !line.startsWith('####'))
    .slice(0, 2)
    .join(' ');
};

const firstLine = (raw: string) => {
  return (
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== '---' && !line.startsWith('####'))[0] || ''
  );
};

const padRight = (value: string, width: number) => {
  if (value.length >= width) return value;
  return value + ' '.repeat(width - value.length);
};

const maxLabelWidth = (labels: string[]) => {
  let width = 0;
  for (const label of labels) {
    if (label.length > width) width = label.length;
  }
  return width + 2;
};

const describeDefaults = (defaults: StacktapeArgs): string => {
  const parts: string[] = [];
  if (defaults.projectName) parts.push(String(defaults.projectName));
  if (defaults.stage) parts.push(String(defaults.stage));
  if (defaults.region) parts.push(String(defaults.region));
  return parts.join(' · ');
};

const InteractiveLauncherApp = (props: LauncherAppProps) => <InteractiveLauncherAppInner {...props} />;

export const runInteractiveLauncher = async (): Promise<InteractiveLauncherResult | null> => {
  const [defaults, recentCommands] = await Promise.all([getLauncherDefaultArgs(), fetchRecentCommandSuggestions()]);

  let resolveResult: (result: InteractiveLauncherResult | null) => void;
  const resultPromise = new Promise<InteractiveLauncherResult | null>((resolve) => {
    resolveResult = resolve;
  });

  const handle = await createOpenTuiApp(
    () => (
      <InteractiveLauncherApp
        defaults={defaults}
        recentCommands={recentCommands}
        onComplete={(result) => resolveResult(result)}
      />
    ),
    {
      useAlternateScreen: true,
      releaseStdinOnDestroy: false
    }
  );

  const result = await resultPromise;
  await handle.destroy();
  if (!result) {
    try {
      process.stdin.pause();
      process.stdin.unref();
    } catch {}
  }
  return result;
};
