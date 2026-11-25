import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { registerParts } from '../parts';

export const heroes = registerParts(
  import.meta.glob<AstroComponentFactory>('./*/Hero.astro', { import: 'default' }),
  import.meta.glob('./*/meta.ts', { eager: true })
);
