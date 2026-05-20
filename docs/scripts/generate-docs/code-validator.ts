import { pathExists, readFile } from 'fs-extra';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import prettier from 'prettier';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import * as ts from 'typescript';
import configSchema from '../../../@generated/schemas/config-schema.json';
import resources from '../../.resources.json';
import { convertTypescriptToYaml, convertYamlToTypescript } from '../../src/utils/yaml-to-typescript';
import type { PageDefinition, VerifierIssue } from './types';

const stacktapeRoot = join(import.meta.dir, '..', '..', '..');
const docsRoot = join(import.meta.dir, '..', '..');
const docsStacktapeTypesRoot = join(docsRoot, 'public', 'stacktape');
const releaseNpmIndexPath = join(stacktapeRoot, '__release-npm', 'index.d.ts');
const require = createRequire(import.meta.url);
const { cliCommands } = require('../../../src/config/cli/commands.ts') as { cliCommands: string[] };

// Hardcoded fallback list of known exports of the stacktape package, used when __release-npm has not
// been built yet. Keep this list synced with __release-npm/index.d.ts when adding new resources.
const fallbackKnownExports = new Set([
  'defineConfig',
  'RelationalDatabase',
  'WebService',
  'PrivateService',
  'WorkerService',
  'MultiContainerWorkload',
  'LambdaFunction',
  'BatchJob',
  'Bucket',
  'HostingBucket',
  'DynamoDbTable',
  'EventBus',
  'HttpApiGateway',
  'ApplicationLoadBalancer',
  'NetworkLoadBalancer',
  'RedisCluster',
  'MongoDbAtlasCluster',
  'StateMachine',
  'UserAuthPool',
  'UpstashRedis',
  'SqsQueue',
  'SnsTopic',
  'KinesisStream',
  'WebAppFirewall',
  'OpenSearchDomain',
  'EfsFilesystem',
  'NextjsWeb',
  'AstroWeb',
  'NuxtWeb',
  'SvelteKitWeb',
  'SolidStartWeb',
  'TanStackWeb',
  'RemixWeb',
  'Bastion',
  'EdgeLambdaFunction',
  'CustomResource',
  'DeploymentScript',
  'AwsCdkConstruct',
  'RdsEnginePostgres',
  'RdsEngineMariadb',
  'RdsEngineMysql',
  'RdsEngineOracleEE',
  'RdsEngineSqlServerEE',
  'RdsEngineSqlServerEX',
  'RdsEngineSqlServerSE',
  'RdsEngineSqlServerWeb',
  'AuroraEnginePostgresql',
  'AuroraEngineMysql',
  'AuroraServerlessEnginePostgresql',
  'AuroraServerlessEngineMysql',
  'StacktapeLambdaBuildpackPackaging',
  'CustomArtifactLambdaPackaging',
  'PrebuiltImagePackaging',
  'CustomDockerfilePackaging',
  'ExternalBuildpackPackaging',
  'NixpacksPackaging',
  'StacktapeImageBuildpackPackaging',
  'HttpApiIntegration',
  'ScheduleIntegration',
  'SnsIntegration',
  'SqsIntegration',
  'KinesisIntegration',
  'DynamoDbIntegration',
  'CloudwatchLogIntegration',
  'ApplicationLoadBalancerIntegration'
]);

let knownExportsCache: Set<string> | null = null;

const loadKnownExports = async (): Promise<Set<string>> => {
  if (knownExportsCache) return knownExportsCache;
  if (!(await pathExists(releaseNpmIndexPath))) {
    knownExportsCache = fallbackKnownExports;
    return knownExportsCache;
  }
  const content = await readFile(releaseNpmIndexPath, 'utf8');
  const names = new Set<string>(fallbackKnownExports);
  // Match identifier lines inside `export { ... }` blocks: simple, identifier-per-line shape.
  const exportLineRegex = /^\s*([A-Z][A-Za-z0-9_]*),?\s*$/gm;
  for (const match of content.matchAll(exportLineRegex)) {
    names.add(match[1]);
  }
  // Match `export { foo, bar }` single-line exports.
  const exportInlineRegex = /export\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(exportInlineRegex)) {
    for (const id of match[1].split(',')) {
      const name = id.trim().split(/\s+as\s+/)[0];
      if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) names.add(name);
    }
  }
  knownExportsCache = names;
  return knownExportsCache;
};

