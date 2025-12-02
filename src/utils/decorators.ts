import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { isPromise } from '@shared/utils/misc';
import { generateUuid } from './uuid';

// @note from https://github.com/taras/memoize-getters
const getPrototypeDescriptors = (target) => {
  const prototype = Object.getPrototypeOf(target);
  if (prototype && prototype !== Object.getPrototypeOf(Object)) {
    return Object.assign(getPrototypeDescriptors(prototype), Object.getOwnPropertyDescriptors(target.prototype));
  }
  return Object.getOwnPropertyDescriptors(target.prototype);
};

export const memoizeGetters = (targetClass) => {
  const descriptors = getPrototypeDescriptors(targetClass);
  for (const key in descriptors) {
    const descriptor = descriptors[key];
    if (descriptor.get) {
      Object.defineProperty(targetClass.prototype, key, {
        ...descriptor,
        get: function memoizedGetter() {
          const value = descriptor.get.call(this);
          Object.defineProperty(this, key, { value });
          return value;
        }
      });
    }
  }

  return targetClass;
};

export const skipInitIfInitialized = <T extends { init: (...args: any[]) => Promise<any> }>(instance: T): T => {
  if (process.env.STP_INVOKED_FROM === 'server') {
    return instance;
  }
  const originalInit = instance.init;
  const className = instance.constructor.name as DomainServiceName;

  instance.init = (...args: any[]) => {
    // console.log(globalStateManager.initializedDomainServices);
    if (!globalStateManager.initializedDomainServices.includes(className)) {
      globalStateManager.markDomainServiceAsInitialized(className);
      return originalInit(...args);
    }
    return Promise.resolve();
  };

  return instance;
};

/**
 * @description this helps us cancel all pending actions of all domain services, if one of them fails
 */
export const cancelablePublicMethods = <T>(instance: T): T => {
  for (const propertyName of Object.getOwnPropertyNames(instance)) {
    const propertyValue = instance[propertyName];
    if (typeof propertyValue === 'function') {
      instance[propertyName] = (...args: any[]) => {
        const returnedValue = propertyValue(...args);
        if (isPromise(returnedValue)) {
          const promiseId = generateUuid();
          const cancelablePromise = new Promise((resolve, reject) => {
            applicationManager.pendingCancellablePromises[promiseId] = {
              rejectFn: reject,
              name: `${instance.constructor.name}.${propertyName}`
            };
            returnedValue
              .then((result) => {
                delete applicationManager.pendingCancellablePromises[promiseId];
                resolve(result);
              })
              .catch(reject);
          });
          applicationManager.pendingCancellablePromises[promiseId].promise = cancelablePromise;
          return cancelablePromise;
        }
        return returnedValue;
      };
    }
  }
  return instance;
};

// export const cancellablePublicMethods = () => (targetClass) => {
//   const descriptors = getPrototypeDescriptors(targetClass);
//   for (const key in descriptors) {
//     const originalDescriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(targetClass.prototype, key);
//     if (
//       !key.startsWith('#') &&
//       key !== 'constructor' &&
//       originalDescriptor.get &&
//       typeof originalDescriptor.get === 'function'
//     ) {
//       Object.defineProperty(targetClass.prototype, key, {
//         ...originalDescriptor.value,
//         value(...args: any[]) {
//           const returnedValue = originalDescriptor.value.apply(targetClass, args);
//           if (isPromise(returnedValue)) {
//             const cancelablePromise = cancelable(returnedValue);
//             promisesToCancel.push(cancelablePromise);
//             return cancelablePromise;
//           }
//           return returnedValue;
//         }
//       });
//     }
//   }

//   return targetClass;
// };

// export function cancellablePublicMethods<T>(someParam: string) {
//   return function (target: new (...params: any[]) => T) {
//     for (const key of Object.getOwnPropertyNames(target.prototype)) {
//       // maybe blacklist constructor here
//       let descriptor = Object.getOwnPropertyDescriptor(target.prototype, key);
//       if (descriptor) {
//         descriptor = someDecorator(someParam)(key, descriptor);
//         Object.defineProperty(target.prototype, key, descriptor);
//       }
//     }
//   };
// }

// function someDecorator(someParam: string): (methodName: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
//   return (methodName: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
//     const method = descriptor.value;
//     // eslint-disable-next-line no-param-reassign
//     descriptor.value = function (...args: any[]) {
//       const returnedValue = method.apply(this, args);
//       console.warn(`Here for descriptor ${methodName} with param ${someParam}`);
//       if (isPromise(returnedValue)) {
//         const cancelablePromise = cancelable(returnedValue);
//         promisesToCancel.push(cancelablePromise);
//         return cancelablePromise;
//       }
//       return returnedValue;
//     };
//     return descriptor;
//   };
// }
