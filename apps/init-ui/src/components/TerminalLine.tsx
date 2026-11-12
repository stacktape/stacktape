import { Fragment, useEffect, useRef, useState } from 'react';
import { MorphIcon } from 'morphicons/react';
import { IconButton } from '@stacktape/ui-react/icon-button';

type CopyState = 'idle' | 'copied' | 'failed';

// The Console's copy icon and its two outcomes, as stroked paths so one morphs cleanly into the next.
const ICON_PATH: Record<CopyState, string> = {
  idle: 'M4 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM9 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-5',
  copied: 'M5.5 12.5l4.5 4.5 9-9',
  failed: 'M7 7l10 10M17 7 7 17'
};

/** How long the check mark (or the cross) stays before the copy icon comes back. */
const FEEDBACK_MS = 1500;

/**
 * Splits a command line into the groups it may wrap between: a flag stays with its value, so a long command never
 * leaves "--region" at the end of one line and "eu-west-1" at the start of the next.
 */
export const commandGroups = (line: string): string[][] => {
  const groups: string[][] = [];
  const words = line.split(' ');
  words.forEach((word, index) => {
    const previous = words[index - 1];
    if (index > 1 && previous?.startsWith('-') && !word.startsWith('-')) groups.at(-1)!.push(word);
    else groups.push([word]);
  });
  return groups;
};

/**
 * A command to run, one per line, drawn as the Console draws one: a muted prompt, the program in the accent colour,
 * flags in grey, and an icon button that copies every line and turns into a check mark when it has.
 */
export function TerminalLine({ command }: { command: string }) {
  const [state, setState] = useState<CopyState>('idle');
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reset.current), []);

  const copy = async () => {
    clearTimeout(reset.current);
    let copied = true;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // A refused clipboard leaves the command on screen to select; the cross says the copy did not happen.
      copied = false;
    }
    setState(copied ? 'copied' : 'failed');
    reset.current = setTimeout(() => setState('idle'), FEEDBACK_MS);
  };

  return (
    <div className="wizard-command">
      <code>
        {command.split('\n').map((line, lineIndex) => (
          // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
          <span className="wizard-command-line" key={lineIndex}>
            <span aria-hidden className="wizard-command-prompt">
              &gt;
            </span>
            <span>
              {commandGroups(line).map((group, groupIndex) => (
                // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
                <Fragment key={groupIndex}>
                  {groupIndex > 0 && ' '}
                  <span className="wizard-command-group">
                    {group.map((word, wordIndex) => (
                      <span
                        className={
                          groupIndex === 0
                            ? 'wizard-command-program'
                            : word.startsWith('-')
                              ? 'wizard-command-flag'
                              : ''
                        }
                        // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
                        key={wordIndex}
                      >
                        {wordIndex > 0 ? ' ' : ''}
                        {word}
                      </span>
                    ))}
                  </span>
                </Fragment>
              ))}
            </span>
          </span>
        ))}
      </code>
      <IconButton
        className="wizard-command-copy"
        data-copy-state={state}
        icon={<MorphIcon icon={ICON_PATH[state]} reducedMotion="user" size={16} />}
        label={command.includes('\n') ? 'Copy commands' : 'Copy command'}
        onClick={() => void copy()}
        variant="plain"
      />
      <output className="sr-only">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : ''}</output>
    </div>
  );
}
