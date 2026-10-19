import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GO_BUILDER =
  'golang:1.25.3-bookworm@sha256:4f43b271f9673eb7bd0cb3a49cc17b08d8d6ee110277e26dbacc93c43a5a7793';
export const buildSupervisor = async (outputDirectory: string) => {
  const source = fileURLToPath(new URL('./supervisor', import.meta.url));
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const child = Bun.spawn(
    [
      'docker',
      'run',
      '--rm',
      '--network=none',
      '-e',
      'CGO_ENABLED=0',
      '-e',
      'GOOS=linux',
      '-e',
      'GOARCH=amd64',
      '-v',
      `${source}:/src:ro`,
      '-v',
      `${output}:/out`,
      '-w',
      '/src',
      GO_BUILDER,
      'sh',
      '-c',
      'CGO_ENABLED=1 go test -race ./... && go vet ./... && go build -trimpath -buildvcs=false -ldflags="-s -w -buildid=" -o /out/stacktape-supervisor .'
    ],
    { stdout: 'inherit', stderr: 'inherit' }
  );
  if (await child.exited) throw new Error('Supervisor build/check failed.');
  return resolve(output, 'stacktape-supervisor');
};
if (import.meta.main)
  buildSupervisor(process.argv[2] ?? '.stacktape/code-swap/supervisor').catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
