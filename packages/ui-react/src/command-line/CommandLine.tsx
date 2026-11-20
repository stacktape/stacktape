import type { CSSProperties, ReactNode } from 'react';
import { CopyIconButton } from '../copy-button/CopyButton.js';

export type CommandShell = 'unix' | 'powershell';

/** Horizontal room a line needs besides its characters: the left padding, and the copy button with its gap and inset. */
const PADDING_LEFT = 14;
const COPY_BUTTON_ROOM = 48;

/**
 * Splits one line of a command into the boxes it may wrap between. A flag and its value form one box, so a long command
 * wraps between options and never inside one. A single argument wider than the line still breaks.
 */
export const wrapGroups = (line: string): string[][] => {
  const words = line.split(' ');
  const groups: string[][] = [];
  words.forEach((word, index) => {
    const previous = words[index - 1];
    // `--file=a.sql` already holds its value, so the word after it is an argument of its own.
    if (index > 1 && previous?.startsWith('-') && !previous.includes('=') && !word.startsWith('-')) {
      groups.at(-1)!.push(word);
    } else {
      groups.push([word]);
    }
  });
  return groups;
};

const promptOf = (shell: CommandShell) => (shell === 'powershell' ? 'PS>' : '$');

/**
 * A command a developer runs in a terminal, with a copy button. It sits on the code plane: a `$` prompt (`PS>` for
 * PowerShell), the program in the accent colour and flags muted, and a copy icon in the corner that turns into a check
 * mark once the command is on the clipboard. Each line of a multi-line command gets its own prompt; the button copies
 * them all. It is as wide as its longest line, never wider than its column, and wraps between options, never inside one.
 * `header` is a strip above the command, such as tabs for the ways to run it.
 */
export function CommandLine({
  command,
  shell = 'unix',
  label = 'Copy command',
  header,
  minWidthCh,
  reserve,
  output,
  tabPanelId,
  fill = false,
  className,
  style,
  onCopyFailure
}: {
  command: string;
  shell?: CommandShell;
  /** The copy button's accessible name. */
  label?: string;
  header?: ReactNode;
  /** When `header` holds tabs, the id of the panel they control: the command. */
  tabPanelId?: string;
  /** Keeps the box at least this many characters wide, so switching between commands does not resize it. */
  minWidthCh?: number;
  /**
   * Other commands the box may switch to, whose height it keeps: the tallest of them sets the box's height, so switching
   * moves nothing below it. A shorter command starts at the top, as in a terminal.
   */
  reserve?: Array<{ command: string; shell?: CommandShell }>;
  /**
   * What the command prints, under it as a terminal shows it, where the box is a picture of running the command. It is
   * muted, cannot be selected, is not copied and is not read out: the text beside the box says what the command does.
   */
  output?: string[];
  /** As wide as its column rather than as its longest line, for a box that lines up with fields above and below it. */
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
  /** The browser refused the clipboard: the host can say how to copy by hand. */
  onCopyFailure?: (message: string) => void;
}) {
  const lines = command.split('\n');
  // The prompt and the space after it, and one character of slack: rounding must not wrap a line that fits.
  const longest = Math.max(minWidthCh ?? 0, ...lines.map((line) => line.length + promptOf(shell).length + 2));
  return (
    <div
      className={['stp-ui-command-line', fill ? 'stp-ui-command-line--fill' : undefined, className]
        .filter(Boolean)
        .join(' ')}
      data-has-header={header === undefined ? undefined : true}
      style={style}
    >
      {header !== undefined && <div className="stp-ui-command-line__header">{header}</div>}
      <div
        className="stp-ui-command-line__body"
        style={fill ? undefined : { width: `calc(${longest}ch + ${PADDING_LEFT + COPY_BUTTON_ROOM}px)` }}
        {...(tabPanelId === undefined ? {} : { id: tabPanelId, role: 'tabpanel' })}
      >
        {reserve === undefined ? (
          <CommandSession command={command} output={output} shell={shell} />
        ) : (
          // Every command the box may show, in one cell: the tallest sets its height and only this one is visible.
          <div className="stp-ui-command-line__stack">
            <CommandSession command={command} output={output} shell={shell} />
            {reserve.map((other) => (
              <CommandSession
                command={other.command}
                hidden
                key={other.command}
                output={output}
                shell={other.shell ?? 'unix'}
              />
            ))}
          </div>
        )}
        <CopyIconButton
          className="stp-ui-command-line__copy"
          label={label}
          value={command}
          {...(onCopyFailure === undefined ? {} : { onFailure: onCopyFailure })}
        />
      </div>
    </div>
  );
}

/**
 * A command and, when the box shows them, the lines it prints right under it. A hidden one only holds its height, so the
 * output follows the command it belongs to and the room a longer command would need stays under it.
 */
function CommandSession({
  command,
  shell,
  output,
  hidden
}: {
  command: string;
  shell: CommandShell;
  output?: string[] | undefined;
  hidden?: boolean;
}) {
  if (output === undefined) return <CommandText command={command} hidden={hidden} shell={shell} />;
  return (
    <div className="stp-ui-command-line__session" data-hidden={hidden || undefined}>
      <CommandText command={command} hidden={hidden} shell={shell} />
      <div aria-hidden className="stp-ui-command-line__output" data-command-output>
        {output.map((line) => {
          const [before, address] = line.split(/(?=https?:\/\/)/);
          return (
            <p key={line}>
              {hidden ? (
                <span className="stp-ui-command-line__ghost" data-text={line} />
              ) : (
                <>
                  {before}
                  {/* An address stands out, as a terminal shows a link. */}
                  {address !== undefined && <span className="stp-ui-command-line__address">{address}</span>}
                </>
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The lines of a command, each with its prompt. A hidden one only holds its height (see `reserve`): it draws its words
 * through CSS, so they wrap exactly as the shown command would, but none of them is text on the page that a search, a
 * screen reader or a selection could find.
 */
export function CommandText({
  command,
  shell = 'unix',
  hidden,
  className
}: {
  command: string;
  shell?: CommandShell;
  hidden?: boolean | undefined;
  className?: string;
}) {
  const text = (value: string) => (hidden ? <span className="stp-ui-command-line__ghost" data-text={value} /> : value);
  return (
    <div
      aria-hidden={hidden || undefined}
      className={['stp-ui-command-line__text', className].filter(Boolean).join(' ')}
      data-hidden={hidden || undefined}
    >
      {command
        .split('\n')
        .map(wrapGroups)
        .map((groups, lineIndex) => (
          // A flex row, so a wrapped command continues under its first argument, not under the prompt.
          // oxlint-disable-next-line react/no-array-index-key -- the lines of a command never change order.
          <p className="stp-ui-command-line__line" key={lineIndex}>
            <span aria-hidden className="stp-ui-command-line__prompt">
              {text(promptOf(shell))}
            </span>
            <span className="stp-ui-command-line__words">
              {groups.map((group, groupIndex) => (
                // One unbreakable box per flag and its value.
                // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed command.
                <span className="stp-ui-command-line__group" key={groupIndex}>
                  {group.map((word, wordIndex) => (
                    <span
                      className={
                        groupIndex === 0
                          ? 'stp-ui-command-line__program'
                          : word.startsWith('-')
                            ? 'stp-ui-command-line__flag'
                            : undefined
                      }
                      // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed command.
                      key={wordIndex}
                    >
                      {text(`${word}${wordIndex < group.length - 1 ? ' ' : ''}`)}
                    </span>
                  ))}
                  {groupIndex < groups.length - 1 ? text(' ') : ''}
                </span>
              ))}
            </span>
          </p>
        ))}
    </div>
  );
}
