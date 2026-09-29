import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../src/button/Button.tsx';
import { useConfigDocument } from '../../src/config-editor/document.ts';
import { Dialog } from '../../src/dialog/Dialog.tsx';
import '../../src/styles.css';

const INITIAL_SNAPSHOT = 'service: example\nreplicas: 1\n';

/** Synthetic host: it keeps the "saved" snapshot in memory and releases the acknowledgement only on request. */
function ConfigSaveHost() {
  const [saved, setSaved] = useState(INITIAL_SNAPSHOT);
  const [inFlight, setInFlight] = useState<string>();
  const document = useConfigDocument(saved);

  return (
    <section aria-labelledby="config-save-host-title">
      <h2 id="config-save-host-title">Config save host</h2>
      <label htmlFor="config-save-host-editor">Config content</label>
      <textarea
        id="config-save-host-editor"
        rows={4}
        cols={40}
        value={document.content}
        onChange={(event) => document.setContent(event.target.value)}
      />
      <Button
        variant="primary"
        disabled={inFlight !== undefined}
        onClick={() => {
          document.markPendingSave();
          setInFlight(document.contentRef.current);
        }}
      >
        Save config
      </Button>
      <Button
        variant="secondary"
        disabled={inFlight === undefined}
        onClick={() => {
          if (inFlight === undefined) return;
          setSaved(inFlight);
          setInFlight(undefined);
        }}
      >
        Acknowledge save
      </Button>
      <output aria-label="Host saved snapshot">{saved}</output>
      <output aria-label="Save state">{inFlight === undefined ? 'idle' : 'save in flight'}</output>
    </section>
  );
}

function Gallery() {
  const [open, setOpen] = useState(false);
  const [protectedOpen, setProtectedOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);
  const [unavailableCount, setUnavailableCount] = useState(0);

  return (
    <main>
      <h1>Shared UI gallery</h1>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open example dialog
      </Button>
      <Button variant="secondary" onClick={() => setProtectedOpen(true)}>
        Open protected dialog
      </Button>
      <ConfigSaveHost />
      <output aria-label="Close callback count">{closeCount}</output>
      <output aria-label="Unavailable action count">{unavailableCount}</output>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        onClose={() => setCloseCount((count) => count + 1)}
        title="Example dialog"
        actions={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <p>This dialog uses the shared component and stylesheet with synthetic content.</p>
        <label htmlFor="example-name">Example name</label>
        <input id="example-name" defaultValue="Example project" />
        <Button variant="primary" disabled onClick={() => setUnavailableCount((count) => count + 1)}>
          Unavailable action
        </Button>
      </Dialog>
      <Dialog open={protectedOpen} onOpenChange={setProtectedOpen} title="Protected dialog" closeOnOverlayClick={false}>
        <p>Clicking outside this dialog leaves it open.</p>
      </Dialog>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('The gallery root is missing.');
createRoot(root).render(<Gallery />);
