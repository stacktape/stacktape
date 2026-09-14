import { Button } from '@stacktape/ui-react/button';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useEffect, useId, useRef, useState } from 'react';
import { COMMANDS } from './data';

type CommandId = (typeof COMMANDS)[number]['id'];
type CopyState = 'idle' | 'copied' | 'failed';

const TABS = COMMANDS.map((command) => ({ value: command.id, label: command.label }));

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
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
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
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
 * The only call to action: one command, a segmented switcher for the install method, and a primary
 * Copy button. Server-rendered so it is visible before hydration; the same component sits in the
 * hero and in the closing. Reused from the journey study; only the class prefix and the hint changed.
 *
 * The button keeps one width across "Copy", "Copied" and "Select and copy": the three labels share
 * a grid cell, so the widest of them sizes the control and the others fade in place.
 */
export function CommandBox({ label = 'Get started' }: { label?: string }) {
  const [current, setCurrent] = useState<CommandId>('npx');
  const [state, setState] = useState<CopyState>('idle');
  const [status, setStatus] = useState('');
  const [overflows, setOverflows] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const codeRef = useRef<HTMLElement>(null);
  const id = useId();
  const entry = COMMANDS.find((candidate) => candidate.id === current) ?? COMMANDS[0];
  const long = entry.command.length > 30;

  // A long command scrolls inside its row rather than wrapping; a fade on the right edge says so.
  useEffect(() => {
    const node = codeRef.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollWidth > node.clientWidth + 1);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [entry.command]);

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
    setState('idle');
    setStatus('');
    window.clearTimeout(timer.current);
  };

  const panelId = `${id}-panel`;

  return (
    <div className={`hm-cmd hm-cmd--${state}`} data-hm-cmd>
      <div className="hm-cmd__top">
        <Tabs
          appearance="segmented"
          ariaLabel={`${label}: install method`}
          className="hm-cmd__tabs"
          onValueChange={switchTo}
          size="small"
          tabs={TABS.map((tab) => ({ value: tab.value, label: tab.label, panelId }))}
          value={current}
          width="fit"
        />
        <p className="hm-cmd__hint">
          Opens a page in your browser <span aria-hidden="true">·</span>{' '}
          <span className="hm-cmd__hint-tail">nothing is created on AWS until you press Deploy</span>
        </p>
      </div>

      <div className={overflows ? 'hm-cmd__row hm-cmd__row--overflow' : 'hm-cmd__row'} id={panelId} role="tabpanel">
        <span aria-hidden="true" className="hm-cmd__prompt">
          $
        </span>
        <code className={long ? 'hm-cmd__code hm-cmd__code--long' : 'hm-cmd__code'} ref={codeRef}>
          {entry.command}
          <span aria-hidden="true" className="hm-cmd__caret" />
        </code>
        <Button aria-label={`Copy command: ${entry.command}`} className="hm-cmd__copy" onClick={copy} variant="primary">
          <span className="hm-cmd__labels" aria-hidden="true">
            <span className="hm-cmd__label hm-cmd__label--copy">
              <CopyIcon />
              Copy
            </span>
            <span className="hm-cmd__label hm-cmd__label--copied">
              <CheckIcon />
              Copied
            </span>
            <span className="hm-cmd__label hm-cmd__label--failed">Select and copy</span>
          </span>
        </Button>
      </div>

      <p aria-live="polite" className="hm-visually-hidden">
        {status}
      </p>
    </div>
  );
}
