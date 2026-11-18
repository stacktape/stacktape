import { useState } from 'react';

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
      <code>{command}</code>
      <button onClick={copy} type="button">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
