import { readFile, writeFile } from 'node:fs/promises';

/** The map a Lambda package ships: `map` without `sourcesContent`. See `writePackagedSourceMap`. */
export const withoutSourcesContent = <Map extends Record<string, unknown>>(map: Map): Map => {
  const packaged = { ...map };
  delete packaged.sourcesContent;
  return packaged;
};

/**
 * Writes the source map a Lambda package ships: the map at `from` without `sourcesContent` (owner decision,
 * 2026-09-25). Node maps stack frames from `sources`, `names` and `mappings` alone, so mapped file, line and function
 * stay; only the original-source excerpt Node prints above a fatal error is lost, and the map shrinks to a fraction.
 * `from` may equal `to`; otherwise the full map at `from` is left as it was for any later external use.
 */
export const writePackagedSourceMap = async ({ from, to }: { from: string; to: string }) => {
  const map = JSON.parse(await readFile(from, 'utf8')) as Record<string, unknown>;
  await writeFile(to, JSON.stringify(withoutSourcesContent(map)));
};
