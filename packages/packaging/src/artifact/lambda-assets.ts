import type { TextEdit } from '../es/source-map-edits';
import { basename } from 'node:path';
import { writeEditedJavaScript } from '../es/source-map-edits';

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

/** Point built Lambda code at its packaged assets, shifting source maps with each reference edit. */
export const rewriteLambdaAssetReferences = async (javascriptPaths: string[], assetPaths: string[]) => {
  await Promise.all(
    javascriptPaths.map((path) =>
      writeEditedJavaScript({
        from: path,
        to: path,
        edits: (code) => getLambdaAssetReferenceEdits(code, assetPaths),
        packaged: false
      })
    )
  );
};
