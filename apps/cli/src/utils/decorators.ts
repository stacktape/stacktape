import { pendingOperations } from '@application-services/command-lifecycle/pending-operations';
import { isPromise } from './misc';

let serviceInitializations = new WeakMap<object, Promise<unknown>>();

/** Begin a new invocation when reusing CLI service instances in the same process. */
export const resetDomainServiceInitialization = () => {
  serviceInitializations = new WeakMap();
};

export const skipInitIfInitialized = <T extends { init: (...args: never[]) => Promise<unknown>; reset?: () => void }>(
  instance: T
): T => {
  const originalInit = instance.init as (...args: Parameters<T['init']>) => ReturnType<T['init']>;
  instance.init = ((...args: Parameters<T['init']>) => {
    const registry = serviceInitializations;
    const pendingInitialization = registry.get(instance);
    if (pendingInitialization) return pendingInitialization;

    let initialization: Promise<unknown>;
    try {
      initialization = originalInit(...args);
    } catch (error) {
      return Promise.reject(error);
    }
    registry.set(instance, initialization);
    void initialization.catch(() => {
      if (registry.get(instance) === initialization) registry.delete(instance);
    });
    return initialization;
  }) as T['init'];

  if (instance.reset) {
    const originalReset = instance.reset;
    instance.reset = () => {
      serviceInitializations.delete(instance);
      originalReset();
    };
  }
  return instance;
};

/** Reject tracked results when the command fails; observe the underlying operation until it settles. */
export const cancelablePublicMethods = <T>(instance: T): T => {
  for (const propertyName of Object.getOwnPropertyNames(instance)) {
    const propertyValue = instance[propertyName];
    if (typeof propertyValue === 'function') {
      instance[propertyName] = (...args: unknown[]) => {
        const returnedValue = propertyValue(...args);
        return isPromise(returnedValue) ? pendingOperations.track(returnedValue) : returnedValue;
      };
    }
  }
  return instance;
};
