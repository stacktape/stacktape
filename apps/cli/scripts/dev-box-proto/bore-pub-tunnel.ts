/** bun bore-pub-tunnel.ts <localPort> — today's public bore.pub tunnel through the CLI's own client; prints host:port. */
import { writeFileSync } from 'node:fs';
import { startTunnel } from '../../src/commands/dev/tunnel-manager';
const tunnel = await startTunnel('db', Number(process.argv[2]));
console.log(`${tunnel.publicHost}:${tunnel.publicPort}`);
if (process.argv[3]) writeFileSync(process.argv[3], `${tunnel.publicHost}:${tunnel.publicPort}`);
tunnel.process.on('exit', (code) => console.log('tunnel exited', code));
setInterval(() => {}, 1 << 30);
