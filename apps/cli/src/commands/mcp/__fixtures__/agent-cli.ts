import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const readFlag = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const now = () => new Date().toISOString();

const main = async () => {
  const command = process.argv[2];
  const mode = readFlag('mode') || 'success';

  if (mode === 'missing-result') {
    process.stdout.write(
      `${JSON.stringify({ type: 'log', ts: now(), level: 'info', source: 'fixture', message: 'done' })}\n`
    );
    return;
  }

  if (mode === 'malformed-result') {
    process.stdout.write(`${JSON.stringify({ type: 'result', ts: now(), ok: 'yes', code: 'OK', message: 'bad' })}\n`);
    return;
  }

  if (mode === 'hang') {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore'
    });
    const pidFile = readFlag('pidFile');
    if (pidFile && child.pid) await writeFile(pidFile, String(child.pid));
    process.stdout.write(
      `${JSON.stringify({
        type: 'event',
        ts: now(),
        phase: 'TEST',
        eventType: 'HANG',
        status: 'started',
        message: 'Fixture is waiting.'
      })}\n`
    );
    setInterval(() => {}, 1000);
    await new Promise(() => {});
  }

  process.stdout.write(
    `${JSON.stringify({
      type: 'result',
      ts: now(),
      ok: true,
      code: 'OK',
      message: 'Fixture completed.',
      data: {
        command,
        cwd: process.cwd(),
        currentWorkingDirectory: readFlag('currentWorkingDirectory')
      }
    })}\n`
  );
};

void main();
