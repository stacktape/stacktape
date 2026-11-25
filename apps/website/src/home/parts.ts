import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

type PartMeta = { id: string; title: string; line: string };
type LoadPart = () => Promise<AstroComponentFactory>;
type HomePart = PartMeta & { load: LoadPart };

export const registerParts = (components: Record<string, LoadPart>, metadata: Record<string, PartMeta>): HomePart[] =>
  Object.entries(components)
    .flatMap(([path, load]) => {
      const directory = path.slice(0, path.lastIndexOf('/'));
      const meta = metadata[`${directory}/meta.ts`];
      if (!meta) return [];

      const id = directory.slice(2);
      if (id !== meta.id) throw new Error(`Home part ${path} must export id '${id}'.`);

      return [{ ...meta, load }];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