// Strip Shiki / Twoslash focus + highlight markers so the source we hand to the parser is clean TS.
const stripShikiMarkers = (code: string) =>
  code
    .replace(/^\s*[/\s]*\/\/\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\]\s*$/gm, '')
    .replace(/^\s*#\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\]\s*$/gm, '')
    .replace(/\/\/\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\]/g, '')
    .replace(/#\s*\[!code\s+(?:focus|highlight)(?:-(?:start|end))?(?::\d+)?\]/g, '');

export type ExtractedCodeBlock = {
  // 1-based index of this CodeBlock in the draft, in document order.
  index: number;
  // Tab label as authored (defaults to 'unlabelled').
  label: string;
  // The original source from the MDX code field, with Shiki markers still present.
  rawCode: string;
  // The cleaned (Shiki-marker-free) TypeScript source of the code field.
  code: string;
  hasFocusMarkers: boolean;
  hasVisibleStacktapeImport: boolean;
  // The character offset in the draft where the <CodeBlock> tag opens, for diagnostic context.
  draftOffset: number;
};

const codeBlockOuterRegex = /<CodeBlock\b[^>]*?\bintellisense\b[\s\S]*?\/>/g;

const extractCodeFieldsFromBlock = (blockText: string): Array<{ label: string; code: string }> => {
  const results: Array<{ label: string; code: string }> = [];
  // Find tab objects: { label: '...', lang: '...', code: `...` }
  // Backticks make this hard with a simple regex. We scan tab-by-tab using a small state machine.
  let i = 0;
  while (i < blockText.length) {
    const labelMatch = blockText.slice(i).match(/label\s*:\s*(['"`])([\s\S]*?)\1/);
    if (!labelMatch || labelMatch.index === undefined) break;
    const labelStart = i + labelMatch.index;
    const label = labelMatch[2];
    // From labelStart, scan forward for code: ` ... ` allowing escaped backticks.
    const after = blockText.slice(labelStart);
    const codeKeywordIdx = after.indexOf('code:');
    if (codeKeywordIdx === -1) break;
    let cursor = labelStart + codeKeywordIdx + 'code:'.length;
    while (cursor < blockText.length && /\s/.test(blockText[cursor])) cursor++;
    const opener = blockText[cursor];
    if (opener !== '`' && opener !== "'" && opener !== '"') {
      i = cursor + 1;
      continue;
    }
    cursor += 1;
    let code = '';
    while (cursor < blockText.length) {
      const ch = blockText[cursor];
      if (ch === '\\' && cursor + 1 < blockText.length) {
        code += blockText[cursor + 1];
        cursor += 2;
        continue;
      }
      if (ch === opener) {
        cursor += 1;
        break;
      }
      code += ch;
      cursor += 1;
    }
    results.push({ label, code });
    i = cursor;
  }
  return results;
};

export const extractCodeBlocks = (draft: string): ExtractedCodeBlock[] => {
  const blocks: ExtractedCodeBlock[] = [];
  let index = 0;
  for (const match of draft.matchAll(codeBlockOuterRegex)) {
    const blockText = match[0];
    const draftOffset = match.index || 0;
    for (const { label, code } of extractCodeFieldsFromBlock(blockText)) {
      index += 1;
      blocks.push({
        index,
        label: label || 'unlabelled',
        rawCode: code,
        code: stripShikiMarkers(code),
        hasFocusMarkers: hasFocusMarkers(code),
        hasVisibleStacktapeImport: hasVisibleStacktapeImport(code),
        draftOffset
      });
    }
  }
  return blocks;
};

const focusMarkerRegex = /(?:#|\/\/)\s*\[!code\s+focus(?:-(start|end))?(?::(\d+))?\s*\]/;
const focusMarkerRegexGlobal = new RegExp(focusMarkerRegex.source, 'g');

const hasFocusMarkers = (code: string) => focusMarkerRegex.test(code);

const hasVisibleStacktapeImport = (code: string) => {
  const rawLines = code.replace(/\r\n/g, '\n').split('\n');
  const hasAnyFocusMarker = rawLines.some((line) => focusMarkerRegex.test(line));
  if (!hasAnyFocusMarker) {
    return rawLines.some((line) => /from\s+['"]stacktape['"]/.test(line));
  }

  let focusBlockActive = false;
  let focusCounter = 0;

  for (const rawLine of rawLines) {
    const lineFocusedBeforeMarkers = focusBlockActive || focusCounter > 0;
    if (focusCounter > 0) focusCounter--;

    let lineFocused = lineFocusedBeforeMarkers;
    for (const marker of rawLine.matchAll(focusMarkerRegexGlobal)) {
      const suffix = marker[1] as 'start' | 'end' | undefined;
      const count = marker[2] ? Math.max(1, Number.parseInt(marker[2], 10)) : 1;
      if (suffix === 'start') {
        focusBlockActive = true;
      } else if (suffix === 'end') {
        focusBlockActive = false;
      } else {
        lineFocused = true;
        if (count > 1) focusCounter = count - 1;
      }
    }

    if (lineFocused && /from\s+['"]stacktape['"]/.test(stripShikiMarkers(rawLine))) {
      return true;
    }
  }

  return false;
};

const collectInstantiatedClassNames = (sourceFile: ts.SourceFile): string[] => {
  const names: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      names.push(node.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
};

const hasStacktapeImport = (sourceFile: ts.SourceFile): boolean => {
  let found = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === 'stacktape'
    ) {
      found = true;
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

const hasDefineConfigCall = (sourceFile: ts.SourceFile): boolean => {
  let found = false;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineConfig') {
      found = true;
    }
    if (!found) ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
};

const hasExportDefault = (sourceFile: ts.SourceFile): boolean => {
  for (const stmt of sourceFile.statements) {
    if (ts.isExportAssignment(stmt)) {
      return true;
    }
    const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
    if (
      modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      return true;
    }
  }
  return false;
};

const formatDiagnostic = (diag: ts.Diagnostic): string => {
  const messageText = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
  if (diag.file && diag.start !== undefined) {
    const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
    return `line ${line + 1}, col ${character + 1}: ${messageText}`;
  }
  return messageText;
};

const stacktapeModuleMap = new Map([
  ['stacktape', join(docsStacktapeTypesRoot, 'index.d.ts')],
  ['stacktape/types', join(docsStacktapeTypesRoot, 'types.d.ts')],
  ['stacktape/plain', join(docsStacktapeTypesRoot, 'plain.d.ts')],
  ['stacktape/cloudformation', join(docsStacktapeTypesRoot, 'cloudformation.d.ts')]
]);

const typeCheckStacktapeExample = (block: ExtractedCodeBlock): ts.Diagnostic[] => {
  const sourcePath = join(docsRoot, `.generated-doc-code-block-${block.index}.ts`);
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    noEmit: true
  };
  const host = ts.createCompilerHost(compilerOptions);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);

  host.readFile = (fileName) => {
    if (fileName === sourcePath) return block.code;
    return readFile(fileName);
  };
  host.fileExists = (fileName) => fileName === sourcePath || fileExists(fileName);
  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      const mappedPath = stacktapeModuleMap.get(moduleName);
      if (mappedPath) {
        return { resolvedFileName: mappedPath, extension: ts.Extension.Dts };
      }
      return ts.resolveModuleName(moduleName, containingFile, compilerOptions, host).resolvedModule;
    });

  const program = ts.createProgram([sourcePath], compilerOptions, host);
  return ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.file?.fileName === sourcePath);
};

const formatStacktapeExample = (code: string) =>
  prettier.format(code.trim(), {
    parser: 'typescript',
    plugins: [parserTypescript, parserEstree],
    singleQuote: true,
    trailingComma: 'none',
    printWidth: 100
  });

export type CodeValidationIssue = VerifierIssue;

const schemaDefinitions = (configSchema as { definitions: Record<string, unknown> }).definitions;
const resourceTypesWithReferenceableParams = new Set(
  (resources as Array<{ resourceType?: string }>).map((resource) => resource.resourceType).filter(Boolean)
);
const knownCliCommands = new Set(cliCommands);

const allowedMdxComponents = new Set([
  'Warning',
  'Info',
  'Tip',
  'Error',
  'Badge',
  'Jargon',
  'CodeBlock',
  'CliCommandsApiReference',
  'ApiReference',
  'ReferenceableParams',
  'FeatureComparisonTable',
  'DecisionTree',
  'ProjectStructure',
  'FlowDiagram',
  'ConsoleScreenshot',
  'Tabs',
  'Tab',
  'Link',
  'PreviousNext',
  'ResourceList',
  'StarterProjectList',
  'StarterProjectListShort',
  'DeploymentOptions',
  'GettingStartedOptions',
  'NavBox',
  'NavBoxGrid',
  'EngineVersionsList',
  'Divider',
  'NegativeMargin',
  'PropDescription'
]);

const stripFencedBlocks = (draft: string) =>
  draft.replace(/^```[\s\S]*?^```$/gm, '').replace(/^~~~[\s\S]*?^~~~$/gm, '');

const extractStringProp = (tagText: string, propName: string) => {
  const match = tagText.match(new RegExp(`\\b${propName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`));
  return match?.[1] || match?.[2];
};

const extractComponentTags = (draft: string) => {
  const withoutCode = stripFencedBlocks(draft);
  const tags: Array<{ name: string; tagText: string }> = [];
  for (const match of withoutCode.matchAll(/<\/?([A-Z][A-Za-z0-9]*)\b[^>]*>/g)) {
    tags.push({ name: match[1], tagText: match[0] });
  }
  return tags;
};

const suggestDefinitionName = (definitionName: string) => {
  if (schemaDefinitions[definitionName]) return definitionName;
  const candidates = [
    definitionName.replace(/Config$/, 'Props'),
    definitionName.replace(/Config$/, ''),
    definitionName.replace(/Config$/, 'Configuration')
  ].filter((candidate) => candidate !== definitionName);
  return candidates.find((candidate) => schemaDefinitions[candidate]);
};

const pushMdxIssue = (
  issues: CodeValidationIssue[],
  {
    severity = 'high',
    statement,
    reason,
    suggestedFix
  }: {
    severity?: CodeValidationIssue['severity'];
    statement: string;
    reason: string;
    suggestedFix: string;
  }
) => {
  issues.push({
    severity,
    type: 'incorrect-claim',
    statement,
    reason,
    suggestedFix
  });
};

export const validateMdxComponents = ({
  draft,
  page
}: {
  draft: string;
  page: PageDefinition;
}): CodeValidationIssue[] => {
  const issues: CodeValidationIssue[] = [];
  const tags = extractComponentTags(draft);
  const openingTags = tags.filter(({ tagText }) => !tagText.startsWith('</'));

  // Resource pages should have exactly one <ApiReference> — the root type for the page. Nested
  // types are reachable via the component's built-in drill-down, so multiple <ApiReference>
  // blocks are a smell.
  const apiReferenceCount = openingTags.filter(({ name }) => name === 'ApiReference').length;
  if (apiReferenceCount > 1) {
    pushMdxIssue(issues, {
      severity: 'medium',
      statement: `Page has ${apiReferenceCount} <ApiReference> components; resource pages should have exactly one.`,
      reason: 'Nested types render through the root <ApiReference>’s drill-down; extra <ApiReference> blocks duplicate work and split search/filter state.',
      suggestedFix: 'Keep exactly one <ApiReference definitionName="..." /> on the page (the writer picks its position — top, middle, or bottom); rely on its drill-down for nested types.'
    });
  }

  const unknownComponents = new Set(
    openingTags.map(({ name }) => name).filter((name) => !allowedMdxComponents.has(name))
  );
  for (const componentName of unknownComponents) {
    pushMdxIssue(issues, {
      severity: 'medium',
      statement: `Unknown MDX component <${componentName}> on /${page.route}.`,
      reason: `<${componentName}> is not registered in the docs MDX component map used by the generator.`,
      suggestedFix: `Use a registered MDX component or add <${componentName}> to the component registry and validator allow-list.`
    });
  }

  for (const { name, tagText } of openingTags) {
    if (name === 'PropertiesTable') {
      const definitionName = extractStringProp(tagText, 'definitionName');
      const replacementDefinitionName =
        (definitionName && suggestDefinitionName(definitionName)) || definitionName || page.typeName || 'TypeName';
      pushMdxIssue(issues, {
        severity: 'high',
        statement: '<PropertiesTable> is no longer a public docs component.',
        reason: 'Resource pages must use <ApiReference /> for the API reference; <PropertiesTable> has been removed from the writer surface.',
        suggestedFix: `Use <ApiReference definitionName="${replacementDefinitionName}" /> placed wherever fits the page's flow (top, middle, or bottom).`
      });
      continue;
    }
    if (name === 'ApiReference') {
      const definitionName = extractStringProp(tagText, 'definitionName');
      if (!definitionName) {
        pushMdxIssue(issues, {
          statement: `<ApiReference> is missing definitionName on /${page.route}.`,
          reason: 'The API reference renderer needs an explicit schema definition name.',
          suggestedFix: `Use <ApiReference definitionName="${page.typeName || 'TypeName'}" />.`
        });
        continue;
      }
      if (!schemaDefinitions[definitionName]) {
        const suggestion = suggestDefinitionName(definitionName);
        pushMdxIssue(issues, {
          statement: `<ApiReference definitionName="${definitionName}" /> references an unknown schema definition.`,
          reason: `${definitionName} is not present in @generated/schemas/config-schema.json definitions.`,
          suggestedFix: suggestion
            ? `Use <ApiReference definitionName="${suggestion}" />.`
            : 'Use a definitionName that exists in @generated/schemas/config-schema.json.'
        });
      }
      // When the page metadata provides a canonical typeName, the ApiReference MUST use it
      // exactly. Catches the recurring "ContainerWorkload" vs "ContainerWorkloadProps" bug
      // where the writer drops the Props suffix and the validator's schema-existence check
      // doesn't notice because both names exist as separate schema entries.
      if (page.typeName && definitionName !== page.typeName) {
        pushMdxIssue(issues, {
          statement: `<ApiReference definitionName="${definitionName}" /> does not match the page's canonical typeName "${page.typeName}".`,
          reason: `Resource pages must use the exact typeName from pages.ts (always ending in "Props"). "${definitionName}" is a different type — even if it exists in the schema, it's not the root type for this page.`,
          suggestedFix: `Use <ApiReference definitionName="${page.typeName}" />.`
        });
      }
    }

    if (name === 'ReferenceableParams') {
      const resource = extractStringProp(tagText, 'resource') || extractStringProp(tagText, 'resourceType');
      if (!resource) {
        pushMdxIssue(issues, {
          statement: '<ReferenceableParams> is missing resource/resourceType.',
          reason: 'The component needs the Stacktape resource type string to find referenceable params.',
          suggestedFix: page.referenceableResourceType
            ? `Use <ReferenceableParams resource="${page.referenceableResourceType}" />.`
            : 'Remove the component or pass a valid resource type.'
        });
      } else if (!resourceTypesWithReferenceableParams.has(resource)) {
        pushMdxIssue(issues, {
          statement: `<ReferenceableParams resource="${resource}" /> references an unknown resource type.`,
          reason: `${resource} is not present in docs/.resources.json.`,
          suggestedFix: 'Use a resource type from docs/.resources.json or remove the component.'
        });
      }
    }

    if (name === 'CliCommandsApiReference') {
      const command = extractStringProp(tagText, 'command');
      if (!command) {
        pushMdxIssue(issues, {
          statement: '<CliCommandsApiReference> is missing command.',
          reason: 'The CLI reference component needs the command name to render the correct flags.',
          suggestedFix: page.cliCommand
            ? `Use <CliCommandsApiReference command="${page.cliCommand}" sortedArgs={...} />.`
            : 'Use the exact generated CLI reference snippet from the prompt.'
        });
      } else {
        if (!knownCliCommands.has(command)) {
          pushMdxIssue(issues, {
            statement: `<CliCommandsApiReference command="${command}" /> references an unknown CLI command.`,
            reason: `${command} is not present in src/config/cli/commands.ts.`,
            suggestedFix: 'Use a valid Stacktape command name.'
          });
        }
        if (page.cliCommand && command !== page.cliCommand) {
          pushMdxIssue(issues, {
            statement: `<CliCommandsApiReference command="${command}" /> does not match the page command.`,
            reason: `This page is configured for the ${page.cliCommand} command.`,
            suggestedFix: `Use command="${page.cliCommand}".`
          });
        }
      }
    }
  }

  // Heading hierarchy: "When NOT to use" must be a peer H2 of "When to use", never nested
  // as H3 under it. Same TOC-breaking pattern shows up reliably across resource page drafts;
  // catching it deterministically is cheaper than asking the LLM verifier to enforce.
  if (/^###\s+When\s+NOT\s+to\s+use\b/mi.test(draft)) {
    pushMdxIssue(issues, {
      statement: '"When NOT to use" is nested as `### When NOT to use` (H3); should be `## When NOT to use` (H2).',
      reason: '"When to use" and "When NOT to use" are PEER H2 decisions on resource pages. Nesting "When NOT to use" as H3 under "When to use" breaks the TOC and hides the negative-case guidance.',
      suggestedFix: 'Promote `### When NOT to use` to `## When NOT to use`.'
    });
  }

  return issues;
};

// Heuristic: detect fenced bash/sh code blocks that contain multiple alternative shell commands
// separated by `# comment` labels (the copy-button trap). One copy of the block produces a multi-
// command string with comment lines that don't run as input.
const findCommandLikeLineCounts = (blockBody: string): { commandCount: number; hasInternalCommentLabels: boolean } => {
  const lines = blockBody.split(/\r?\n/);
  let commandCount = 0;
  let hasInternalCommentLabels = false;
  let prevLineWasContinuation = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      prevLineWasContinuation = false;
      continue;
    }
    if (trimmed.startsWith('#')) {
      // Internal comment. Skip shebangs (`#!/...`) — those are part of the script.
      const isShebang = i === 0 && trimmed.startsWith('#!');
      if (!isShebang) hasInternalCommentLabels = true;
      prevLineWasContinuation = false;
      continue;
    }
    if (prevLineWasContinuation) {
      // Continuation of the previous command — don't count it as a new command.
      prevLineWasContinuation = trimmed.endsWith('\\');
      continue;
    }
    // Any non-comment, non-continuation, non-empty line in a shell block counts as a command
    // start. We don't try to disambiguate "command vs output" because that's surprisingly
    // error-prone (e.g. `stacktape` starts with `stack` which would false-positive as a stack
    // trace marker). The cost of over-flagging is low — the writer can split the block, and
    // the rare case of legitimate output goes in a separate fenced block anyway.
    const looksLikeCommand = trimmed.length > 0;
    if (looksLikeCommand) {
      commandCount += 1;
    }
    prevLineWasContinuation = trimmed.endsWith('\\');
  }
  return { commandCount, hasInternalCommentLabels };
};

export const validateShellCommandBlocks = ({ draft }: { draft: string }): CodeValidationIssue[] => {
  const issues: CodeValidationIssue[] = [];
  const fenceRegex = /```(?:bash|sh|shell|zsh)\s*\r?\n([\s\S]*?)\r?\n```/g;
  let blockIndex = 0;
  for (const match of draft.matchAll(fenceRegex)) {
    blockIndex += 1;
    const body = match[1];
    const { commandCount, hasInternalCommentLabels } = findCommandLikeLineCounts(body);
    if (commandCount >= 2 && hasInternalCommentLabels) {
      // The "two commands + label comments" combo is the copy-button trap.
      issues.push({
        severity: 'medium',
        type: 'incorrect-claim',
        statement: `Shell code block #${blockIndex}: multiple alternative commands grouped in one fenced block with \`#\` comment labels (copy-button trap).`,
        reason:
          'Copy-button copies the entire block as a single string; the user pastes two commands + comment lines and the second invocation fails. Each alternative invocation deserves its own fenced block with prose between them.',
        suggestedFix:
          'Split into one fenced bash block per command. Move the explanatory `# comment` labels out of the block into a prose sentence above each block.'
      });
    } else if (commandCount >= 1 && hasInternalCommentLabels) {
      issues.push({
        severity: 'low',
        type: 'ambiguous-claim',
        statement: `Shell code block #${blockIndex}: contains \`#\` comment label inside the block to explain the command.`,
        reason:
          'Comments inside a shell snippet leak into the copy buffer. Explanations belong in prose outside the block.',
        suggestedFix: 'Move the explanation out of the code block into a prose sentence directly above it.'
      });
    }
  }
  return issues;
};

export const validateStacktapeConfigExamples = async ({ draft }: { draft: string }): Promise<CodeValidationIssue[]> => {
  const knownExports = await loadKnownExports();
  const blocks = extractCodeBlocks(draft);
  const issues: CodeValidationIssue[] = [];

  if (blocks.length === 0) {
    return issues;
  }

  for (const block of blocks) {
    const blockLabel = `<CodeBlock intellisense> #${block.index} (${block.label})`;

    // Enforce canonical tab label across all Stacktape config examples. Past drafts drifted between
    // 'TypeScript' and 'stacktape.ts'; the canonical label is 'TypeScript'.
    if (block.label !== 'TypeScript') {
      issues.push({
        severity: 'medium',
        type: 'incorrect-claim',
        statement: `${blockLabel}: non-canonical tab label.`,
        reason: `Stacktape config CodeBlock tabs must use label: 'TypeScript' (received '${block.label}').`,
        suggestedFix: "Rename the tab label to 'TypeScript'."
      });
    }

    const sourceFile = ts.createSourceFile(
      `code-block-${block.index}.ts`,
      block.code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // 1. Syntax diagnostics from the parser.
    const syntacticDiagnostics =
      (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || [];
    for (const diag of syntacticDiagnostics) {
      issues.push({
        severity: 'high',
        type: 'incorrect-claim',
        statement: `${blockLabel}: TypeScript parse error.`,
        reason: formatDiagnostic(diag),
        suggestedFix:
          'Fix the syntax in the code field. The example must be valid TypeScript that compiles in a stacktape.ts file.'
      });
    }

    // 2. Semantic diagnostics from the same public Stacktape declaration files that Twoslash loads.
    for (const diag of typeCheckStacktapeExample(block)) {
      issues.push({
        severity: 'high',
        type: 'incorrect-claim',
        statement: `${blockLabel}: TypeScript type error.`,
        reason: formatDiagnostic(diag),
        suggestedFix:
          'Fix the example so it type-checks against the public Stacktape TypeScript declarations. The full hidden source must be a valid stacktape.ts file.'
      });
    }

    // Prettier formatting is auto-applied via autoFormatStacktapeBlocksInDraft before the
    // draft hits reviewers/verifiers, so a residual mismatch here means the auto-format
    // couldn't parse the block. Surface as low severity, not high — never block on this.
    let formattedCode: string | null = null;
    try {
      formattedCode = await formatStacktapeExample(block.rawCode);
    } catch {
      // Parser already raised a high-severity syntax issue above; skip.
    }
    if (formattedCode !== null && block.rawCode.trim() !== formattedCode.trim()) {
      issues.push({
        severity: 'low',
        type: 'ambiguous-claim',
        statement: `${blockLabel}: code is not Prettier-formatted (auto-format may have skipped it).`,
        reason: 'Stacktape config examples are auto-formatted with Prettier before review. A residual mismatch likely means the block had a syntax issue at format time.',
        suggestedFix: 'Fix any TypeScript syntax errors; auto-format will then handle the formatting.'
      });
    }

    const generatedYaml = convertTypescriptToYaml(block.code);
    if (!generatedYaml) {
      issues.push({
        severity: 'medium',
        type: 'ambiguous-claim',
        statement: `${blockLabel}: cannot generate YAML tab from TypeScript source.`,
        reason:
          'The TypeScript example parsed and type-checked, but the docs YAML converter could not derive a YAML tab. This may be a docs-converter coverage gap for valid class-based config.',
        suggestedFix:
          'If the example is valid Stacktape TypeScript, extend the YAML converter for this class/property shape. Otherwise simplify the example to a converter-supported class-based defineConfig shape.'
      });
    } else {
      const roundTripTypescript = convertYamlToTypescript(generatedYaml);
      if (!roundTripTypescript) {
        issues.push({
          severity: 'medium',
          type: 'ambiguous-claim',
          statement: `${blockLabel}: generated YAML tab cannot convert back to TypeScript.`,
          reason:
            'The generated YAML must stay compatible with the docs YAML conversion helper and Stacktape config schema, but this can be a converter limitation rather than a page-quality failure.',
          suggestedFix: 'Simplify the example or fix the YAML conversion helper for the config shape used here.'
        });
      } else {
        for (const diag of typeCheckStacktapeExample({ ...block, code: roundTripTypescript })) {
          issues.push({
            severity: 'medium',
            type: 'ambiguous-claim',
            statement: `${blockLabel}: generated YAML tab does not round-trip to type-correct TypeScript.`,
            reason: formatDiagnostic(diag),
            suggestedFix:
              'Fix the TypeScript example or the YAML conversion helper so the generated YAML describes the same valid Stacktape config.'
          });
        }
      }
    }

    // 3. Structural assertions.
    if (!hasStacktapeImport(sourceFile)) {
      issues.push({
        severity: 'high',
        type: 'unsupported-claim',
        statement: `${blockLabel}: missing \`import ... from 'stacktape'\`.`,
        reason: "Stacktape config examples must import classes/helpers from 'stacktape'.",
        suggestedFix:
          "Add an import like `import { defineConfig, LambdaFunction, ... } from 'stacktape';` at the top of the example."
      });
    }
    if (hasStacktapeImport(sourceFile) && block.hasVisibleStacktapeImport) {
      issues.push({
        severity: 'high',
        type: 'unsupported-claim',
        statement: `${blockLabel}: visible Stacktape import boilerplate.`,
        reason:
          'Configuration examples need imports in the hidden full source for TypeScript correctness, but the rendered snippet should focus on the relevant config.',
        suggestedFix:
          'Keep the import in the code string, but hide it with `[!code focus-start]` / `[!code focus-end]` markers around the relevant config lines.'
      });
    }

    if (!hasDefineConfigCall(sourceFile)) {
      issues.push({
        severity: 'high',
        type: 'unsupported-claim',
        statement: `${blockLabel}: missing \`defineConfig(...)\` call.`,
        reason:
          'Stacktape config examples must wrap their resources in `defineConfig(() => { ... })` and `export default` the result.',
        suggestedFix: 'Wrap the example body in `export default defineConfig(() => { ... })`.'
      });
    }

    if (!hasExportDefault(sourceFile)) {
      issues.push({
        severity: 'high',
        type: 'unsupported-claim',
        statement: `${blockLabel}: missing \`export default\`.`,
        reason: 'A stacktape.ts file must default-export the result of `defineConfig(...)`.',
        suggestedFix: 'Add `export default defineConfig(() => { ... });`.'
      });
    }

    // 4. Class name whitelist check (catches typos like `LambdaFn` or `WebSrv`).
    const instantiatedNames = collectInstantiatedClassNames(sourceFile);
    for (const name of instantiatedNames) {
      if (!knownExports.has(name)) {
        issues.push({
          severity: 'medium',
          type: 'incorrect-claim',
          statement: `${blockLabel}: \`new ${name}(...)\` references an unknown class.`,
          reason: `\`${name}\` is not exported by the \`stacktape\` package.`,
          suggestedFix: `Use one of the documented Stacktape resource classes (e.g. LambdaFunction, WebService, RelationalDatabase). If \`${name}\` is meant to be a custom class, define it in the example or remove the example.`
        });
      }
    }
  }

  return issues;
};

// Auto-format every Stacktape <CodeBlock intellisense> code field in the draft using Prettier.
// Called by the pipeline before reviewers/verifiers see the draft, so the writer never has to
// produce Prettier-perfect code (LLMs are unreliable at this) and the code-block-validator's
// prettier check stays as a low-severity safety net for blocks that fail to parse.
export const autoFormatStacktapeBlocksInDraft = async (
  draft: string
): Promise<{ draft: string; formattedBlockCount: number }> => {
  const blocks = extractCodeBlocks(draft);
  let result = draft;
  let formattedBlockCount = 0;
  for (const block of blocks) {
    let formatted: string;
    try {
      formatted = await formatStacktapeExample(block.rawCode);
    } catch {
      // Block has syntax errors — let the validator surface those as high-severity issues.
      continue;
    }
    if (formatted.trim() === block.rawCode.trim()) continue;
    // Replace the first occurrence of the original rawCode substring with the formatted one.
    // rawCode is multi-line and contains the full template-literal body, so collisions are
    // extremely unlikely in practice.
    const idx = result.indexOf(block.rawCode);
    if (idx === -1) continue;
    result = result.slice(0, idx) + formatted + result.slice(idx + block.rawCode.length);
    formattedBlockCount += 1;
  }
  return { draft: result, formattedBlockCount };
};
