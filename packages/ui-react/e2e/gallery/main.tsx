import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../src/button/Button.tsx';
import { Dialog } from '../../src/dialog/Dialog.tsx';
import '../../src/styles.css';

function Gallery() {
  const [open, setOpen] = useState(false);

  return (
    <main>
      <h1>Shared UI gallery</h1>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open example dialog
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
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
        <Button variant="primary" disabled>
          Unavailable action
        </Button>
      </Dialog>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('The gallery root is missing.');
createRoot(root).render(<Gallery />);
