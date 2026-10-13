import { Button } from '@stacktape/ui-react/button';
import { detectInstallPlatform } from '@stacktape/ui-react/install-platform';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useEffect, useId, useRef, useState } from 'react';
import { COMMAND_HINT, COMMANDS } from './data';

type CommandId = (typeof COMMANDS)[number]['id'];
type Arch = (typeof COMMANDS)[number]['variants'][number]['arch'];
type CopyState = 'idle' | 'copied' | 'failed';

const TABS = COMMANDS.map((command) => ({ value: command.id, label: command.label }));

/** Each tab's selected architecture: the first variant until the visitor's machine is detected or they choose. */
const INITIAL_ARCHES = Object.fromEntries(COMMANDS.map((command) => [command.id, command.variants[0].arch])) as Record<
  CommandId,
  Arch
>;

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
 * The npx tab is one command. The install tabs are two: the installer, then `stacktape init`, the
 * next command after installing. Copy takes the first line only — the second is what to run once
 * the installer has finished, and pasting both would run it against a CLI that is not there yet.
 *
 * Each operating system tab has one installer per CPU architecture, chosen with the small toggle
 * beside Copy. After hydration the block opens on the visitor's operating system and architecture
 * (`detectInstallPlatform`); on a phone or an unknown system it stays on npx. A choice the visitor
 * made before detection finished is kept.
 *
 * Server-rendered so it reads before hydration. The button keeps one width across "Copy", "Copied"
 * and "Select and copy": the three labels share a grid cell. The block never changes height when a
 * tab switches: the pre has room for the tallest tab, and a long command scrolls inside its row.
 */
export function CodeBlock({ label = 'Install', hint = true, id }: { label?: string; hint?: boolean; id?: string }) {
  const [current, setCurrent] = useState<CommandId>('npx');
  const [arches, setArches] = useState(INITIAL_ARCHES);
  const [state, setState] = useState<CopyState>('idle');
  const [status, setStatus] = useState('');
  const [overflows, setOverflows] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const preRef = useRef<HTMLPreElement>(null);
  const chosen = useRef(false);
  const uid = useId();
  const entry = COMMANDS.find((candidate) => candidate.id === current) ?? COMMANDS[0];
  const variant = entry.variants.find((candidate) => candidate.arch === arches[entry.id]) ?? entry.variants[0];
  /** What the tab shows, and what Copy puts on the clipboard. */
  const text = variant.lines.join('\n');
  const command = variant.lines[0];

  useEffect(() => {
    let cancelled = false;
    const preselect = async () => {
      const platform = await detectInstallPlatform();
      if (cancelled || chosen.current || !platform) return;
      setCurrent(platform.os);
      setArches((previous) => ({ ...previous, [platform.os]: platform.arch }));
    };
    void preselect();
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** The fallback when the clipboard is unavailable: select what Copy would have taken. */
  const selectCommand = () => {
    const node = preRef.current?.querySelector('[data-cmd]');
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      settle('copied', 'Copied to clipboard', 1600);
    } catch {
      selectCommand();
      settle('failed', 'Clipboard unavailable. The command is selected: press Ctrl+C or Cmd+C.', 5000);
    }
  };

  const resetCopy = () => {
    setState('idle');
    setStatus('');
    window.clearTimeout(timer.current);
  };

  const switchTo = (value: CommandId) => {
    chosen.current = true;
    setCurrent(value);
    resetCopy();
  };

  const switchArch = (value: Arch) => {
    chosen.current = true;
    setArches((previous) => ({ ...previous, [entry.id]: value }));
    resetCopy();
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
        {entry.variants.length > 1 ? (
          <Tabs
            appearance="segmented"
            ariaLabel={`${entry.label}: CPU architecture`}
            className="rm-code__arch"
            onValueChange={switchArch}
            size="small"
            tabs={entry.variants.map((candidate) => ({ value: candidate.arch, label: candidate.label, panelId }))}
            value={variant.arch}
            width="fit"
          />
        ) : null}
        <Button aria-label={`Copy: ${command}`} className="rm-code__copy" onClick={copy} variant="primary">
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
        {variant.lines.map((line) => (
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
