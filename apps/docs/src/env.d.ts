/// <reference types="astro/client" />

/**
 * The CLI's generated API reference, exposed to the client bundle by
 * `src/build/api-reference-data.ts`. There is no file on disk for TypeScript to infer this from, so
 * the DTOs in `src/utils/api-reference-dto.ts` describe the artifact's shape.
 */
declare module 'virtual:stacktape/api-reference-data' {
  import type { ApiReferenceData } from '@/utils/api-reference-dto';

  export const apiReferenceDefinitions: ApiReferenceData;
}
