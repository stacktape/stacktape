import { createHash } from 'node:crypto';

// The benchmark CLI and installed-package consumer must invalidate the same image inputs.
export const codeSwapBaseInputs = (input: {
  manifest: string;
  dependencyImage?: string;
  lock: string;
  authored: string;
  supervisor: Uint8Array;
  dockerfile: string;
  runtime: string;
  nodeVersion: number;
  nodeTarget: string;
  minify: boolean;
  architecture: string;
}) => ({ ...input, supervisor: createHash('sha256').update(input.supervisor).digest('hex') });
