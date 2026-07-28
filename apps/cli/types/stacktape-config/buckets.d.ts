type StpBucket = Bucket['properties'] & {
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
type BucketReferencableParam = 'name' | 'arn' | CdnReferenceableParam;
