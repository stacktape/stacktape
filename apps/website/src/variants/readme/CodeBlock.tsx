import { Button } from '@stacktape/ui-react/button';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useEffect, useId, useRef, useState } from 'react';
import { COMMAND_HINT, COMMANDS } from './data';

type CommandId = (typeof COMMANDS)[number]['id'];
type CopyState = 'idle' | 'copied' | 'failed';

const TABS = COMMANDS.map((command) => ({ value: command.id, label: command.label }));

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <path
      d="m3 8.4 3.2 3.1L13 4.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The README's fenced code block, and the page's only call to action: a header row with the
 * install method on the left and Copy on the right, the commands below it behind `$` prompts,
 * and (in the Install section only) a shell comment saying what the last command does.
 *
 * The npx tab is one command. The install tabs are two: the installer, then `stacktape init`,
 * the next command after installing; Copy copies both lines. Server-rendered so it reads before
 * hydration. The button keeps one width across "Copy", "Copied" and "Select and copy": the three
 * labels share a grid cell. The block never changes height when a tab switches: the pre has room
 * for the tallest tab, and a long command scrolls inside its row.
 */
export function CodeBlock({ label = 'Install', hint = true, id }: { label?: string; hint?: boolean; id?: string }) {
  const [current, setCurrent] = useState<CommandId>('npx');
  const [state, setState] = useState<CopyState>('idle');
  const [status, setStatus] = useState('');
  const [overflows, setOverflows] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const preRef = useRef<HTMLPreElement>(null);
  const uid = useId();
  const entry = COMMANDS.find((candidate) => candidate.id === current) ?? COMMANDS[0];
  const text = entry.lines.join('\n');

  useEffect(() => {
    const node = preRef.current;
    if (!node) return;
    const measure = () => {
      const codes = Array.from(node.querySelectorAll<HTMLElement>('[data-cmd]'));
      setOverflows(codes.some((code) => code.scrollWidth > code.clientWidth + 1));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text]);

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

  const selectCommands = () => {
    const node = preRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      settle('copied', 'Copied to clipboard', 1600);
    } catch {
      selectCommands();
      settle('failed', 'Clipboard unavailable. The commands are selected: press Ctrl+C or Cmd+C.', 5000);
    }
  };

  const switchTo = (value: CommandId) => {
    setCurrent(value);
    setState('idle');
    setStatus('');
    window.clearTimeout(timer.current);
  };

  const panelId = `${uid}-panel`;

  return (
    <div className={`rm-code rm-code--${state}${hint ? ' rm-code--hint' : ''}`} id={id}>
      <div className="rm-code__head">
        <Tabs
          appearance="underline"
          ariaLabel={`${label}: install method`}
          className="rm-code__tabs"
          onValueChange={switchTo}
          size="small"
          tabs={TABS.map((tab) => ({ value: tab.value, label: tab.label, panelId }))}
          value={current}
          width="fit"
        />
        <Button aria-label={`Copy: ${text}`} className="rm-code__copy" onClick={copy} variant="primary">
          <span className="rm-code__labels" aria-hidden="true">
            <span className="rm-code__label rm-code__label--copy">
              <CopyIcon />
              Copy
            </span>
            <span className="rm-code__label rm-code__label--copied">
              <CheckIcon />
              Copied
            </span>
            <span className="rm-code__label rm-code__label--failed">Select and copy</span>
          </span>
        </Button>
      </div>

      <pre
        className={overflows ? 'rm-code__pre rm-code__pre--overflow' : 'rm-code__pre'}
        id={panelId}
        ref={preRef}
        role="tabpanel"
      >
        {entry.lines.map((line) => (
          <span className="rm-code__line" key={line}>
            <span aria-hidden="true" className="rm-code__prompt">
              $
            </span>
            <code className="rm-code__cmd" data-cmd>
              {line}
            </code>
          </span>
        ))}
        {hint ? (
          <span className="rm-code__line rm-code__line--comment">
            <span aria-hidden="true" className="rm-code__prompt">
              #
            </span>
            <code className="rm-code__comment">{COMMAND_HINT}</code>
          </span>
        ) : null}
      </pre>

      <p aria-live="polite" className="rm-visually-hidden">
        {status}
      </p>
    </div>
  );
}
