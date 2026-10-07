import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

export const docker = async (args: string[]) => {
  const child = Bun.spawn(['docker', ...args], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), 120_000);
  const [status, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text()
  ]).finally(() => clearTimeout(timer));
  assert.equal(status, 0, `Docker ${args[0]} failed: ${stderr.slice(-2000)}`);
  return stdout.trim();
};

/** Only this lane's random container is ever removed, including a failed start. */
export const startDatabase = async ({ image, port, args = [] }: { image: string; port: number; args?: string[] }) => {
  const name = `stacktape-j9-query-${randomUUID().slice(0, 12)}`;
  const close = async () => {
    await docker(['rm', '--force', '--volumes', name]);
    assert.equal(await docker(['ps', '--all', '--filter', `name=^/${name}$`, '--format', '{{.Names}}']), '');
    console.info(`Verified removal: ${name}`);
  };
  try {
    await docker([
      'run',
      '--detach',
      '--name',
      name,
      '--label',
      'stacktape.journey=J9',
      '--publish',
      `127.0.0.1::${port}`,
      ...args,
      image
    ]);
    const assignedPort = Number(
      await docker(['inspect', '--format', `{{(index (index .NetworkSettings.Ports "${port}/tcp") 0).HostPort}}`, name])
    );
    assert.ok(assignedPort > 0);
    return { name, port: assignedPort, close };
  } catch (error) {
    const names = await docker(['ps', '--all', '--filter', `name=^/${name}$`, '--format', '{{.Names}}']);
    if (names) await close();
    throw error;
  }
};

export const waitUntilReady = async (check: () => Promise<unknown>) => {
  const deadline = Date.now() + 45_000;
  for (;;) {
    try {
      await check();
      return;
    } catch (error) {
      if (Date.now() > deadline) throw new Error('J9 database did not become ready', { cause: error });
      await Bun.sleep(100);
    }
  }
};
