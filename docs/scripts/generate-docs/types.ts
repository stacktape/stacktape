export type PageKind =
  | 'introduction'
  | 'getting-started'
  | 'concept'
  | 'resource'
  | 'choosing'
  | 'packaging'
  | 'events'
  | 'deployment'
  | 'local-development'
  | 'console'
  | 'cicd'
  | 'monitoring'
  | 'cost'
  | 'governance'
  | 'ai'
  | 'recipe'
  | 'troubleshooting'
  | 'reference'
  | 'cli';

export type BackboneTemplate = 'resource' | 'choosing' | 'recipe' | 'console' | 'cli' | 'general';

export type PageDefinition = {
  id: string;
  title: string;
  route: string;
  outputPath: string;
  order: number;
  kind: PageKind;
  template: BackboneTemplate;
  category: string;
  shortDescription: string;
  sourceFiles?: string[];
  sourceGlobs?: string[];
  notes?: string[];
  typeName?: string;
  referenceableResourceType?: string;
  cliCommand?: string;
};

export type SectionInstructionsConfig = {
  sections?: Record<string, string[]>;
};

export type ResolvedSectionInstruction = {
  section: string;
  instructions: string[];
};

export type ReviewCategory = 'clarity' | 'scannability' | 'completeness' | 'practicalUsefulness' | 'audienceFit';

export type ReviewerResult = {
  reviewerId: string;
  persona: string;
  modelProvider: 'claude' | 'codex';
  scores: Record<ReviewCategory, number>;
  strengths: string[];
  problems: string[];
  mandatoryFixes: string[];
  optionalImprovements: string[];
};

export type VerifierIssue = {
  severity: 'high' | 'medium' | 'low';
  type: 'unsupported-claim' | 'incorrect-claim' | 'ambiguous-claim' | 'missing-caveat' | 'stale-claim';
  statement: string;
  reason: string;
  suggestedFix: string;
  evidence?: Array<{
    file: string;
    quote: string;
  }>;
};

export type VerifierResult = {
  verifierId: string;
  // 'deterministic' is used by the in-process code validator (not a model call).
  modelProvider: 'claude' | 'codex' | 'deterministic';
  summary: string;
  issues: VerifierIssue[];
  positiveFindings: string[];
};

export type IterationResult = {
  iteration: number;
  draftPath: string;
  reviewerResults: ReviewerResult[];
  verifierResults: VerifierResult[];
  seoReviewResult?: SeoReviewResult;
  passed: boolean;
};

export type SeoReviewResult = {
  score: number;
  suggestions: string[];
};

export type CliCommandReferenceArg = {
  name: string;
  required: boolean;
  longDescription: string;
  shortDescription: string;
  alias?: string;
  allowedValues?: string[];
  allowedTypes: string[];
};

export type PipelineState = {
  pageId: string;
  pageRoute: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  iterations: IterationResult[];
  finalOutputPath?: string;
  // Hashes of every input that fed the last passing draft. Keyed by filePath as it appears
  // in ContextPack.sourceDocuments (real paths and synthetic ones like the pricing summary).
  // Used by --listStale / --onlyStale to detect when a page's sources have drifted.
  inputHashes?: Record<string, string>;
  // Hash of the project-level style guide at the time of the last passing draft.
  styleGuideHash?: string;
};

export type ContextPack = {
  page: PageDefinition;
  structurePlan: string;
  pipelinePlan: string;
  styleGuide: string;
  backboneSections: string[];
  sectionInstructions: ResolvedSectionInstruction[];
  exampleDocument?: {
    filePath: string;
    content: string;
  };
  missingSourceFiles: string[];
  cliCommandReference?: {
    command: string;
    sortedArgs: CliCommandReferenceArg[];
  };
  sourceDocuments: Array<{
    filePath: string;
    content: string;
  }>;
};
