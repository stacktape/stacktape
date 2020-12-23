import { existsSync } from 'fs';
import { spawnSync } from 'child_process';

/**
 * @note this is needed because of a prisma-related issue, that happens when building query engine on windows:
 * https://github.com/prisma/prisma-client-js/issues/476
 */
export const fixPrismaBinary = () => {
  process.env.PRISMA_QUERY_ENGINE_BINARY = '/tmp/query-engine-rhel-openssl-1.0.x';
  const binaryPath = '/tmp/query-engine-rhel-openssl-1.0.x';
  if (!existsSync(binaryPath)) {
    spawnSync('cp', [
      `${process.env.LAMBDA_TASK_ROOT}/node_modules/.prisma/client/query-engine-rhel-openssl-1.0.x`,
      '/tmp/'
    ]);
    spawnSync('chmod', ['555', '/tmp/query-engine-rhel-openssl-1.0.x']);
  }
};
