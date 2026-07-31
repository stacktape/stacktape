import type { CdnReferenceableParam } from '@domain-services/config-manager/resolved-types/cdn';
import type { AstroWeb } from '@stacktape/config/astro-web';
import type { Bucket } from '@stacktape/config/buckets';
import type { Convex } from '@stacktape/config/convex';
import type { HostingBucket } from '@stacktape/config/hosting-buckets';
import type { NextjsWeb } from '@stacktape/config/nextjs-web';
import type { NuxtWeb } from '@stacktape/config/nuxt-web';
import type { RemixWeb } from '@stacktape/config/remix-web';
import type { SolidStartWeb } from '@stacktape/config/solidstart-web';
import type { SvelteKitWeb } from '@stacktape/config/sveltekit-web';
import type { TanStackWeb } from '@stacktape/config/tanstack-web';

export type StpBucket = Bucket['properties'] & {
  name: string;
  type: Bucket['type'];
  configParentResourceType:
    | Bucket['type']
    | HostingBucket['type']
    | NextjsWeb['type']
    | AstroWeb['type']
    | NuxtWeb['type']
    | SvelteKitWeb['type']
    | SolidStartWeb['type']
    | TanStackWeb['type']
    | RemixWeb['type']
    | Convex['type'];
  nameChain: string[];
};
export type BucketReferencableParam = 'name' | 'arn' | CdnReferenceableParam;
