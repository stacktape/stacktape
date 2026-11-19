import { Button } from '@stacktape/ui-react/button';
import { useState, type ReactNode } from 'react';
import { BiCheck, BiCopy } from 'react-icons/bi';

/** The command as text, each argument kept whole: the code element holds the full text, a line break per line. */
const commandParts = (command: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  for (const [lineIndex, line] of command.split('\n').entries()) {
    if (lineIndex > 0) parts.push(<br key={`break-${lineIndex}`} />);
    for (const [index, argument] of line.split(' ').entries()) {
      if (index > 0) parts.push(' ');
      parts.push(
        <span className="w-command-arg" key={`${lineIndex}-${index}`}>
          {argument}
        </span>
      );
    }
  }
  return parts;
};

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
      <code>{commandParts(command)}</code>
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
