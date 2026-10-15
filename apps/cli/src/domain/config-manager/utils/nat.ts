export { DEFAULT_NAT_INSTANCE_SIZE } from '@stacktape/config/nat';

/**
 * NAT instances run the arm64 Amazon Linux 2023 image, so the size must be a Graviton one. Graviton families carry a
 * `g` after the generation number (t4g, m7g, c7gn, r8g, ...); the x86 families do not (t3, m7i, c7a, ...).
 */
export const isGravitonInstanceSize = (instanceSize: string) => /^[a-z]+\d+g[a-z]*\.[a-z0-9]+$/u.test(instanceSize);
