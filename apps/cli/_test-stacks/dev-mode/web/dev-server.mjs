// A stand-in for a framework dev server such as Vite: it serves the current page on PORT and, like package managers
// and Turbo, starts a watcher in its own process group. Dev mode must stop both.
import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const port = Number(process.env.PORT);
const recordPid = (role, pid) => {
  if (process.env.STP_DEV_FIXTURE_PID_FILE) {
    appendFileSync(process.env.STP_DEV_FIXTURE_PID_FILE, `${JSON.stringify({ role, pid, port })}\n`);
  }
};

const watcher = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);'], {
  detached: true,
  stdio: 'ignore'
});
watcher.unref();
recordPid('dev-server', process.pid);
recordPid('watcher', watcher.pid);

createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end(readFileSync(new URL('./index.html', import.meta.url)));
}).listen(port, process.env.HOST || '127.0.0.1', () => {
  console.info(`web listening on http://localhost:${port}`);
});
