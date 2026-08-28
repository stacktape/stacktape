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
