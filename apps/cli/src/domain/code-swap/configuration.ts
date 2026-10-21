import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runSchema, type BenchmarkRun } from './benchmark-run';
import { unsupportedReason } from './eligibility';

export const getCodeSwapRun = async (): Promise<BenchmarkRun | undefined> => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  if (path) return runSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  const { configManager } = await import('../config-manager');
  const { templateManager } = await import('../template-manager');
  const { globalStateManager: global } = await import('../../app/global-state-manager');
  const workloads = configManager.config ? configManager.allContainerWorkloads : [];
  const opted = workloads.find((workload) => 'codeSwap' in workload && workload.codeSwap);
  const oldTable = templateManager.oldTemplate.Resources.StacktapeCodeSwapTable;
  if (!opted && !oldTable) return undefined;
  const oldService = oldTable?.Metadata?.CodeSwapService;
  const service = opted?.name ?? (typeof oldService === 'string' ? oldService : 'api');
  const workload = opted ?? workloads.find((workload) => workload.name === service);
  const unsupported = workload && unsupportedReason(workload, workloads.length);
  const { fsPaths } = await import('../../config/runtime-paths');
  return {
    name: global.targetStack.projectName,
    service,
    owner: global.targetStack.stackName,
    table: oldTable
      ? runSchema.shape.table.parse((oldTable.Properties as Record<string, unknown>)?.TableName)
      : `${global.targetStack.stackName}-code-swap`,
    mode: 'swap',
    phase3: true,
    phase4: true,
    optOut: !opted || Boolean(unsupported),
    supervisor: join(fsPaths.helperLambdasDir(), 'stacktape-supervisor'),
    result: process.env.STP_CODE_SWAP_BENCH_RESULT ?? '',
    memory: workload?.resources.memory ?? 1024,
    count: workload?.scaling.minInstances ?? 1
  };
};
