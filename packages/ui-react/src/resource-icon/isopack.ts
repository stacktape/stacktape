import awsIsopack from '@isoflow/isopacks/dist/aws';
import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';
import { getResourceVisual } from './catalog.js';

/** Heavy URL resolver used only by the lazy isometric-diagram entry point. */
const urlByIconId = new Map([...awsIsopack.icons, ...isoflowIsopack.icons].map((icon) => [icon.id, icon.url] as const));

export const getResourceIconUrl = (resourceType: string): string | undefined => {
  const iconId = getResourceVisual(resourceType)?.diagramIconId;
  return iconId === undefined ? undefined : urlByIconId.get(iconId);
};
