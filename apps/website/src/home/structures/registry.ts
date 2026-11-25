import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { registerParts } from '../parts';

export const structures = registerParts(
  import.meta.glob<AstroComponentFactory>('./*/Page.astro', { import: 'default' }),
  import.meta.glob('./*/meta.ts', { eager: true })
);
