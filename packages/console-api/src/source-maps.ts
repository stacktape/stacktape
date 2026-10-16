import { z } from 'zod';

/**
 * Source maps of Lambda functions live in the stack's deployment bucket, in the customer's AWS account, not in the
 * deployment package. A deployment records which maps describe each function's code (the manifest below) on its
 * operation record. When the Console first sees an error, it reads the maps that describe the code the failing
 * execution environment ran, maps the frames, and stores the mapped file, line, column and function. The maps carry no
 * source code (`sourcesContent`), and the Console keeps nothing of them beyond the mapped frames.
 */

/** Deployment-bucket prefix of the source-map bundles a deployment stores. */
export const SOURCE_MAP_KEY_PREFIX = 'source-maps/';

/**
 * Where the bundle of one artifact's maps is stored: under the artifact's name and digest, so every deployment that
 * runs the same artifact shares one object and the object lives as long as an artifact with that digest does. The
 * object is the bundle's JSON compressed with gzip, stored with `Content-Encoding: gzip`; objects stored by earlier CLI
 * builds are plain JSON.
 */
export const sourceMapObjectKey = ({ artifactName, digest }: { artifactName: string; digest: string }) =>
  `${SOURCE_MAP_KEY_PREFIX}${artifactName}/${digest}.json`;

export const sourceMapManifestSchema = z.object({
  functions: z
    .array(
      z.object({
        /** The function's AWS name, as in its log group `/aws/lambda/<lambdaName>`. */
        lambdaName: z.string().min(1).max(140),
        /** The `stp:code-digest` tag of the code these maps describe. */
        digest: z.string().min(1).max(128),
        /** Deployment-bucket keys of the map bundles of the function's own code and of its Stacktape layers. */
        sourceMapKeys: z.array(z.string().startsWith(SOURCE_MAP_KEY_PREFIX).max(1024)).min(1).max(8),
        /**
         * When Lambda started running this code (the function's `LastModified` once the deployment finished), in epoch
         * milliseconds. Absent while the deployment is still switching the code.
         */
        activeSince: z.number().int().positive().optional(),
        /**
         * The published version that runs this code, for a function invoked through an alias. An execution environment
         * of a published version runs that version's code whatever `$LATEST` runs, so its errors use these maps.
         */
        version: z.string().regex(/^\d+$/).optional()
      })
    )
    .max(2000)
});
export type SourceMapManifest = z.infer<typeof sourceMapManifestSchema>;

const sourceMapSchema = z.object({
  version: z.literal(3),
  sources: z.array(z.string().nullable()),
  names: z.array(z.string()).default([]),
  mappings: z.string()
});

/**
 * One artifact's maps, keyed by the path each JavaScript file has in the execution environment (`/var/task/index.js`,
 * `/opt/nodejs/chunks/chunk-….js`). Parsing keeps only what mapping needs, so `sourcesContent` never survives it.
 */
export const sourceMapBundleSchema = z.object({ files: z.record(z.string(), sourceMapSchema) });
export type SourceMapBundle = z.infer<typeof sourceMapBundleSchema>;
