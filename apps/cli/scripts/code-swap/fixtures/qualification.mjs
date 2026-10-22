// Runs inside the exact capped Node image on Docker and Fargate. All durations use that host's monotonic clock.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { request, createServer } from 'node:http';
import { connect } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
const root = '/tmp/qualification',
  port = 18080,
  url = `http://127.0.0.1:${port}`;
const scenario = process.env.QUAL_SCENARIO ?? 'normal';
const results = [];
let supervisor;
let logs = '';
let report = { state: 'running', results };
const output = () => console.log(JSON.stringify({ qualification: report }));
const wait = async (fn, timeout = 35000) => {
  const start = performance.now();
  let last;
  while (performance.now() - start < timeout) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      last = String(e);
    }
    await sleep(20);
  }
  throw Error('Wait timed out: ' + last);
};
const status = async () => JSON.parse(await readFile(`${root}/status#node#local.json`, 'utf8'));
const get = async (path = '/') => {
  const r = await fetch(url + path, { signal: AbortSignal.timeout(3000) });
  return { status: r.status, body: await r.text(), revision: r.headers.get('x-lab-revision') };
};
const inspect = async () => JSON.parse((await get('/inspect')).body);
const signalRecord = async (revision, phase) => {
  const bytes = await readFile(`/qualification/bundles/${revision}.tgz`);
  const r = {
    Revision: revision,
    Key: `/qualification/bundles/${revision}.tgz`,
    Sha256: createHash('sha256').update(bytes).digest('hex'),
    Size: bytes.length,
    Phase: phase
  };
  await writeFile(`${root}/release.tmp`, JSON.stringify(r));
  await import('node:fs/promises').then((fs) => fs.rename(`${root}/release.tmp`, `${root}/release.json`));
};
const start = async (baseline = 'old', grace = 2) => {
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  await cp(`/qualification/apps/${baseline}`, `${root}/baseline`, { recursive: true });
  supervisor = spawn('/stacktape-supervisor', [], {
    env: {
      ...process.env,
      STP_BENCH_LOCAL: root,
      STP_BENCH_BASELINE: `${root}/baseline`,
      STP_BENCH_ENTRY: 'index.mjs',
      STP_BENCH_PORT: String(port),
      STP_BENCH_TASK_MIB: process.env.STP_BENCH_TASK_MIB ?? '512',
      STP_BENCH_GRACE_S: String(grace)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  logs = '';
  supervisor.stdout.on('data', (b) => {
    logs += b;
    process.stdout.write(b);
  });
  supervisor.stderr.on('data', (b) => {
    logs += b;
    process.stderr.write(b);
  });
  await wait(async () => {
    if (supervisor.exitCode !== null) throw Error('Supervisor exited ' + logs);
    return (await status()).state === 'complete';
  });
  return status();
};
const stop = async () => {
  if (!supervisor || supervisor.exitCode !== null) return;
  supervisor.kill('SIGTERM');
  await wait(() => supervisor.exitCode !== null, 40000);
  assert.equal(supervisor.exitCode, 0, logs);
};
const attempt = async (rev, commit = true, completeTimeout = 35000) => {
  await signalRecord(rev, 'prepare');
  const prepared = await wait(async () => {
    const s = await status();
    return s.revision === rev && ['prepared', 'failed', 'refused'].includes(s.state) && s;
  });
  if (prepared.state !== 'prepared' || !commit) return prepared;
  await signalRecord(rev, 'commit');
  return wait(async () => {
    const s = await status();
    return s.revision === rev && ['complete', 'failed'].includes(s.state) && s;
  }, completeTimeout);
};
const test = async (name, fn) => {
  const start = performance.now();
  try {
    const evidence = await fn();
    results.push({ name, pass: true, durationMs: performance.now() - start, evidence });
  } catch (error) {
    results.push({
      name,
      pass: false,
      durationMs: performance.now() - start,
      error: String(error),
      logs: logs.slice(-8192)
    });
    throw error;
  } finally {
    report = { ...report, results };
    output();
  }
};
const pidsGone = async (pids) =>
  wait(async () => {
    const all = await readdir('/proc');
    return pids.every((pid) => !all.includes(String(pid)));
  }, 3000);
const stream = async (path) => {
  const response = await fetch(url + path);
  const reader = response.body.getReader();
  const first = await reader.read();
  assert(first.value.length);
  return { reader, first: new TextDecoder().decode(first.value) };
};
const websocket = async () => {
  const socket = connect(port, '127.0.0.1');
  const received = [];
  socket.on('data', (b) => received.push(b));
  await new Promise((r) => socket.once('connect', r));
  socket.write(
    'GET /ws HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n'
  );
  await wait(() => Buffer.concat(received).includes(Buffer.from('101 Switching')));
  return { socket, received };
};
const main = async () => {
  if (scenario === 'trace-denied') {
    await test('B3 denied ptrace keeps checked image-only baseline without panic', async () => {
      await start();
      assert.equal((await get()).revision, 'baseline');
      const failed = await attempt('new');
      assert.equal(failed.state, 'failed');
      assert.match(failed.reason, /kernel exit observation unavailable/);
      assert.equal(failed.timings.candidateReaped, true);
      assert.equal((await get()).revision, 'baseline');
      assert.equal(supervisor.exitCode, null);
      await stop();
      return { reason: failed.reason, baselineKeptServing: true, candidateReaped: true };
    });
  }
  if (scenario === 'normal') {
    await test('B2/B4 baseline kernel peak and HTTP 500 reachability', async () => {
      const s = await start('old500');
      assert.equal((await get()).status, 500);
      const m = s.timings.memoryAfter;
      assert(m.allowed);
      assert(m.peakBytes > 0);
      return m;
    });
    await test('B10 measured proxy CPU, latency, descriptors and streaming bodies', async () => {
      const app = await inspect();
      const cpu = async () => {
        const fields = (await readFile(`/proc/${supervisor.pid}/stat`, 'utf8')).split(' ');
        return Number(fields[13]) + Number(fields[14]);
      };
      const descriptors = async () => (await readdir(`/proc/${supervisor.pid}/fd`)).length;
      const beforeFd = await descriptors();
      const beforeCpu = await cpu();
      const measure = async (target) => {
        const values = [];
        for (let i = 0; i < 500; i++) {
          const begin = performance.now();
          await (await fetch(target)).text();
          values.push(performance.now() - begin);
        }
        return values.sort((a, b) => a - b);
      };
      const direct = await measure(`http://127.0.0.1:${app.port}`);
      const proxied = await measure(url);
      const cpuTicks = (await cpu()) - beforeCpu;
      const afterFd = await descriptors();
      assert(afterFd - beforeFd <= 8);
      const body = await new Promise((resolve, reject) => {
        const req = request(url, { method: 'POST' }, (res) => {
          let b = '';
          res.on('data', (v) => (b += v));
          res.on('end', () => resolve(JSON.parse(b)));
        });
        req.on('error', reject);
        for (let i = 0; i < 32; i++) req.write(Buffer.alloc(65536));
        req.end();
      });
      assert.equal(body.bytes, 2 * 1024 * 1024);
      return {
        requestsPerPath: 500,
        directP50Ms: direct[250],
        proxyP50Ms: proxied[250],
        proxyP95Ms: proxied[474],
        supervisorCpuTicks: cpuTicks,
        descriptorGrowth: afterFd - beforeFd,
        chunkedBytes: body.bytes
      };
    });
    await stop();
    await test('B3 inherited scores, workers and late forks; restoration before next swap', async () => {
      await start();
      const initial = await inspect();
      assert.equal(initial.score, -998);
      assert.equal((await attempt('workers', false)).state, 'prepared');
      const prep = await fetch(url + '/inspect', { headers: { 'X-Lab-Prepare': '1' } }).then((r) => r.json());
      assert.equal(prep.score, 500);
      assert(prep.workers.every((p) => p.score === 500));
      await signalRecord('workers', 'commit');
      const s = await wait(async () => {
        const v = await status();
        return v.revision === 'workers' && v.state === 'complete' && v;
      });
      await sleep(800);
      const live = await inspect();
      assert.equal(live.score, -998);
      assert(live.workers.length >= 3);
      assert(live.workers.every((p) => p.score === -998));
      assert.equal((await attempt('new')).state, 'complete');
      await pidsGone([live.pid, ...live.workers.map((p) => p.pid)]);
      return { initial, prep, live, timings: s.timings };
    });
    await stop();
    await test('B10 natural long request, keep-alive, POST/100-continue, SSE and WebSocket deadline', async () => {
      // The old process may finish in-flight requests for the CLI's SWAP_DRAIN_SECONDS; the qualification image sets it.
      const swapDrainMs = Number(process.env.QUAL_SWAP_DRAIN_S) * 1000;
      assert(swapDrainMs > 0, 'QUAL_SWAP_DRAIN_S is required');
      await start('old', 3);
      assert.equal((await attempt('new', false)).state, 'prepared');
      const natural = await stream('/long');
      await signalRecord('new', 'commit');
      const first = await wait(async () => {
        const v = await status();
        return v.revision === 'new' && ['complete', 'failed'].includes(v.state) && v;
      });
      assert.equal(first.state, 'complete');
      // The 1.5 s request was open at the switch: the swap waits for it and stops waiting as soon as it ends.
      assert.equal(first.timings.forcedDrain, false);
      assert(first.timings.drainMs > 500 && first.timings.drainMs < 5000);
      let naturalEnd = '';
      for (;;) {
        const b = await natural.reader.read();
        if (b.done) break;
        naturalEnd += new TextDecoder().decode(b.value);
      }
      assert(naturalEnd.endsWith('old'));
      const old = await inspect();
      const long = await stream('/long');
      const sse = await stream('/sse');
      const ws = await websocket();
      const traffic = [];
      const trafficController = new AbortController();
      const loop = (async () => {
        while (!trafficController.signal.aborted) {
          try {
            const r = await get();
            if (r.status !== 200) traffic.push(r);
          } catch (e) {
            traffic.push(String(e));
          }
          await sleep(20);
        }
      })();
      let s;
      try {
        s = await attempt('old', true, swapDrainMs + 30000);
      } finally {
        trafficController.abort();
        await loop;
      }
      assert.equal(s.state, 'complete');
      assert.equal(traffic.length, 0);
      let end = '';
      for (;;) {
        const b = await long.reader.read();
        if (b.done) break;
        end += new TextDecoder().decode(b.value);
      }
      assert(end.endsWith('new'));
      try {
        while (!(await sse.reader.read()).done) {}
      } catch {}
      await wait(() => ws.socket.destroyed);
      assert(Buffer.concat(ws.received).includes(Buffer.from([0x88, 2, 3, 0xe9])));
      // SSE and WebSocket never end on their own, so they hold the old process until the drain deadline.
      assert.equal(s.timings.forcedDrain, true);
      assert(s.timings.drainMs >= swapDrainMs - 100 && s.timings.drainMs < swapDrainMs + 5000);
      await pidsGone([old.pid]);
      const post = await new Promise((resolve, reject) => {
        const r = request(
          url,
          {
            method: 'POST',
            headers: {
              Expect: '100-continue',
              Host: 'preserved.example',
              'x-forwarded-for': '192.0.2.4',
              'Content-Length': 1048576
            }
          },
          (res) => {
            let b = '';
            res.on('data', (v) => (b += v));
            res.on('end', () => resolve(JSON.parse(b)));
          }
        );
        r.on('error', reject);
        r.once('continue', () => r.end(Buffer.alloc(1048576)));
        r.flushHeaders();
      });
      assert.equal(post.bytes, 1048576);
      assert.equal(post.host, 'preserved.example');
      assert(post.forwarded.startsWith('192.0.2.4'));
      return { naturalTimings: first.timings, timings: s.timings, swapRequestFailures: traffic.length, post };
    });
    await stop();
    for (const rev of ['startupCrash', 'detach', 'doubleFork']) {
      await test('B3 prepare failure ' + rev, async () => {
        await start();
        const before = await inspect();
        const s = await attempt(rev);
        assert.equal(s.state, 'failed');
        assert.equal((await inspect()).pid, before.pid);
        await sleep(300);
        assert.equal((await status()).state, 'failed');
        return s;
      });
      await stop();
    }
  }
  if (scenario === 'normal' || scenario === 'crash') {
    await test('B3 post-switch leader crash preserves old request deadline and sticky failure', async () => {
      await start('old', 3);
      const long = await stream('/sse');
      const old = await inspect();
      await attempt('workers', false);
      await signalRecord('workers', 'commit');
      await wait(async () => (await get()).revision === 'workers');
      const victim = await inspect();
      await get('/crash');
      const s = await wait(async () => {
        const v = await status();
        return v.state === 'failed' && v;
      });
      assert.equal((await inspect()).pid, old.pid);
      await long.reader.cancel();
      await pidsGone([victim.pid, ...victim.workers.map((p) => p.pid)]);
      return s;
    });
    await stop();
  }
  if (scenario === 'normal' || scenario === 'old-exit-crash') {
    await test('B3 candidate crash while baseline is already shutting down', async () => {
      await start('ignoreTerm', 2);
      await attempt('workers', false);
      await signalRecord('workers', 'commit');
      await wait(async () => (await get()).revision === 'workers');
      const victim = await inspect();
      await get('/crash');
      const failure = await wait(async () => {
        const s = await status();
        return s.state === 'failed' && s.timings.candidateReaped && s;
      });
      assert.equal((await get()).body, 'ignoreTerm');
      await pidsGone([victim.pid, ...victim.workers.map((p) => p.pid)]);
      return failure;
    });
    await stop();
  }
  if (scenario === 'normal' || scenario === 'review-fixes') {
    await test('B3 clean and nonzero short-lived children allow prepare and swap', async () => {
      await start();
      assert.equal((await attempt('workers', false)).state, 'prepared');
      const results = [];
      for (const path of ['/short-child', '/nonzero-child']) {
        const r = await fetch(url + path, { headers: { 'X-Lab-Prepare': '1' } });
        results.push(await r.json());
      }
      await sleep(500);
      assert.equal((await status()).state, 'prepared');
      await signalRecord('workers', 'commit');
      const complete = await wait(async () => {
        const s = await status();
        return s.state === 'complete' && s.revision === 'workers' && s;
      });
      assert.deepEqual(
        results.map((r) => r.code),
        [0, 17]
      );
      return { results, complete };
    });
    await stop();
    await test('B3 startup failure with stopped grandchild reaps full tree and preserves baseline', async () => {
      await start();
      await signalRecord('stuckStartup', 'prepare');
      const pid = await wait(async () => Number(await readFile('/tmp/qual-stuck-pid', 'utf8')));
      await wait(async () => /[Tt]/.test((await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1][0]));
      const failure = await wait(async () => {
        const s = await status();
        return s.revision === 'stuckStartup' && s.state === 'failed' && s.timings.candidateReaped && s;
      }, 45000);
      await pidsGone([pid]);
      assert.equal((await get()).body, 'old');
      return { stoppedGrandchild: pid, failure };
    });
    await stop();
  }
  if (scenario === 'normal' || scenario === 'worker-kill' || scenario === 'review-fixes') {
    await test('B3 unexplained worker SIGKILL fails prepare and reaps remaining workers', async () => {
      await start();
      await attempt('workers', false);
      await sleep(250);
      const victim = await fetch(url + '/inspect', { headers: { 'X-Lab-Prepare': '1' } }).then((r) => r.json());
      await fetch(url + '/worker-kill', { headers: { 'X-Lab-Prepare': '1' } });
      const failure = await wait(async () => {
        const s = await status();
        return s.state === 'failed' && s.timings.candidateReaped && s;
      });
      assert.match(failure.reason, /worker SIGKILL/);
      assert.equal((await get()).body, 'old');
      await pidsGone([victim.pid, ...victim.workers.map((p) => p.pid)]);
      return failure;
    });
    await stop();
  }
  for (const phase of ['prepare', 'switch']) {
    if (scenario !== 'oom-' + phase) continue;
    await test('B3 real candidate worker OOM ' + phase, async () => {
      await start('old', 3);
      const old = await inspect();
      const long = await stream('/sse');
      await attempt('oom', false);
      const prep = await fetch(url + '/inspect', { headers: { 'X-Lab-Prepare': '1' } }).then((r) => r.json());
      if (phase === 'switch') {
        await signalRecord('oom', 'commit');
        await wait(async () => (await get()).revision === 'oom');
      }
      await fetch(url + '/grow', { headers: phase === 'prepare' ? { 'X-Lab-Prepare': '1' } : {} });
      const s = await wait(async () => {
        const v = await status();
        return v.state === 'failed' && v.timings.candidateReaped && v;
      });
      // Kernel exit observation may see SIGKILL before the OOM counter read.
      // Establish the cause from the counter delta, rather than an error label.
      assert.match(s.reason, /OOM|SIGKILL/);
      assert(s.timings.oomAfter > s.timings.oomBefore);
      assert.equal((await get()).body, 'old');
      const restored = await inspect();
      if (restored.pid !== old.pid) {
        assert.equal(s.timings.localRevert, 'restart');
        assert(s.timings.drainMs >= 2900);
      }
      await long.reader.cancel();
      await pidsGone([prep.pid, ...prep.workers.map((p) => p.pid)]);
      return { status: s, old, victim: prep };
    });
    await stop();
  }
  // The cgroup lifetime peak survives supervisor restarts. Run deliberate memory pressure in its own container,
  // so it cannot make later successful-swap scenarios fail closed before they exercise their behavior.
  if (scenario === 'memory-sources') {
    await test('B4 a candidate serving HTTP 500 can become the live revision', async () => {
      await start('old500');
      const s = await attempt('new500');
      assert.equal(s.state, 'complete');
      const response = await get();
      assert.equal(response.status, 500);
      assert.equal(response.revision, 'new500');
      return s.timings;
    });
    await test('B2 combined burst/cache/tmpfs activity raises lifetime peak and keeps serving', async () => {
      const before = (await status()).timings.memoryAfter;
      for (const path of ['/burst', '/cache', '/tmpfs']) assert.equal((await get(path)).status, 200);
      const s = await attempt('old500');
      const memory = s.timings.memoryBefore;
      assert(memory.peakBytes >= before.peakBytes + 32 * 1024 * 1024);
      assert.equal(s.state, memory.allowed ? 'complete' : 'refused');
      if (!memory.allowed) assert.equal(s.reason, 'memory_screen');
      const response = await get();
      assert.equal(response.status, 500);
      assert.equal(response.revision, memory.allowed ? 'old500' : 'new500');
      assert.equal(supervisor.exitCode, null);
      return { state: s.state, timings: s.timings };
    });
    await stop();
  }
  if (scenario === 'lifetime') {
    await test('B2 overlap-raised lifetime peak refuses the next edit', async () => {
      await start();
      const s = await attempt('large');
      assert.equal(s.state, 'complete');
      assert.equal((await attempt('new')).state, 'refused');
      return { peak: s.timings.memoryAfter, refusal: await status() };
    });
    await stop();
  }
  for (const phase of ['prepare', 'switch', 'old-shutdown']) {
    if (scenario !== 'stop-' + phase) continue;
    await test('B10 SIGTERM during ' + phase + ' retains cached traffic, concurrent grace and full reap', async () => {
      const external = process.env.QUAL_EXTERNAL_STOP === '1';
      const stopGrace = Number(process.env.QUAL_STOP_GRACE ?? (external ? '40' : '2'));
      await start('ignoreTerm', stopGrace);
      let held;
      if (phase === 'switch') held = await stream('/sse');
      if (phase === 'prepare') {
        await signalRecord('slowStartup', 'prepare');
        // A running child proves spawn is in progress; prepared must not have been published.
        await wait(async () => logs.includes('"revision":"slowStartup"'));
        assert.notEqual((await status()).state, 'prepared');
      } else await attempt('stop', false);
      if (phase !== 'prepare') {
        await signalRecord('stop', 'commit');
        await wait(async () => (await get()).revision === 'stop');
        if (phase === 'old-shutdown') await sleep(100);
      }
      let begin;
      if (external) {
        console.log(JSON.stringify({ qualification: { state: 'stop-ready', phase } }));
        await new Promise((resolve) =>
          process.once('SIGTERM', () => {
            begin = performance.now();
            supervisor.kill('SIGTERM');
            resolve();
          })
        );
      } else {
        begin = performance.now();
        supervisor.kill('SIGTERM');
      }
      if (phase === 'prepare') {
        const atStop = await status();
        assert.notEqual(atStop.state, 'prepared');
        assert(!logs.includes('"state":"prepared"'));
      }
      await sleep(1000);
      assert.equal((await get()).status, 200);
      await wait(() => supervisor.exitCode !== null, 85000);
      assert.equal(supervisor.exitCode, 0, logs);
      const elapsed = performance.now() - begin;
      assert(elapsed >= Math.max(30, stopGrace) * 1000 && elapsed < (Math.max(30, stopGrace) + stopGrace + 2) * 1000);
      if (held)
        try {
          await held.reader.cancel();
        } catch {}
      assert.equal((await readdir('/tmp/stp-code-swap')).length, 0);
      return {
        elapsedMs: elapsed,
        exitCode: supervisor.exitCode,
        applicationGraceS: stopGrace,
        taskStopTimeoutS: Math.max(60, Math.max(30, stopGrace) + stopGrace + 2),
        ecsStopTask: external
      };
    });
  }
};
if (process.env.QUAL_SERVE === '1')
  createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(report));
  }).listen(8080, '0.0.0.0');
main()
  .then(() => {
    report = { state: 'passed', results };
    output();
  })
  .catch(async (error) => {
    report = { state: 'failed', error: String(error), results };
    output();
    try {
      await stop();
    } catch {}
    // A failed check can leave streams, sockets and traffic loops open; exit so the container stops now.
    if (process.env.QUAL_SERVE !== '1') process.exit(1);
  });
