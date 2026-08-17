import { basename } from 'node:path';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** File-loader outputs must be addressable after Stacktape flattens an entrypoint and moves chunks into layers. */
export const rewriteLambdaAssetReferences = (contents: string, assetPaths: string[]): string => {
  let rewritten = contents;
  for (const assetPath of assetPaths) {
    const assetName = basename(assetPath);
    const reference = new RegExp(`(["'])(?:\\.\\.?/)+${escapeRegex(assetName)}\\1`, 'g');
    rewritten = rewritten.replace(reference, (_match, quote: string) => `${quote}/var/task/${assetName}${quote}`);
  }
  return rewritten;
};
