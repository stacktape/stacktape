import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { buildDotnetArtifact } from '../bundlers/dotnet';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { DotnetBuildpackConfig, SupportedDotnetVersion } from '@stacktape/config/deployment-artifacts';
import { findNearestProjectRoot, resolveExplicitProjectRoot } from './project-root';

type DotnetLambdaLocation = { cwd: string; entryfilePath: string; projectFile?: string | undefined };

/** The `.csproj` the build uses: `dotnet.projectFile`, or the first one in the nearest directory that has one. */
const findDotnetProjectFile = ({ cwd, entryfilePath, projectFile }: DotnetLambdaLocation) => {
  if (projectFile) return isAbsolute(projectFile) ? projectFile : join(cwd, projectFile);
  const projectRoot = findNearestProjectRoot({
    cwd,
    entryfilePath,
    markerFiles: [],
    markerFileExtensions: ['.csproj']
  });
  const projectFileName = existsSync(projectRoot)
    ? readdirSync(projectRoot)
        .filter((name) => name.endsWith('.csproj'))
        .toSorted()[0]
    : undefined;
  return projectFileName ? join(projectRoot, projectFileName) : undefined;
};

/** The project's `AssemblyName`, or the project file's name, which .NET uses when the project sets none. */
const getDotnetAssemblyName = (projectFilePath: string) => {
  const declared = existsSync(projectFilePath)
    ? readFileSync(projectFilePath, 'utf8').match(/<AssemblyName>\s*([^<$]+?)\s*<\/AssemblyName>/)?.[1]
    : undefined;
  return declared ?? basename(projectFilePath, '.csproj');
};

const stripCSharpComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/**
 * Lambda's handler for a .NET function: `Assembly::Namespace.Class::FunctionHandler`. The assembly comes from the
 * project, the namespace from the entry file, and the class is the one named like the file (otherwise the file's first
 * class). `handlerFunction` names the method (`FunctionHandler` by default); a value with `::` is a complete handler
 * and is used as written. An entry file with top-level statements and no class is an executable assembly, whose
 * handler is the assembly name.
 */
export const getDotnetLambdaHandler = ({
  handlerFunction = 'FunctionHandler',
  ...location
}: DotnetLambdaLocation & { handlerFunction?: string | undefined }) => {
  if (handlerFunction.includes('::')) return handlerFunction;
  const absoluteEntryfilePath = isAbsolute(location.entryfilePath)
    ? location.entryfilePath
    : join(location.cwd, location.entryfilePath);
  const projectFilePath = findDotnetProjectFile(location);
  const fileName = basename(absoluteEntryfilePath, '.cs');
  const assemblyName = projectFilePath
    ? getDotnetAssemblyName(projectFilePath)
    : basename(dirname(absoluteEntryfilePath));
  const source = existsSync(absoluteEntryfilePath)
    ? stripCSharpComments(readFileSync(absoluteEntryfilePath, 'utf8'))
    : '';
  const namespace = source.match(/^\s*namespace\s+([\w.]+)/m)?.[1];
  const classNames = [...source.matchAll(/\bclass\s+(\w+)/g)].map((match) => match[1]!);
  if (source && !classNames.length && !namespace) return assemblyName;
  const className = classNames.includes(fileName) ? fileName : (classNames[0] ?? fileName);
  return `${assemblyName}::${namespace ? `${namespace}.` : ''}${className}::${handlerFunction}`;
};

export const buildDotnetLambda = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  dotnet: languageSpecificConfig,
  dotnetVersion,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    dotnet?: DotnetBuildpackConfig | undefined;
    /**
     * The version of the function's Lambda runtime, the one the template deploys. There is no default here: a default
     * of its own let the build use another version than the runtime, and native dependencies then failed to load.
     */
    dotnetVersion: SupportedDotnetVersion;
  }): Promise<PackagingOutput> => {
  const absoluteSourcePath = languageSpecificConfig?.projectFile
    ? resolveExplicitProjectRoot({ cwd, projectFile: languageSpecificConfig.projectFile })
    : findNearestProjectRoot({
        cwd,
        entryfilePath,
        markerFiles: ['Directory.Build.props'],
        markerFileExtensions: ['.csproj']
      });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildDotnetArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    lambdaZip: true,
    sourcePath: absoluteSourcePath,
    dotnetVersion,
    entryfilePath: absoluteEntryfilePath,
    rawEntryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    cwd,
    languageSpecificConfig,
    target: 'lambda'
  });

  if (outcome === 'skipped') {
    return { ...otherOutputProps, digest, outcome, size: null, jobName: name };
  }

  const { unzippedSize, zippedSize, artifactPath } = await createLambdaZipArtifact({
    name,
    distFolderPath,
    digest,
    sizeLimit,
    archiveItem: otherProps.archiveItem,
    createPackagingError: otherProps.createPackagingError,
    progressLogger
  });

  return {
    digest,
    outcome,
    zippedSize,
    size: unzippedSize,
    artifactPath,
    details: { ...otherOutputProps },
    sourceFiles: otherOutputProps.sourceFiles,
    jobName: name
  };
};
