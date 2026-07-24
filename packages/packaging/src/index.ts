export type ArtifactDigest = string & { readonly artifactDigest: unique symbol };

export type PackagedArtifact = Readonly<{
  digest: ArtifactDigest;
  path: string;
  sourceFiles: readonly string[];
}>;

export interface ArtifactPackager {
  package(input: Readonly<{ sourceDirectory: string; outputPath: string }>): Promise<PackagedArtifact>;
}
