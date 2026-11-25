import { Button } from '@stacktape/ui-react/button';
import { detectInstallPlatform } from '@stacktape/ui-react/install-platform';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useEffect, useId, useRef, useState } from 'react';
import './command-box.css';
import './controls.css';
import { COMMAND_HINT, COMMANDS } from './install-commands';

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

type Props = {
  label?: string;
  hint?: boolean;
  id?: string;
  appearance?: 'brand' | 'readme';
  /** Preselect the visitor's installer when their platform is detected. Off keeps `npx` selected. */
  preselect?: boolean;
};

/**
 * The first line is the command Copy puts on the clipboard. For standalone installs,
 * the second line shows what to run once the installer has finished.
 */
export function CommandBox({ label = 'Install', hint = true, id, appearance = 'brand', preselect = true }: Props) {
  const branded = appearance === 'brand';
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
    if (!preselect) return;
    let cancelled = false;
    const select = async () => {
      const platform = await detectInstallPlatform();
      if (cancelled || chosen.current || !platform) return;
      setCurrent(platform.os);
      setArches((previous) => ({ ...previous, [platform.os]: platform.arch }));
    };
    void select();
    return () => {
      cancelled = true;
    };
  }, [preselect]);

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
    <div
      className={`install-code install-code--${state}${hint ? ' install-code--hint' : ''}${branded ? ' brand-command' : ''}`}
      id={id}
    >
      <div className="install-code__head">
        <Tabs
          appearance="underline"
          ariaLabel={`${label}: install method`}
          className="install-code__tabs"
          onValueChange={switchTo}
          size="small"
          tabs={TABS.map((tab) => ({ value: tab.value, label: tab.label, panelId }))}
          value={current}
          width="fit"
        />
        {entry.variants.length > 1 ? (
          <Tabs
            appearance={branded ? 'underline' : 'segmented'}
            ariaLabel={`${entry.label}: CPU architecture`}
            className="install-code__arch"
            onValueChange={switchArch}
            size="small"
            tabs={entry.variants.map((candidate) => ({
              value: candidate.arch,
              label: candidate.label,
              compactLabel: 'compactLabel' in candidate ? candidate.compactLabel : undefined,
              panelId
            }))}
            value={variant.arch}
            width="fit"
          />
        ) : null}
        <Button
          aria-label={`Copy: ${command}`}
          className={branded ? 'install-code__copy brand-button' : 'install-code__copy'}
          onClick={copy}
          variant="primary"
        >
          <span className="install-code__labels" aria-hidden="true">
            <span className="install-code__label install-code__label--copy">
              <CopyIcon />
              Copy
            </span>
            <span className="install-code__label install-code__label--copied">
              <CheckIcon />
              Copied
            </span>
            <span className="install-code__label install-code__label--failed">Select and copy</span>
          </span>
        </Button>
      </div>

      <pre
        className={overflows ? 'install-code__pre install-code__pre--overflow' : 'install-code__pre'}
        id={panelId}
        ref={preRef}
        role="tabpanel"
        aria-label={`${entry.label} commands`}
        tabIndex={branded ? 0 : undefined}
      >
        {variant.lines.map((line) => (
          <span className="install-code__line" key={line}>
            <span aria-hidden="true" className="install-code__prompt">
              $
            </span>
            <code className="install-code__cmd" data-cmd>
              {line}
            </code>
          </span>
        ))}
        {hint ? (
          <span className="install-code__line install-code__line--comment">
            <span aria-hidden="true" className="install-code__prompt">
              #
            </span>
            <code className="install-code__comment">{COMMAND_HINT}</code>
          </span>
        ) : null}
      </pre>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
