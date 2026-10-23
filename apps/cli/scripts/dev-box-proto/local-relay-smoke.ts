/** Runs the dev box relay locally (tunnels on 127.0.0.1) and pushes bytes through it with the CLI's bore client. */
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEV_BOX_RELAY_SOURCE } from '../../src/commands/dev/dev-box/relay-source';
import { startTunnel, useTunnelServer } from '../../src/commands/dev/tunnel-manager';

const dir = mkdtempSync(join(tmpdir(), 'devbox-relay-'));
writeFileSync(join(dir, 'relay.py'), DEV_BOX_RELAY_SOURCE);
const relay = spawn('python3', ['-I', join(dir, 'relay.py'), '127.0.0.2'], { stdio: 'inherit', env: { ...process.env, STACKTAPE_DEVBOX_STATE_FILE: join(dir, 'state.json') } });
await new Promise((r) => setTimeout(r, 2500));

const echo = createServer((s) => s.pipe(s)).listen(0, '127.0.0.1');
await new Promise((r) => echo.once('listening', r));
const echoPort = (echo.address() as { port: number }).port;

useTunnelServer({ controlHost: '127.0.0.1', controlPort: 7835, publicHost: '127.0.0.2' });
const tunnel = await startTunnel('echo', echoPort);
console.log('tunnel', tunnel.publicHost, tunnel.publicPort, 'requested', echoPort);

const payload = Buffer.alloc(5 * 1024 * 1024, 7);
for (let i = 0; i < 3; i++) {
  const t = performance.now();
  const received = await new Promise<number>((resolve, reject) => {
    const s = connect(tunnel.publicPort, '127.0.0.2');
    let n = 0;
    s.on('data', (d) => {
      n += d.length;
      if (n >= payload.length) { s.end(); resolve(n); }
    });
    s.on('error', reject);
    s.write(payload);
  });
  console.log('round', i, received, `${(performance.now() - t).toFixed(1)} ms`);
}
tunnel.process.kill();
relay.kill();
echo.close();
process.exit(0);
