import awsIsopackImport from '@isoflow/isopacks/dist/aws';
import isoflowIsopackImport from '@isoflow/isopacks/dist/isoflow';
import { getResourceVisual } from './catalog.js';

type Isopack = typeof awsIsopackImport;

/**
 * The packs are CommonJS whose `module.exports` carries `__esModule` and a `default`. Bundlers that honour the flag
 * hand a default import the pack; Vite 8's dev server and Astro's bundler hand it the namespace instead.
 */
const unwrapIsopack = (pack: Isopack): Isopack => (pack as Isopack & { default?: Isopack }).default ?? pack;

/** Heavy URL resolver used only by the lazy isometric-diagram entry point. */
const urlByIconId = new Map(
  [...unwrapIsopack(awsIsopackImport).icons, ...unwrapIsopack(isoflowIsopackImport).icons].map(
    (icon) => [icon.id, icon.url] as const
  )
);

export const getResourceIconUrl = (resourceType: string): string | undefined => {
  const iconId = getResourceVisual(resourceType)?.diagramIconId;
  return iconId === undefined ? undefined : urlByIconId.get(iconId);
};
