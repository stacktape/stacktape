import { Button } from '@stacktape/ui-react/button';
import { useState } from 'react';
import { BiCheck, BiCopy } from 'react-icons/bi';

/**
 * A command to paste into a terminal, with a copy button.
 *
 * Wraps between arguments, never inside one: a line ending in "--" reads as a broken flag.
 */
export function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // A browser that refuses clipboard access still shows the command to select by hand.
      }
    })();
  };

  return (
    <div className="w-command">
      <code>
        {command.split('\n').map((line, lineIndex) => (
          // oxlint-disable-next-line react/no-array-index-key -- lines of a fixed string.
          <span className="block" key={lineIndex}>
            {line.split(' ').map((argument, index) => (
              // oxlint-disable-next-line react/no-array-index-key -- arguments of a fixed string.
              <span key={index}>
                {index > 0 && ' '}
                <span className="w-command-arg">{argument}</span>
              </span>
            ))}
          </span>
        ))}
      </code>
      <Button
        aria-label={copied ? 'Copied' : `Copy ${command.split(' ').slice(0, 2).join(' ')}`}
        icon={copied ? <BiCheck size={14} /> : <BiCopy size={13} />}
        onClick={copy}
        variant="plain"
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
