import { createHash } from 'node:crypto';
import AdmZip from 'adm-zip';
import { DEFAULT_LAYER_CONFIG } from '@stacktape/packaging/split-bundler/layer-assignment';
import { LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES } from '@stacktape/packaging/artifact/lambda-limits';

const CHUNKS = 'nodejs/chunks/';
const imports = (code: string) =>
  Array.from(
    code.matchAll(/(?<=\b(?:from|import|require)\s*\(?\s*)["'`]\/opt\/nodejs\/chunks\/(chunk-[a-z0-9]+\.js)["'`]/g),
    (match) => `${CHUNKS}${match[1]}`
  );

export const unzippedSize = (zip: AdmZip): number =>
  zip.getEntries().reduce((total, entry) => total + entry.header.size, 0);

/**
 * Retain only the old code's reachable chunk closure, even when its layer is an interrupted transition. Copying the
 * entire old layer here would accumulate another generation on each retry. No native or user layer is ever merged.
 */
export const buildSharedLayerTransitions = ({
  functionZip,
  nextFunctionSize,
  currentLayers,
  nextLayers
}: {
  functionZip: AdmZip;
  nextFunctionSize: number;
  currentLayers: { arn: string; zip: AdmZip }[];
  nextLayers: { layerNumber: number; layerName: string; zip: AdmZip }[];
}): { layerNumber: number; zip: Buffer; identity: string; size: number }[] => {
  const nextByName = new Map(nextLayers.map((layer) => [layer.layerName, layer]));
  const oldFiles = new Map<string, { data: Buffer; layerName: string }>();
  for (const { arn, zip } of currentLayers) {
    const layerName = arn.split(':')[6]!;
    if (!nextByName.has(layerName)) continue;
    for (const entry of zip.getEntries()) {
      if (!entry.isDirectory && entry.entryName.startsWith(CHUNKS)) {
        oldFiles.set(entry.entryName, { data: entry.getData(), layerName });
      }
    }
  }
  const required = new Set<string>();
  const pending = functionZip
    .getEntries()
    .flatMap((entry) => (/\.(?:c?js|mjs)$/.test(entry.entryName) ? imports(entry.getData().toString()) : []));
  while (pending.length) {
    const name = pending.pop()!;
    if (required.has(name)) continue;
    required.add(name);
    const file = oldFiles.get(name);
    // A chunk may belong to an unchanged layer. It remains mounted throughout the update.
    if (file) pending.push(...imports(file.data.toString()));
  }
  const transitions = nextLayers.map(({ layerNumber, layerName, zip }) => {
    const files = new Map(
      zip
        .getEntries()
        .filter((entry) => !entry.isDirectory)
        .map((entry) => [entry.entryName, entry.getData()])
    );
    for (const name of required) {
      const old = oldFiles.get(name);
      if (!old || old.layerName !== layerName) continue;
      const replacement = files.get(name);
      if (replacement && !replacement.equals(old.data)) {
        throw new Error(`Shared chunk ${name} has conflicting contents; deploy through CloudFormation.`);
      }
      files.set(name, old.data);
      const map = oldFiles.get(`${name}.map`);
      if (map && !files.has(`${name}.map`)) files.set(`${name}.map`, map.data);
    }
    const size = [...files.values()].reduce((total, data) => total + data.length, 0);
    if (size > DEFAULT_LAYER_CONFIG.maxLayerSize) {
      throw new Error(
        `Shared layer ${layerNumber} needs ${(size / 1024 / 1024).toFixed(2)} MB during its safe transition, exceeding the 50 MB layer budget. Use a full deployment.`
      );
    }
    const archive = new AdmZip();
    const hash = createHash('sha256');
    for (const [name, data] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
      hash.update(name).update('\0').update(data).update('\0');
      archive.addFile(name, data);
    }
    const bytes = archive.toBuffer();
    if (bytes.length > 50 * 1024 * 1024)
      throw new Error('The transitional layer ZIP exceeds Lambda’s 50 MB direct upload limit. Use a full deployment.');
    return { layerNumber, zip: bytes, identity: `transition-${hash.digest('hex').slice(0, 24)}`, size };
  });
  const unchangedSize = currentLayers
    .filter(({ arn }) => !nextByName.has(arn.split(':')[6]!))
    .reduce((sum, { zip }) => sum + unzippedSize(zip), 0);
  const combined =
    Math.max(unzippedSize(functionZip), nextFunctionSize) +
    unchangedSize +
    transitions.reduce((sum, { size }) => sum + size, 0);
  if (combined > LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES) {
    throw new Error(
      `The function and its layers need ${(combined / 1024 / 1024).toFixed(2)} MB during the safe transition, exceeding Lambda’s 250 MB limit. Use a full deployment.`
    );
  }
  return transitions;
};
