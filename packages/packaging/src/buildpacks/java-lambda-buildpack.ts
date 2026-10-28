import type { LambdaArtifactActions, StpBuildpackInput } from '../runtime-contracts';
import type { PackagingOutput } from '../runtime-contracts';
import { existsSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';
import { buildJavaArtifact } from '../bundlers/java';
import { createLambdaZipArtifact } from '../artifact/lambda-artifact';
import type { JavaBuildpackConfig, SupportedJavaVersion } from '@stacktape/config/deployment-artifacts';
import { findJavaProjectRoots, usesMaven } from './project-root';

type JavaLambdaLocation = { cwd: string; entryfilePath: string };

/** Comments are removed first, so that a license header that mentions a package is not read as the declaration. */
const stripJavaComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/**
 * The fully qualified class of the entry file: its `package` declaration and its file name, `com.example.Handler`
 * for `src/main/java/com/example/Handler.java`. A file without a declaration is in the default package. When the file
 * cannot be read, the path below `src/main/java` gives the package, as Maven and Gradle lay out sources.
 */
export const getJavaLambdaHandlerClass = ({ cwd, entryfilePath }: JavaLambdaLocation) => {
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);
  const className = basename(absoluteEntryfilePath, '.java');
  if (existsSync(absoluteEntryfilePath)) {
    const source = stripJavaComments(readFileSync(absoluteEntryfilePath, 'utf8'));
    const packageName = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    return packageName ? `${packageName}.${className}` : className;
  }
  const pathInSourceRoot = absoluteEntryfilePath.replaceAll('\\', '/').split('/src/main/java/')[1];
  return pathInSourceRoot ? pathInSourceRoot.replace(/\.java$/, '').replaceAll('/', '.') : className;
};

/**
 * Lambda's handler for a Java function: `com.example.Handler::handleRequest`. `handlerFunction` names the method
 * (`handleRequest` by default). A capitalized name such as `TaxHandler` is a class of the entry file's package with
 * `handleRequest`, `Other::method` names another class of that package, and a qualified `com.example.Other::method`
 * is used as written.
 */
export const getJavaLambdaHandler = ({
  handlerFunction = 'handleRequest',
  ...location
}: JavaLambdaLocation & { handlerFunction?: string | undefined }) => {
  const entryClass = getJavaLambdaHandlerClass(location);
  const packagePrefix = entryClass.slice(0, entryClass.lastIndexOf('.') + 1);
  // Java methods start lowercase and classes uppercase, so a capitalized name is a class of the entry file's package.
  if (/^[A-Z][\w$]*$/.test(handlerFunction)) return `${packagePrefix}${handlerFunction}::handleRequest`;
  if (!handlerFunction.includes('::')) return `${entryClass}::${handlerFunction}`;
  const className = handlerFunction.slice(0, handlerFunction.indexOf('::'));
  if (className.includes('.')) return handlerFunction;
  return `${packagePrefix}${handlerFunction}`;
};

export const buildJavaLambda = async ({
  progressLogger,
  name,
  entryfilePath,
  sizeLimit,
  java: languageSpecificConfig,
  javaVersion,
  cwd,
  ...otherProps
}: StpBuildpackInput &
  LambdaArtifactActions & {
    java?: JavaBuildpackConfig | undefined;
    /**
     * The version of the function's Lambda runtime, the one the template deploys. There is no default here: a default
     * of its own let the build use another version than the runtime, and native dependencies then failed to load.
     */
    javaVersion: SupportedJavaVersion;
  }): Promise<PackagingOutput> => {
  const useMaven =
    languageSpecificConfig?.useMaven ??
    languageSpecificConfig?.packageManagerFile?.endsWith('pom.xml') ??
    usesMaven({ cwd, entryfilePath });
  const { buildRoot: rootSourcePath } = findJavaProjectRoots({
    cwd,
    entryfilePath,
    useMaven,
    explicitProjectFile: languageSpecificConfig?.packageManagerFile
  });
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? entryfilePath : join(cwd, entryfilePath);

  const { digest, outcome, distFolderPath, ...otherOutputProps } = await buildJavaArtifact({
    ...otherProps,
    distFolderPath: otherProps.distFolderPath,
    lambdaZip: true,
    javaVersion,
    useMaven,
    sourcePath: rootSourcePath,
    entryfilePath: absoluteEntryfilePath,
    name,
    progressLogger,
    rawEntryfilePath: absoluteEntryfilePath,
    cwd,
    languageSpecificConfig,
    target: 'lambda',
    // JNI dependencies packaged for Lambda must target glibc rather than Alpine/musl.
    requiresGlibcBinaries: true
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
