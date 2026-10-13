import { useState } from 'react';
import { Button } from '@stacktape/ui-react/button';

/** A command to run (one per line), with the button that saves retyping it. */
export function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // A refused clipboard is not worth an error state: the command is on screen to be selected.
      }
    })();
  };

  return (
    <div className="wizard-command">
      <code>
        {/* Wraps between arguments, never inside one: a line ending in "--" reads as a broken flag. */}
        {command.split('\n').map((line, lineIndex) => (
          // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
          <span className="block" key={lineIndex}>
            {line.split(' ').map((token, tokenIndex) => (
              // oxlint-disable-next-line react/no-array-index-key -- positions in a fixed string.
              <span key={tokenIndex}>
                {tokenIndex > 0 && ' '}
                <span className="whitespace-nowrap">{token}</span>
              </span>
            ))}
          </span>
        ))}
      </code>
      <Button onClick={copy} variant="secondary">
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
