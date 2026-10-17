import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../src/button/Button.tsx';
import { Dialog } from '../../src/dialog/Dialog.tsx';
import { Select } from '../../src/select/Select.tsx';
import { Switch } from '../../src/switch/Switch.tsx';
import { TextField } from '../../src/text-field/TextField.tsx';
import '../../src/styles.css';
// Loaded after the shared stylesheet on purpose: the layer order must not depend on load order.
import './host-reset.css';

function Gallery() {
  const [open, setOpen] = useState(false);
  const [protectedOpen, setProtectedOpen] = useState(false);
  const [closeCount, setCloseCount] = useState(0);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [tallOpen, setTallOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  return (
    <main>
      <h1>Shared UI gallery</h1>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open example dialog
      </Button>
      <Button variant="secondary" onClick={() => setProtectedOpen(true)}>
        Open protected dialog
      </Button>
      <Button variant="secondary" onClick={() => setTallOpen(true)}>
        Open tall dialog
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
      <section aria-label="Control row" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: 16 }}>
        <TextField label="Search" placeholder="Name" reserveMessageSpace={false} />
        <Select
          label="Region"
          name="region"
          options={[{ label: 'eu-west-1', value: 'eu-west-1' }]}
          reserveMessageSpace={false}
          value={{ label: 'eu-west-1', value: 'eu-west-1' }}
          width={200}
        />
        <Button variant="secondary">Apply</Button>
        <Switch checked={enabled} label="Scanning" onCheckedChange={setEnabled} />
      </section>
      <Dialog
        open={tallOpen}
        onOpenChange={setTallOpen}
        title="Tall dialog"
        actions={
          <Button variant="primary" onClick={() => setTallOpen(false)}>
            Save
          </Button>
        }
      >
        {Array.from({ length: 30 }, (_, index) => (
          <p key={index}>Line {index + 1} of a form taller than the window.</p>
        ))}
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
