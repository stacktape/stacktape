export type GeneratedArtifact = Readonly<{
  canonicalInputs: readonly string[];
  outputPath: string;
  committed: boolean;
}>;

export interface SchemaGenerator {
  generate(): Promise<readonly GeneratedArtifact[]>;
  verifyFresh(): Promise<void>;
}
