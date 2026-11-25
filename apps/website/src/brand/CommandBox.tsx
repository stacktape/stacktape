import { Button } from '@stacktape/ui-react/button';
import { detectInstallPlatform } from '@stacktape/ui-react/install-platform';
import { Tabs } from '@stacktape/ui-react/tabs';
import { MorphIcon } from 'morphicons/react';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import './command-box.css';
import './controls.css';
import { COPY_ICON, copyCommand } from './copy-command';
import { COMMAND_HINT, COMMANDS } from './install-commands';

type CommandId = (typeof COMMANDS)[number]['id'];
type CopyState = keyof typeof COPY_ICON;
/** Which ends of a command too long for its field have more text past them. */
type More = 'none' | 'start' | 'end' | 'both';

/**
 * The command as the eye reads it, like the Console's new project page: the prompt and the runner quiet, `stacktape`
 * and what it does bright, flags muted. An installer line has no `stacktape` word, so it is bright from `init` on. The
 * command stays on one line: when it is longer than the field, the words scroll sideways behind the fixed prompt, and the
 * end with more text past it fades out.
 */
function CommandWords({ command, powershell }: { command: string; powershell: boolean }) {
  const [more, setMore] = useState<More>('none');
  const textRef = useRef<HTMLSpanElement>(null);
  const words = command.split(' ').map((text, at) => ({ text, at }));
  const program = words.find(({ text }) => text.startsWith('stacktape'));
  const main = (program ?? words.find(({ text }) => text.replace(/"$/, '') === 'init'))?.at ?? -1;

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    node.scrollLeft = 0;
    const measure = () => {
      const start = node.scrollLeft > 1;
      const end = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      setMore(start && end ? 'both' : start ? 'start' : end ? 'end' : 'none');
    };
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    return () => {
      node.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [command]);

  return (
    <code className={`brand-command__words${command.length > 40 ? ' brand-command__words--long' : ''}`}>
      <span aria-hidden="true" className="brand-command__prompt">
        {powershell ? 'PS>' : '$'}
      </span>
      <span className="brand-command__text" data-cmd data-more={more} ref={textRef}>
        {words.map((word) => (
          <Fragment key={word.at}>
            {word.at > 0 && ' '}
            <span
              className={
                word.at === main || (main >= 0 && word.at > main && !word.text.startsWith('-'))
                  ? 'brand-command__word--bright'
                  : 'brand-command__word'
              }
            >
              {word.text}
            </span>
          </Fragment>
        ))}
      </span>
    </code>
  );
}

type Props = {
  label?: string;
  /**
   * The Console's sentence on where to run the command and what it opens, under the field. Off by default: the owner
   * asked for no instruction line under the command on the Console's page.
   */
  hint?: boolean;
  id?: string;
  /** Preselect the visitor's installer when their platform is detected. Off keeps npm selected. */
  preselect?: boolean;
};

/**
 * The install command, as the Console's "Run the setup wizard" card shows it: the ways to run the CLI as small tape
 * tabs above a large, quiet command field with a labelled Copy button. Each tab shows one command, the one Copy puts on
 * the clipboard.
 */
export function CommandBox({ label = 'Install', hint = false, id, preselect = true }: Props) {
  const [current, setCurrent] = useState<CommandId>('npx');
  const [state, setState] = useState<CopyState>('idle');
  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const fieldRef = useRef<HTMLDivElement>(null);
  const chosen = useRef(false);
  const uid = useId();
  const entry = COMMANDS.find((candidate) => candidate.id === current) ?? COMMANDS[0];
  const command = entry.command;

  useEffect(() => {
    if (!preselect) return;
    let cancelled = false;
    const select = async () => {
      const platform = await detectInstallPlatform();
      if (cancelled || chosen.current || !platform) return;
      setCurrent(platform.os);
    };
    void select();
    return () => {
      cancelled = true;
    };
  }, [preselect]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const {
      state: next,
      message,
      duration
    } = await copyCommand(command, fieldRef.current?.querySelector('[data-cmd]'));
    setState(next);
    setStatus(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setState('idle');
      setStatus('');
    }, duration);
  };

  const switchTo = (value: CommandId) => {
    chosen.current = true;
    setCurrent(value);
    setState('idle');
    setStatus('');
    window.clearTimeout(timer.current);
  };

  const panelId = `${uid}-panel`;

  return (
    <div className={`brand-command brand-command--${state}`} id={id}>
      <Tabs
        appearance="segmented"
        ariaLabel={`${label}: how to run the Stacktape CLI`}
        className="brand-tabs brand-command__tabs"
        onValueChange={switchTo}
        size="small"
        // The operating systems form an unnamed group after a divider: their installers need no Node.js.
        tabs={COMMANDS.map((tab) => ({
          value: tab.id,
          label: tab.label,
          panelId,
          group: 'installer' in tab ? '' : undefined
        }))}
        value={current}
        width="fit"
      />
      <div
        aria-label={`${entry.label} command`}
        className="brand-command__field"
        id={panelId}
        ref={fieldRef}
        role="tabpanel"
      >
        <CommandWords command={command} powershell={entry.id === 'windows'} />
        <Button
          aria-label={`Copy: ${command}`}
          className="brand-button brand-command__copy"
          icon={
            <span className="brand-command__icon" data-copy-state={state}>
              <MorphIcon icon={COPY_ICON[state]} reducedMotion="user" size={16} />
            </span>
          }
          onClick={copy}
          variant="primary"
        >
          {/* Both labels share one cell, so the button keeps its width when "Copy" becomes "Copied". */}
          <span aria-hidden="true" className="brand-command__labels">
            <span className={state === 'copied' ? 'brand-command__label--hidden' : undefined}>Copy</span>
            <span className={state === 'copied' ? undefined : 'brand-command__label--hidden'}>Copied</span>
          </span>
        </Button>
      </div>
      {hint ? <p className="brand-command__hint">{COMMAND_HINT}</p> : null}
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
