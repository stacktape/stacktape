import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../src/button/Button.tsx';
import { Dialog } from '../../src/dialog/Dialog.tsx';
import '../../src/styles.css';

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
