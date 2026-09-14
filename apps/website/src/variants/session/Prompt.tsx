import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { COMMAND_HINT, COMMANDS, CWD } from './data';

type CommandId = (typeof COMMANDS)[number]['id'];
type CopyState = 'idle' | 'copied' | 'failed';

type Props = {
  /** Type the command character by character once, on load. The closing prompt shows it at once. */
  typing?: boolean;
  /** The blinking block cursor at the end of the command. */
  cursor?: boolean;
  /** The dim note after the row: what the command does. Hero only. */
  hint?: boolean;
  id?: string;
};

const TYPE_MS = 40;

/**
 * A prompt line with the command typed after it, then a row of bracketed toggles for the install
 * method and a bracketed `copy` key. This is the page's command box: the typed command IS the
 * command, and switching a toggle replaces what was typed.
 *
 * Server-rendered with the full command so it is there before hydration and without JavaScript.
 * The page's inline script hides the hero's text until this island mounts; the layout effect then
 * resets the text to nothing, reveals it, and types it, so the first paint never shows the complete
 * command before the typing starts. With reduced motion the command is shown complete at once.
 */
export function Prompt({ typing = false, cursor = false, hint = false, id }: Props) {
  const [current, setCurrent] = useState<CommandId>('npx');
  const [typed, setTyped] = useState<number | null>(null);
  const [state, setState] = useState<CopyState>('idle');
  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const codeRef = useRef<HTMLElement>(null);
  const uid = useId();
  const entry = COMMANDS.find((candidate) => candidate.id === current) ?? COMMANDS[0];
  const shown = typed === null ? entry.command : entry.command.slice(0, typed);

  useLayoutEffect(() => {
    if (!typing) return;
    document.documentElement.classList.remove('ss-typing');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const total = COMMANDS[0].command.length;
    let count = 0;
    setTyped(0);
    const interval = window.setInterval(() => {
      count += 1;
      setTyped(count >= total ? null : count);
      if (count >= total) window.clearInterval(interval);
    }, TYPE_MS);
    return () => window.clearInterval(interval);
  }, [typing]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const settle = (next: CopyState, message: string, ms: number) => {
    setState(next);
    setStatus(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setState('idle');
      setStatus('');
    }, ms);
  };

  const selectCommand = () => {
    const node = codeRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.command);
      settle('copied', 'Copied to clipboard', 1600);
    } catch {
      selectCommand();
      settle('failed', 'Clipboard unavailable. The command is selected: press Ctrl+C or Cmd+C.', 5000);
    }
  };

  const switchTo = (value: CommandId) => {
    setCurrent(value);
    setTyped(null);
    setState('idle');
    setStatus('');
    window.clearTimeout(timer.current);
  };

  const classes = ['ss-cmd', `ss-cmd--${state}`, typing ? 'ss-cmd--typing' : ''].filter(Boolean).join(' ');

  return (
    <div className={classes} id={id}>
      <p className="ss-cmd__line">
        <span className="ss-cmd__path" aria-hidden="true">
          {CWD}
        </span>
        <span className="ss-cmd__dollar" aria-hidden="true">
          $
        </span>
        <code className="ss-cmd__code" ref={codeRef} id={`${uid}-command`}>
          <span className="ss-cmd__text">{shown}</span>
          {cursor ? (
            <span className="ss-cursor" aria-hidden="true">
              ▍
            </span>
          ) : null}
        </code>
      </p>

      <div className="ss-cmd__row">
        <div className="ss-cmd__tabs" role="tablist" aria-label="Install method">
          {COMMANDS.map((command) => (
            <button
              key={command.id}
              type="button"
              role="tab"
              aria-selected={command.id === current}
              className="ss-tab"
              onClick={() => switchTo(command.id)}
            >
              {command.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ss-key ss-cmd__copy"
          onClick={copy}
          aria-label={`Copy command: ${entry.command}`}
          aria-describedby={`${uid}-command`}
        >
          <span className="ss-cmd__labels" aria-hidden="true">
            <span className="ss-cmd__label ss-cmd__label--copy">copy</span>
            <span className="ss-cmd__label ss-cmd__label--copied">copied</span>
            <span className="ss-cmd__label ss-cmd__label--failed">select and copy</span>
          </span>
        </button>
        {hint ? <span className="ss-cmd__hint"># {COMMAND_HINT}</span> : null}
      </div>

      <p aria-live="polite" className="ss-vh">
        {status}
      </p>
    </div>
  );
}
