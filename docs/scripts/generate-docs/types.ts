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
  cliCommand?: string;
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
  modelProvider: 'claude' | 'codex';
  summary: string;
  issues: VerifierIssue[];
  positiveFindings: string[];
};

export type IterationResult = {
  iteration: number;
  draftPath: string;
  reviewerResults: ReviewerResult[];
  verifierResults: VerifierResult[];
  passed: boolean;
};

export type PipelineState = {
  pageId: string;
  pageRoute: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  iterations: IterationResult[];
  finalOutputPath?: string;
};

export type ContextPack = {
  page: PageDefinition;
  structurePlan: string;
  pipelinePlan: string;
  backboneSections: string[];
  sourceDocuments: Array<{
    filePath: string;
    content: string;
  }>;
};
