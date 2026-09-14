import type { KeyboardEvent } from 'react';
import { useId, useRef, useState } from 'react';
import { INSTALL_COMMANDS } from './data';

type CommandId = (typeof INSTALL_COMMANDS)[number]['id'];

/** The primary call to action: one command, a filled Copy button, and a quiet switcher for the other install paths. */
export function CommandBox() {
  const [current, setCurrent] = useState<CommandId>('npx');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const codeRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const entry = INSTALL_COMMANDS.find((candidate) => candidate.id === current) ?? INSTALL_COMMANDS[0];

  const announce = (message: string, ok: boolean, ms: number) => {
    setCopied(ok);
    setStatus(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopied(false);
      setStatus('');
    }, ms);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.command);
      announce('Copied to clipboard', true, 2200);
    } catch {
      // No clipboard access: select the command so a manual copy is one keystroke away.
      const node = codeRef.current;
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      announce('Clipboard unavailable. The command is selected — press Ctrl+C or Cmd+C.', false, 6000);
    }
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + INSTALL_COMMANDS.length) % INSTALL_COMMANDS.length;
    setCurrent(INSTALL_COMMANDS[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="pl-cmd">
      <div className="pl-cmd__switch-row">
        <span className="pl-cmd__switch-lead">Install with</span>
        <div aria-label="Install method" className="pl-cmd__switch" role="tablist">
          {INSTALL_COMMANDS.map((command, index) => (
            <button
              aria-controls={`${id}-panel`}
              aria-selected={command.id === current}
              className="pl-cmd__os"
              key={command.id}
              onClick={() => setCurrent(command.id)}
              onKeyDown={(event) => onTabKey(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={command.id === current ? 0 : -1}
              type="button"
            >
              {command.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pl-cmd__row" id={`${id}-panel`} role="tabpanel">
        <span aria-hidden="true" className="pl-cmd__prompt">
          $
        </span>
        <code className="pl-cmd__text" ref={codeRef}>
          {entry.command}
        </code>
        <button
          aria-label={`Copy command: ${entry.command}`}
          className={
            copied ? 'pl-btn pl-btn--primary pl-cmd__copy pl-cmd__copy--done' : 'pl-btn pl-btn--primary pl-cmd__copy'
          }
          onClick={copy}
          type="button"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p aria-live="polite" className="pl-cmd__status">
        {status}
      </p>
    </div>
  );
}
