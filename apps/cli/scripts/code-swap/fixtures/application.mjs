import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url)));
const held = [];
const hold = (mib) => held.push(Buffer.alloc(mib * 1024 * 1024, 0x5a));
if (process.env.QUAL_WORKER) {
  hold(config.workerMiB ?? 0);
  process.on('message', (m) => {
    if (m === 'grow') {
      setInterval(() => hold(16), 10);
    }
  });
  setInterval(() => {}, 1000);
} else {
  const workers = [];
  const worker = (detached = false) => {
    const child = spawn(process.execPath, [new URL(import.meta.url).pathname], {
      env: { ...process.env, QUAL_WORKER: '1' },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      detached
    });
    workers.push(child);
    return child;
  };
  if (config.stuckGrandchild) {
    const child = spawn('sh', ['-c', 'sleep 300 & echo $! > /tmp/qual-stuck-pid; kill -STOP $!; exit 0'], {
      stdio: 'ignore'
    });
    workers.push(child);
  }
  if (config.startupCrash) {
    if (config.stuckGrandchild) await new Promise((r) => setTimeout(r, 500));
    process.exit(17);
  }
  hold(config.initialMiB ?? 0);
  for (let i = 0; i < (config.workers ?? 0); i++) worker();
  if (config.lateForks) {
    let count = 0;
    const timer = setInterval(() => {
      worker();
      if (++count === 2) clearInterval(timer);
    }, 75);
  }
  if (config.detach) worker(true);
  if (config.doubleFork)
    spawn(
      process.execPath,
      [
        '-e',
        `const {spawn}=require('child_process');const c=spawn(process.execPath,[${JSON.stringify(new URL(import.meta.url).pathname)}],{detached:true,stdio:'ignore',env:{...process.env,QUAL_WORKER:'1'}});c.unref();process.exit(0)`
      ],
      { stdio: 'ignore' }
    );
  const server = http.createServer((req, res) => {
    if (req.url === '/inspect') {
      res.end(
        JSON.stringify({
          pid: process.pid,
          port: Number(process.env.PORT),
          score: Number(readFileSync('/proc/self/oom_score_adj')),
          workers: workers.map((c) => ({
            pid: c.pid,
            score: (() => {
              try {
                return Number(readFileSync(`/proc/${c.pid}/oom_score_adj`));
              } catch {
                return null;
              }
            })()
          }))
        })
      );
      return;
    }
    if (req.url === '/grow') {
      workers[0]?.send('grow');
      res.end('growing');
      return;
    }
    if (req.url === '/crash') {
      res.end('crashing');
      setTimeout(() => process.exit(19), 20);
      return;
    }
    if (req.url === '/short-child') {
      const child = spawn('sh', ['-c', 'exit 0']);
      child.once('exit', (code, signal) => res.end(JSON.stringify({ code, signal })));
      return;
    }
    if (req.url === '/nonzero-child') {
      const child = spawn('sh', ['-c', 'exit 17']);
      child.once('exit', (code, signal) => res.end(JSON.stringify({ code, signal })));
      return;
    }
    if (req.url === '/worker-kill') {
      workers[0]?.kill('SIGKILL');
      res.end('killed');
      return;
    }
    if (req.url === '/long') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.write('start:');
      setTimeout(() => res.end(config.revision), 1500);
      return;
    }
    if (req.url === '/hold') {
      // An endless ordinary stream: unlike an event stream, it delays a swap's completion until the drain deadline.
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.write(`${config.revision}\n`);
      const timer = setInterval(() => res.write('tick\n'), 100);
      req.on('close', () => clearInterval(timer));
      return;
    }
    if (req.url === '/sse') {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${config.revision}\n\n`);
      const timer = setInterval(() => res.write('data: tick\n\n'), 100);
      req.on('close', () => clearInterval(timer));
      return;
    }
    if (req.url === '/cache') {
      const b = Buffer.alloc(48 * 1024 * 1024, 3);
      writeFileSync('/tmp/qual-cache', b);
      readFileSync('/tmp/qual-cache');
      res.end('cached');
      return;
    }
    if (req.url === '/tmpfs') {
      writeFileSync('/dev/shm/qual-tmpfs', Buffer.alloc(24 * 1024 * 1024, 4));
      res.end('tmpfs');
      return;
    }
    if (req.url === '/burst') {
      hold(64);
      setTimeout(() => held.pop(), 50);
      res.end('burst');
      return;
    }
    if (req.method === 'POST') {
      let n = 0;
      req.on('data', (b) => (n += b.length));
      req.on('end', () =>
        res.end(JSON.stringify({ bytes: n, host: req.headers.host, forwarded: req.headers['x-forwarded-for'] }))
      );
      return;
    }
    res.statusCode = config.status ?? 200;
    res.end(config.revision);
  });
  server.on('upgrade', (req, socket) => {
    const accept = createHash('sha1')
      .update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' +
        accept +
        '\r\n\r\n'
    );
    const body = Buffer.from(config.revision);
    socket.write(Buffer.concat([Buffer.from([0x81, body.length]), body]));
    socket.on('data', () => {});
  });
  if (config.slowStartup) await new Promise((r) => setTimeout(r, 15000));
  server.listen(Number(process.env.PORT), '0.0.0.0');
  process.on('SIGTERM', () => {
    if (config.ignoreTerm) return;
    for (const c of workers) c.kill('SIGTERM');
    server.close(() => process.exit(0));
  });
}
