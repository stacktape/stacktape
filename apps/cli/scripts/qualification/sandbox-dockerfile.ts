import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertProcessSucceeded, runProcess } from './process';
import {
  buildRunnerImageTag,
  PINNED_BUN_SHA256,
  PINNED_BUN_VERSION,
  PINNED_PNPM_VERSION,
  SANDBOX_BASE_NODE_IMAGE
} from './sandbox-planning';

export const QUALIFICATION_RUNNER_DOCKERFILE = `FROM ${SANDBOX_BASE_NODE_IMAGE}

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

# Install pinned Bun with sha256 checksum verification
RUN ARCH="$(uname -m)" && \\
    if [ "$ARCH" = "x86_64" ]; then \\
        BUN_ARCH="x64" && \\
        EXPECTED_SHA="${PINNED_BUN_SHA256.x64}"; \\
    elif [ "$ARCH" = "aarch64" ]; then \\
        BUN_ARCH="aarch64" && \\
        EXPECTED_SHA="${PINNED_BUN_SHA256.aarch64}"; \\
    else echo "Unsupported architecture $ARCH" && exit 1; fi && \\
    curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${PINNED_BUN_VERSION}/bun-linux-\${BUN_ARCH}.zip" -o /tmp/bun.zip && \\
    echo "\${EXPECTED_SHA}  /tmp/bun.zip" | sha256sum -c - && \\
    unzip -q /tmp/bun.zip -d /tmp/bun && \\
    mv /tmp/bun/bun-linux-\${BUN_ARCH}/bun /usr/local/bin/bun && \\
    chmod 755 /usr/local/bin/bun && \\
    rm -rf /tmp/bun /tmp/bun.zip

# Install pinned pnpm
RUN npm install -g pnpm@${PINNED_PNPM_VERSION} && chmod 755 /usr/local/bin/pnpm

WORKDIR /workspace

# Copy clean committed Stacktape tree with exact .git metadata
COPY --chown=root:root repo /workspace/

# Install workspace dependencies from lockfile
RUN pnpm install --frozen-lockfile

# Build dev artifacts needed for CLI execution
RUN pnpm --filter @stacktape/cli run build:dev-artifacts

# Ensure root-owned read-only workspace for non-root execution
RUN chmod -R 755 /workspace

# Prepare dedicated writable volume mount points owned by node user (UID 1000)
RUN mkdir -p /qualification/output /qualification/cache /qualification/inputs /home/node && \\
    chown -R 1000:1000 /qualification /home/node

ENV STACKTAPE_QUALIFICATION_SANDBOX=1 \\
    CI=1 \\
    NO_COLOR=1 \\
    STP_DISABLE_TELEMETRY=1 \\
    HOME=/home/node

ENTRYPOINT ["bun", "apps/cli/scripts/qualification/run-project-qualification.ts"]
`;

export const computeDockerfileHash = (dockerfileContent = QUALIFICATION_RUNNER_DOCKERFILE) =>
  createHash('sha256').update(dockerfileContent).digest('hex').slice(0, 16);

export const checkRunnerImageValid = async (
  imageTag: string,
  expectedCommit: string,
  expectedDockerfileHash: string,
  rootDirectory: string
): Promise<boolean> => {
  try {
    const result = await runProcess({
      command: 'docker',
      args: ['image', 'inspect', imageTag, '--format', '{{json .Config.Labels}}'],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    if (result.exitCode !== 0) return false;
    const labels = JSON.parse(result.stdout.trim() || '{}') as Record<string, string>;
    return (
      labels['stacktape.qualification.managed'] === 'true' &&
      labels['stacktape.qualification.commit'] === expectedCommit &&
      labels['stacktape.qualification.dockerfile-hash'] === expectedDockerfileHash
    );
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
  const dockerfileHash = computeDockerfileHash();

  if (!forceRebuild) {
    const isValid = await checkRunnerImageValid(imageTag, productCommit, dockerfileHash, rootDirectory);
    if (isValid) {
      onProgress?.(`Reusing validated qualification runner image ${imageTag}.\n`);
      return { imageTag, built: false };
    }
  }

  onProgress?.(`Building qualification runner image ${imageTag} from clean committed tree at ${productCommit}...\n`);
  const buildDirectory = await mkdtemp(join(tmpdir(), 'stacktape-runner-build-'));
  const repoCheckoutDir = join(buildDirectory, 'repo');
  const dockerfilePath = join(buildDirectory, 'Dockerfile');

  try {
    // Clone clean committed HEAD with .git metadata intact
    const cloneResult = await runProcess({
      command: 'git',
      args: ['clone', '--no-checkout', rootDirectory, repoCheckoutDir],
      cwd: rootDirectory,
      timeoutMs: 120_000
    });
    assertProcessSucceeded(cloneResult);

    const checkoutResult = await runProcess({
      command: 'git',
      args: ['checkout', '--detach', '--force', productCommit],
      cwd: repoCheckoutDir,
      timeoutMs: 60_000
    });
    assertProcessSucceeded(checkoutResult);

    await writeFile(dockerfilePath, QUALIFICATION_RUNNER_DOCKERFILE, 'utf8');

    const buildResult = await runProcess({
      command: 'docker',
      args: [
        'build',
        '-t',
        imageTag,
        '--label',
        'stacktape.qualification.managed=true',
        '--label',
        `stacktape.qualification.commit=${productCommit}`,
        '--label',
        `stacktape.qualification.dockerfile-hash=${dockerfileHash}`,
        '--label',
        `stacktape.qualification.bun-version=${PINNED_BUN_VERSION}`,
        '--label',
        `stacktape.qualification.pnpm-version=${PINNED_PNPM_VERSION}`,
        '-f',
        dockerfilePath,
        buildDirectory
      ],
      cwd: rootDirectory,
      timeoutMs: 30 * 60_000
    });
    assertProcessSucceeded(buildResult);

    onProgress?.(`Successfully built qualification runner image ${imageTag}.\n`);
    return { imageTag, built: true };
  } finally {
    try {
      await rm(buildDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    } catch {}
  }
};
