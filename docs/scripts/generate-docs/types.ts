export type PageKind =
  | 'introduction'
  | 'getting-started'
  | 'concept'
  | 'resource'
  | 'packaging'
  | 'events'
  | 'deployment'
  | 'local-development'
  | 'console'
  | 'cicd'
  | 'observability'
  | 'cost'
  | 'governance'
  | 'ai'
  | 'recipe'
  | 'reference'
  | 'cli';

export type BackboneTemplate = 'resource' | 'recipe' | 'console' | 'cli' | 'general';

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

export type AgentModelKey =
  | 'writer'
  | 'firstTimeUserReviewer'
  | 'productionEngineerReviewer'
  | 'aiConsumerReviewer'
  | 'factualAccuracyVerifier'
  | 'sourceGroundingVerifier'
  | 'apiCompletenessAuditor';

export type AgentModelConfig = Partial<Record<AgentModelKey, string>>;

export type AgentProvider = 'claude' | 'codex';

export type PipelineOutcome = 'passed' | 'needs-human-review' | 'failed';

export type ReviewerResult = {
  reviewerId: string;
  persona: string;
  modelProvider: 'claude' | 'codex';
  modelName?: string;
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
  modelName?: string;
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
  status?: PipelineOutcome;
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

export type HumanFeedbackEntry = {
  // ISO timestamp when the user added the feedback.
  addedAt: string;
  // Iteration number that was the latest at the time the feedback was added.
  // Lets the UI show "you added this after iter 2" so the writer's response is easy to attribute.
  iterationAtTime: number;
  // Free-form text the user wrote. Treated as highest-priority feedback in the writer prompt.
  text: string;
};

export type PipelineState = {
  pageId: string;
  pageRoute: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  iterations: IterationResult[];
  outcome?: PipelineOutcome;
  finalOutputPath?: string;
  pipelineStatus?: 'needs-human-review' | 'did-not-pass';
  pipelineFailureSummary?: string;
  pipelineReviewSummary?: string;
  // Resolved agent role name -> model display name for the most recent run saved in this state.
  agentModelAssignments?: Record<string, string>;
  // Hashes of every input that fed the last passing draft. Keyed by filePath as it appears
  // in ContextPack.sourceDocuments (real paths and synthetic ones like the pricing summary).
  // Used by --listStale / --onlyStale to detect when a page's sources have drifted.
  inputHashes?: Record<string, string>;
  // Hash of the project-level style guide at the time of the last passing draft.
  styleGuideHash?: string;
  // Append-only history of free-form feedback the user added via /review UI.
  // All entries are surfaced to the writer prompt on every subsequent iteration, marked as
  // highest priority. The UI displays them with timestamps so the user can see the conversation.
  humanFeedback?: HumanFeedbackEntry[];
};

export type ContextPack = {
  page: PageDefinition;
  structurePlan: string;
  pipelinePlan: string;
  styleGuide: string;
  // Deterministic list of every page in the site, grouped by section. Injected into
  // writer + verifier prompts so cross-links use real routes and never invented paths.
  navigationIndex: string;
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
