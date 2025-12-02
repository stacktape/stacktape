// Shim for basic-compose to handle CommonJS/ESM interop in Bun
// Use dynamic require to properly load CommonJS module
// eslint-disable-next-line ts/no-require-imports
const basicComposeModule = require('basic-compose');

// The module exports default via CommonJS
const composeOriginal = basicComposeModule.default || basicComposeModule;

type Decorator<T> = (target: T) => T;

const compose = <T>(...decorators: Array<Decorator<T>>) => {
  return (target: T): T => {
    return composeOriginal(...decorators)(target);
  };
};

export default compose;
