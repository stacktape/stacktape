import { isBuiltin } from 'node:module';

export const isNodeBuiltinImport = (specifier: string) => isBuiltin(specifier);
