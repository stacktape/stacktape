/** Execute the deployed probe in its pinned image, sharing a test server's network just as Fargate does. */
import { randomUUID } from 'node:crypto';
import {
  WEB_SERVICE_HEALTH_CHECK_COMMAND,
  WEB_SERVICE_HEALTH_CHECK_IMAGE
} from '../../src/domain/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads/web-service-health-check';

const docker = async (args: string[]) => {
  const child = Bun.spawn(['docker', ...args], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  return { code, stdout, stderr };
};

const run = async () => {
  const serverName = `stp-http-server-${randomUUID()}`;
  const serverScript = `#!/bin/sh
IFS= read -r request
set -- $request
case "$2" in
  /hang) sleep 10; exit;;
  /malformed) printf 'this is not HTTP\\r\\n'; exit;;
  /stream) printf 'HTTP/1.1 200 OK\\r\\nContent-Length: 1000\\r\\n\\r\\n'; sleep 10; exit;;
esac
status="\${2#/}"
printf 'HTTP/1.1 %s Test\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n' "$status"
`;
  try {
    const started = await docker([
      'run',
      '-d',
      '--name',
      serverName,
      '-e',
      `SERVER_SCRIPT=${serverScript}`,
      '--entrypoint',
      '/bin/sh',
      WEB_SERVICE_HEALTH_CHECK_IMAGE,
      '-c',
      'printf "%s" "$SERVER_SCRIPT" > /tmp/serve; chmod +x /tmp/serve; exec nc -lk -p 8080 -e /tmp/serve'
    ]);
    if (started.code) throw new Error(started.stderr);
    for (const [path, statuses, expected] of [
      ['/200', '[1-5]', 0],
      ['/404', '[1-5]', 0],
      ['/500', '[1-5]', 0],
      ['/302', '[1-5]', 0],
      ['/200', '[23]', 0],
      ['/302', '[23]', 0],
      ['/404', '[23]', 1],
      ['/503', '[23]', 1],
      ['/malformed', '[1-5]', 1],
      ['/hang', '[1-5]', 1],
      ['/stream', '[1-5]', 0],
      ['/closed', '[1-5]', 1]
    ] as const) {
      const name = `stp-http-health-${randomUUID()}`;
      try {
        const result = await docker([
          'run',
          '--rm',
          '--name',
          name,
          '--read-only',
          '--memory',
          '16m',
          '--cap-drop=ALL',
          '--user',
          '65534:65534',
          '--network',
          `container:${serverName}`,
          '-e',
          'STP_HEALTH_HOST=127.0.0.1',
          '-e',
          `STP_HEALTH_PORT=${path === '/closed' ? 1 : 8080}`,
          '-e',
          `STP_HEALTH_PATH=${path}`,
          '-e',
          `STP_HEALTH_STATUS=${statuses}`,
          '--entrypoint',
          '/bin/sh',
          WEB_SERVICE_HEALTH_CHECK_IMAGE,
          '-c',
          WEB_SERVICE_HEALTH_CHECK_COMMAND[1]
        ]);
        if (result.code !== expected)
          throw new Error(`${path} (${statuses}): expected ${expected}, got ${result.code}: ${result.stderr}`);
        console.info(`Passed ${path} (${statuses})`);
      } finally {
        await docker(['rm', '-f', name]);
      }
    }
  } finally {
    await docker(['rm', '-f', serverName]);
  }
};
if (import.meta.main)
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
