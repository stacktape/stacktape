import { compareEcsTaskDefinitions } from '../deployed-stack-overview-manager/hotswap-utils';
import { createServiceRuntime } from './service-runtime';
import { getCodeSwapRuns } from './configuration';
import { retainCodeSwapLock } from './lifecycle-hooks';
type ServiceRuntime = ReturnType<typeof createServiceRuntime>;
const runtimes = new Map<string, ServiceRuntime>();
let runtimeInitialization: Promise<void> | undefined;
const initializeRuntimes = () =>
  (runtimeInitialization ??= (async () => {
    for (const run of await getCodeSwapRuns()) runtimes.set(run.service, createServiceRuntime(run));
  })());
export const codeSwapPending = (name: string): boolean => runtimes.get(name)?.codeSwapPending(name) ?? false;
export const codeSwapImageExtension = async (name: string) => {
  await initializeRuntimes();
  return runtimes.get(name)?.codeSwapImageExtension(name);
};
export const codeSwapResolveRole = async (
  definition: import('@stacktape/cloudformation/resource').KnownCloudFormationResource<'AWS::ECS::TaskDefinition'>,
  name: string
): Promise<void> => {
  await initializeRuntimes();
  await runtimes.get(name)?.codeSwapResolveRole(definition);
};
export const codeSwapSwap = async (update: Parameters<ServiceRuntime['codeSwapSwap']>[0]) =>
  (await runtimes.get(update.workload.name)?.codeSwapSwap(update)) ?? false;
const useImage = async (all: Iterable<Pick<ServiceRuntime, 'codeSwapUseImage'>>, fallback?: string) => {
  const results = await Promise.allSettled([...all].map((runtime) => runtime.codeSwapUseImage(fallback)));
  const failure = results.find((item) => item.status === 'rejected');
  if (failure?.status === 'rejected') {
    retainCodeSwapLock();
    throw failure.reason;
  }
};
export const codeSwapUseImage = () => useImage(runtimes.values());
export const abortCodeSwapPreparation = async () => {
  const results = await Promise.allSettled([...runtimes.values()].map((runtime) => runtime.abortCodeSwapPreparation()));
  const failure = results.find((item) => item.status === 'rejected');
  if (failure?.status === 'rejected') {
    retainCodeSwapLock();
    throw failure.reason;
  }
};
export const codeSwapReleaseIdentity = () => {
  const entries = [...runtimes].flatMap(([name, runtime]) => {
    const identity = runtime.codeSwapReleaseIdentity();
    return identity ? [[name, identity] as const] : [];
  });
  return entries.length === 1
    ? entries[0]![1]
    : entries.length
      ? { identity: Object.fromEntries(entries), mode: 'services', fallback: undefined }
      : undefined;
};
export const codeSwapRollbackComplete = async (...args: Parameters<ServiceRuntime['codeSwapRollbackComplete']>) => {
  await initializeRuntimes();
  for (const runtime of runtimes.values()) await runtime.codeSwapRollbackComplete(...args);
};
export const codeSwapComplete = async (createsRelease: boolean) => {
  try {
    for (const runtime of runtimes.values()) await runtime.codeSwapComplete(createsRelease);
    if (createsRelease) await Promise.all([...runtimes.values()].map((runtime) => runtime.verify()));
  } catch (error) {
    retainCodeSwapLock();
    throw error;
  }
};
type ServiceUpdate = Parameters<ServiceRuntime['codeSwapSwap']>[0];
type PreparedRuntime = Pick<ServiceRuntime, 'prepared' | 'codeSwapSwap' | 'codeSwapUseImage' | 'forceImage'>;
// No service commits until every changed service has prepared. A later failure converges all changed services to images.
export const prepareCodeSwapServices = async (
  all: ReadonlyMap<string, PreparedRuntime>,
  updates: ServiceUpdate[],
  taskConfigurationChanged: (update: ServiceUpdate) => boolean
) => {
  if (!all.size || !updates.length) return;
  const selected = updates.map((update) => all.get(update.workload.name));
  const prepared = await Promise.allSettled(selected.map((runtime) => runtime?.prepared()));
  const configurationChanged = updates.some(taskConfigurationChanged);
  if (
    configurationChanged ||
    selected.some((runtime) => !runtime?.prepared()) ||
    prepared.some((item) => item.status === 'rejected')
  ) {
    // Interpret refusals through the service's normal error path without committing any prepared sibling.
    await Promise.allSettled(
      prepared.flatMap((item, index) =>
        item.status === 'rejected' ? [selected[index]!.codeSwapSwap(updates[index]!)] : []
      )
    );
    await useImage(all.values(), configurationChanged ? undefined : 'another_service_failed');
    return;
  }
  const outcomes = await Promise.allSettled(updates.map((update, index) => selected[index]!.codeSwapSwap(update)));
  if (outcomes.some((item) => item.status === 'rejected' || !item.value)) {
    await useImage(all.values(), 'another_service_failed');
    for (const runtime of selected) runtime?.forceImage();
  }
};
export const codeSwapPrepareServices = (updates: ServiceUpdate[]) =>
  prepareCodeSwapServices(
    runtimes,
    updates,
    (update) =>
      compareEcsTaskDefinitions({
        currentTaskDefinition: update.ecsTaskDefinition.currentState,
        calculatedTaskDefinition: update.newCfTaskDefinition,
        ignoreImages: true
      }).needsUpdate
  );

export const codeSwapPythonExtension = async (name: string) => {
  await initializeRuntimes();
  return runtimes.get(name)?.codeSwapPythonExtension(name);
};

// A swap leaves the service on an older task revision, so its image can be older than the retention window.
export const codeSwapLiveImages = async () => {
  await initializeRuntimes();
  return (await Promise.all([...runtimes.values()].map((runtime) => runtime.liveImages()))).flat();
};

export const codeSwapImageMatchesRunningCode = (jobName: string, digest: string, taskDefinition: string) =>
  [...runtimes.values()].some((runtime) => runtime.imageMatchesRunningCode(jobName, digest, taskDefinition));
