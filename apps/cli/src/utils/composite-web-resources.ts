/**
 * Resource types that represent composite web resources with nested Lambda + S3 + CDN.
 * These resources use the parent's name for CloudFront distribution naming.
 */
export const COMPOSITE_WEB_RESOURCE_TYPES = [
  'nextjs-web',
  'astro-web',
  'nuxt-web',
  'sveltekit-web',
  'solidstart-web',
  'tanstack-web',
  'remix-web'
] as const;

export type CompositeWebResourceType = (typeof COMPOSITE_WEB_RESOURCE_TYPES)[number];

/**
 * Checks if a resource type is a composite web resource (Lambda + S3 + CDN).
 * Used to determine if nested resources should use parent's name for CDN distribution naming.
 */
export const isCompositeWebResourceType = (type: string | undefined): type is CompositeWebResourceType => {
  return COMPOSITE_WEB_RESOURCE_TYPES.includes(type as CompositeWebResourceType);
};
