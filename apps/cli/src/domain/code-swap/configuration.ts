import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runSchema, type BenchmarkRun } from './benchmark-run';
import { unsupportedReason } from './eligibility';

export const getCodeSwapRuns = async (): Promise<BenchmarkRun[]> => {
  const path = process.env.STP_CODE_SWAP_BENCH_RUN;
  if (path) return [runSchema.parse(JSON.parse(await readFile(path, 'utf8')))];
  const { configManager } = await import('../config-manager');
  const { templateManager } = await import('../template-manager');
  const { globalStateManager: global } = await import('../../app/global-state-manager');
  const workloads = configManager.config ? configManager.allContainerWorkloads : [];
  const opted = workloads.filter((workload) => 'codeSwap' in workload && workload.codeSwap);
  const oldTable = templateManager.oldTemplate.Resources.StacktapeCodeSwapTable;
  const metadata = oldTable?.Metadata;
  const oldServices = Array.isArray(metadata?.CodeSwapServices)
    ? metadata.CodeSwapServices.filter((name): name is string => typeof name === 'string')
    : typeof metadata?.CodeSwapService === 'string'
      ? [metadata.CodeSwapService]
      : [];
  const services = [...new Set([...opted.map((workload) => workload.name), ...oldServices])];
  const { fsPaths } = await import('../../config/runtime-paths');
  return services.map((service) => {
    const workload = workloads.find((item) => item.name === service);
    const enabled = opted.some((item) => item.name === service);
    const unsupported = workload && unsupportedReason(workload, workloads.length);
    const legacy = metadata?.CodeSwapService === service;
    return {
      recordService: legacy ? 'node' : `service:${service}`,
      artifactService: legacy ? 'api' : `services/${service}`,
      name: global.targetStack.projectName,
      service,
      owner: global.targetStack.stackName,
      table: oldTable
        ? runSchema.shape.table.parse((oldTable.Properties as Record<string, unknown>)?.TableName)
        : `${global.targetStack.stackName}-code-swap`,
      mode: 'swap',
      phase3: true,
      phase4: true,
      optOut: !enabled || Boolean(unsupported),
      supervisor:
        process.env.STP_CODE_SWAP_BENCH_SUPERVISOR ?? join(fsPaths.helperLambdasDir(), 'stacktape-supervisor'),
      result: process.env.STP_CODE_SWAP_BENCH_RESULT ?? '',
      memory: workload?.resources.memory ?? 1024,
      count: workload?.scaling.minInstances ?? 1
    };
  });
};
