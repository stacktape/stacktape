import { useState } from 'react';
import { Button } from '@stacktape/ui-react/button';

/** A command to run, with the button that saves retyping it. */
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
      <code>{command}</code>
      <Button onClick={copy} variant="secondary">
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
