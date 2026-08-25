import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertProcessSucceeded, runProcess } from './process';
import { buildRunnerImageTag } from './sandbox-planning';

export const QUALIFICATION_RUNNER_DOCKERFILE = `FROM node:24-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    curl \\
    ca-certificates \\
    git \\
    docker.io \\
    unzip \\
    python3 \\
    python3-pip \\
    python3-venv \\
    tar \\
    && rm -rf /var/lib/apt/lists/*

# Install pinned Bun 1.3.14
RUN ARCH="$(uname -m)" && \\
    if [ "$ARCH" = "x86_64" ]; then BUN_ARCH="x64"; \\
    elif [ "$ARCH" = "aarch64" ]; then BUN_ARCH="aarch64"; \\
    else echo "Unsupported arch $ARCH" && exit 1; fi && \\
    curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v1.3.14/bun-linux-\${BUN_ARCH}.zip" -o /tmp/bun.zip && \\
    unzip -q /tmp/bun.zip -d /tmp/bun && \\
    mv /tmp/bun/bun-linux-\${BUN_ARCH}/bun /usr/local/bin/bun && \\
    chmod +x /usr/local/bin/bun && \\
    rm -rf /tmp/bun /tmp/bun.zip

# Install pinned pnpm 11.17.0
RUN npm install -g pnpm@11.17.0

WORKDIR /workspace

# Extract clean committed Stacktape tree
ADD repo.tar /workspace/

# Install workspace dependencies from lockfile
RUN pnpm install --frozen-lockfile

# Build dev artifacts needed for source CLI execution
RUN pnpm --filter @stacktape/cli run build:dev-artifacts

ENV STACKTAPE_QUALIFICATION_SANDBOX=1 \\
    CI=1 \\
    NO_COLOR=1 \\
    STP_DISABLE_TELEMETRY=1

ENTRYPOINT ["bun", "apps/cli/scripts/qualification/run-project-qualification.ts"]
`;

export const checkRunnerImageExists = async (imageTag: string, rootDirectory: string) => {
  try {
    const result = await runProcess({
      command: 'docker',
      args: ['image', 'inspect', imageTag],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
};

export const buildRunnerImage = async ({
  productCommit,
  rootDirectory,
  forceRebuild = false,
  onProgress
}: {
  productCommit: string;
  rootDirectory: string;
  forceRebuild?: boolean;
  onProgress?: (message: string) => void;
}): Promise<{ imageTag: string; built: boolean }> => {
  const imageTag = buildRunnerImageTag(productCommit);

  if (!forceRebuild) {
    const exists = await checkRunnerImageExists(imageTag, rootDirectory);
    if (exists) {
      onProgress?.(`Reusing existing qualification runner image ${imageTag}.\n`);
      return { imageTag, built: false };
    }
  }

  onProgress?.(`Building qualification runner image ${imageTag} from clean committed tree at ${productCommit}...\n`);
  const buildDirectory = await mkdtemp(join(tmpdir(), 'stacktape-runner-build-'));
  const archivePath = join(buildDirectory, 'repo.tar');
  const dockerfilePath = join(buildDirectory, 'Dockerfile');

  try {
    const archiveResult = await runProcess({
      command: 'git',
      args: ['archive', '--format=tar', '-o', archivePath, productCommit],
      cwd: rootDirectory,
      timeoutMs: 60_000
    });
    assertProcessSucceeded(archiveResult);

    await writeFile(dockerfilePath, QUALIFICATION_RUNNER_DOCKERFILE, 'utf8');

    const buildResult = await runProcess({
      command: 'docker',
      args: ['build', '-t', imageTag, '-f', dockerfilePath, buildDirectory],
      cwd: rootDirectory,
      timeoutMs: 30 * 60_000
    });
    assertProcessSucceeded(buildResult);

    onProgress?.(`Successfully built qualification runner image ${imageTag}.\n`);
    return { imageTag, built: true };
  } finally {
    try {
      await rm(buildDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
    } catch {}
  }
};
