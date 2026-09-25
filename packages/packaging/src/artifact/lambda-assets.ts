import type { TextEdit } from '../es/source-map-edits';
import { basename } from 'node:path';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * File-loader outputs must be addressable after Stacktape flattens an entrypoint and moves chunks into layers: the
 * edits that point each relative reference to an asset at `/var/task/<asset>`, keeping the quote style.
 */
export const getLambdaAssetReferenceEdits = (contents: string, assetPaths: string[]): TextEdit[] =>
  [...new Set(assetPaths.map((assetPath) => basename(assetPath)))].flatMap((assetName) =>
    Array.from(contents.matchAll(new RegExp(`(["'])(?:\\.\\.?/)+${escapeRegex(assetName)}\\1`, 'g')), (match) => ({
      start: match.index,
      end: match.index + match[0].length,
      text: `${match[1]}/var/task/${assetName}${match[1]}`
    }))
  );
