import { dirname, relative } from 'node:path';
import { transformToUnixPath } from '../fs/files';
import { getJavaPackageName } from '../fs/files';
import type { SupportedPythonRunAppAs } from '@stacktape/config/deployment-artifacts';
import type { SupportedEsPackageManager } from '../runtime-contracts';
import { getInstallDependenciesCommand, getInstallPackageManagerCommand } from '../es/package-manager-install';

const quotePosixShellArgument = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`;

/**
 * Generates a simplified Dockerfile for dev mode.
 * - Single stage (no multi-stage build)
 * - No code COPY - code is mounted as volume at runtime
 * - Still installs native deps the same way as production for parity
 */
export const buildEsDevDockerfile = ({
  dependencies,
  packageManager,
  requiresGlibcBinaries,
  nodeVersion
}: {
  dependencies: { name: string; version: string }[];
  requiresGlibcBinaries: boolean;
  packageManager: SupportedEsPackageManager;
  nodeVersion: number;
}) => {
  const installDepsCommand = getInstallDependenciesCommand({
    dependencies,
    packageManager
  });
  const installPackageManagerCommand = getInstallPackageManagerCommand(packageManager);
  const baseImage = requiresGlibcBinaries
    ? `public.ecr.aws/docker/library/node:${nodeVersion}${dependencies.length ? '-bookworm' : '-bookworm-slim'}`
    : `public.ecr.aws/docker/library/node:${nodeVersion}-alpine`;

  // Dev mode bind-mounts the freshly bundled code at /app/dist, so dependencies installed into
  // /app/node_modules stay visible: Node's resolution (CJS and ESM alike) walks up from
  // /app/dist/index.js into /app. Mounting over /app itself would shadow the install layer.
  if (requiresGlibcBinaries) {
    return `FROM ${baseImage}

RUN apt-get update && apt-get install -y --no-install-recommends tini curl openssl \\
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["tini", "--"]

WORKDIR /app
${installPackageManagerCommand}${installDepsCommand}

CMD ["node", "--max-old-space-size=16384", "dist/index.js"]`;
  }

  // Alpine version - no deps
  if (!dependencies.length) {
    return `FROM ${baseImage}

RUN apk add --no-cache tini curl openssl

ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app

CMD ["node", "--max-old-space-size=16384", "dist/index.js"]`;
  }

  // Alpine version - with deps (need build tools for native modules). Same root-level install as
  // the glibc branch: /app is shadowed by the dev bind mount.
  return `FROM ${baseImage}

RUN apk add --no-cache tini curl openssl python3 make g++

ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
${installPackageManagerCommand}${installDepsCommand}

CMD ["node", "--max-old-space-size=16384", "dist/index.js"]`;
};

export const buildEsDockerfile = ({
  dependencies,
  packageManager,
  requiresGlibcBinaries,
  customDockerBuildCommands,
  nodeVersion
}: {
  dependencies: { name: string; version: string }[];
  requiresGlibcBinaries: boolean;
  packageManager: SupportedEsPackageManager;
  customDockerBuildCommands?: string[] | undefined;
  nodeVersion: number;
}) => {
  const installDepsCommand = getInstallDependenciesCommand({
    dependencies,
    packageManager
  });
  const installPackageManagerCommand = getInstallPackageManagerCommand(packageManager);

  if (!dependencies.length) {
    const baseImage = requiresGlibcBinaries
      ? `public.ecr.aws/docker/library/node:${nodeVersion}-bookworm-slim`
      : `public.ecr.aws/docker/library/node:${nodeVersion}-alpine`;
    const installRuntimeTools = requiresGlibcBinaries
      ? `RUN apt-get update && apt-get install -y --no-install-recommends tini curl openssl \\
    && rm -rf /var/lib/apt/lists/*`
      : 'RUN apk add --no-cache tini curl openssl';
    const tiniPath = requiresGlibcBinaries ? 'tini' : '/sbin/tini';
    return `FROM ${baseImage}

# correct process signal handling
${installRuntimeTools}
ENTRYPOINT ["${tiniPath}", "--"]

${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

COPY . /app
WORKDIR /app

ENV NODE_ENV production

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
  }

  if (requiresGlibcBinaries) {
    return `FROM public.ecr.aws/docker/library/node:${nodeVersion}-bookworm AS deps

WORKDIR /install-dir
COPY . /install-dir

${installPackageManagerCommand}${installDepsCommand}

FROM public.ecr.aws/docker/library/node:${nodeVersion}-bookworm-slim

# correct process signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini curl openssl \\
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["tini", "--"]

${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

COPY --from=deps /install-dir/ /app
WORKDIR /app

ENV NODE_ENV production

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
  }

  return `FROM public.ecr.aws/docker/library/node:${nodeVersion}-alpine AS deps

RUN apk add --no-cache python3 make g++

${
  // @this fixes: https://github.com/oven-sh/bun/issues/5545#issuecomment-1722461083
  packageManager === 'bun'
    ? `RUN apk add --no-cache ca-certificates wget
RUN if [[ $(uname -m) == "aarch64" ]] ; \\
    then \\
    # aarch64
    wget https://raw.githubusercontent.com/squishyu/alpine-pkg-glibc-aarch64-bin/master/glibc-2.26-r1.apk ; \\
    apk add --no-cache --allow-untrusted --force-overwrite glibc-2.26-r1.apk ; \\
    rm glibc-2.26-r1.apk ; \\
    else \\
    # x86_64
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.28-r0/glibc-2.28-r0.apk ; \\
    wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub ; \\
    apk add --no-cache --force-overwrite glibc-2.28-r0.apk ; \\
    rm glibc-2.28-r0.apk ; \\
    fi\n`
    : ''
}
WORKDIR /install-dir
COPY . /install-dir

${installPackageManagerCommand}${installDepsCommand}

# use minimal node package for security and size (slim version doesn't have npm or yarn)
FROM public.ecr.aws/docker/library/node:${nodeVersion}-alpine

# correct process signal handling
RUN apk add --no-cache tini curl openssl
ENTRYPOINT ["/sbin/tini", "--"]

${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

COPY --from=deps /install-dir/ /app
WORKDIR /app

ENV NODE_ENV production

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
};

// https://hub.docker.com/r/mhart/alpine-node/

export const buildPythonArtifactDockerfile = ({
  pythonVersion,
  minify,
  alpine,
  target = 'container'
}: {
  pythonVersion: number | string;
  minify?: boolean | undefined;
  alpine?: boolean | undefined;
  target?: 'container' | 'lambda' | undefined;
}) => {
  let baseImage =
    target === 'lambda'
      ? `public.ecr.aws/sam/build-python${pythonVersion}:latest`
      : `public.ecr.aws/docker/library/python:${pythonVersion}`;
  if (target === 'container' && alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand =
    target === 'lambda'
      ? ''
      : alpine
        ? 'RUN apk add --no-cache build-base'
        : 'RUN apt-get update && apt-get install -y build-essential';
  const installUvCommand = alpine ? 'RUN pip install uv' : 'RUN pip install uv';
  const installDepsCommand = `RUN set -e; \
compile_uv_args=""; \
for extra in $STP_PY_UV_OPTIONAL_DEPENDENCIES; do compile_uv_args="$compile_uv_args --extra $extra"; done; \
for group in $STP_PY_UV_WITH_GROUPS; do compile_uv_args="$compile_uv_args --group $group"; done; \
for group in $STP_PY_UV_WITHOUT_GROUPS; do compile_uv_args="$compile_uv_args --no-group $group"; done; \
for group in $STP_PY_UV_ONLY_GROUPS; do compile_uv_args="$compile_uv_args --only-group $group"; done; \
if [ -n "$STP_PY_DEP_FILE" ]; then \
  if [ "$STP_PY_DEP_TYPE" = "pipfile" ]; then \
    if [ ! -f Pipfile.lock ]; then uvx --from pipenv pipenv lock; fi; \
    uvx --from pipenv pipenv requirements > /tmp/requirements.txt; \
    uv pip install --system --target . -r /tmp/requirements.txt; \
  elif [ "$STP_PY_DEP_TYPE" = "pyproject" ]; then \
    uv pip compile "$STP_PY_DEP_FILE" $compile_uv_args -o /tmp/requirements.txt; \
    uv pip install --system --target . -r /tmp/requirements.txt; \
  elif [ "$STP_PY_DEP_TYPE" = "uv-lock" ]; then \
    uv export --locked --no-dev --no-emit-project $compile_uv_args -o /tmp/requirements.txt; \
    uv pip install --system --target . -r /tmp/requirements.txt; \
  else \
    uv pip install --system --target . -r "$STP_PY_DEP_FILE"; \
  fi; \
fi`;
  const minifyCommand = `RUN uv pip install --system python-minifier
RUN pyminify . --in-place`;

  const dockerfile = `FROM ${baseImage} AS build

ARG STP_PY_DEP_FILE
ARG STP_PY_DEP_TYPE
ARG STP_PY_UV_OPTIONAL_DEPENDENCIES
ARG STP_PY_UV_WITH_GROUPS
ARG STP_PY_UV_WITHOUT_GROUPS
ARG STP_PY_UV_ONLY_GROUPS

RUN mkdir /dist
COPY ./ /dist
WORKDIR /dist

${installUvCommand}
${systemDepsCommand}
${minify ? minifyCommand : ''}
${installDepsCommand}

FROM scratch AS artifact
COPY --from=build /dist .
`;
  return dockerfile;
};

export const buildJavaArtifactDockerfile = ({
  javaVersion = 11,
  useMaven,
  alpine,
  initScriptFileName,
  modulePath = '.',
  target = 'container'
}: {
  javaVersion: number;
  useMaven?: boolean | undefined;
  alpine?: boolean | undefined;
  initScriptFileName?: string | undefined;
  modulePath?: string | undefined;
  target?: 'container' | 'lambda' | undefined;
}) => {
  const lambdaBuildImage = `public.ecr.aws/sam/build-java${javaVersion}:latest`;
  if (useMaven) {
    const mavenBuildImage =
      target === 'lambda' ? lambdaBuildImage : `public.ecr.aws/docker/library/maven:3.9-eclipse-temurin-${javaVersion}`;
    const quotedModulePath = quotePosixShellArgument(modulePath);
    return `FROM ${mavenBuildImage} AS build

WORKDIR /src
COPY . .
RUN mvn --batch-mode --no-transfer-progress -pl ${quotedModulePath} -am -DskipTests package \\
    dependency:copy-dependencies -DoutputDirectory=/dist/lib
RUN mkdir -p /dist && cp -R ${quotePosixShellArgument(`${modulePath}/target/classes/.`)} /dist/

FROM scratch AS artifact
COPY --from=build /dist .
`;
  }
  const gradleVersion = javaVersion >= 25 ? '' : javaVersion >= 21 ? '8.14-' : '8.5-';
  let baseImage =
    target === 'lambda' ? lambdaBuildImage : `public.ecr.aws/docker/library/gradle:${gradleVersion}jdk${javaVersion}`;
  if (target === 'container' && alpine) {
    baseImage += '-alpine';
  }
  if (!initScriptFileName) {
    throw new Error('A Gradle init script is required for Java Gradle artifact builds.');
  }
  const createDist = `RUN gradle stacktapeDist -PstacktapeTargetDir=${quotePosixShellArgument(modulePath)} --init-script ${initScriptFileName}`;

  return `FROM ${baseImage} AS build

RUN mkdir /dist
COPY . /dist
WORKDIR /dist
${createDist}

FROM scratch AS artifact
COPY --from=build /dist/dist .
`;
};

export const buildGoArtifactDockerfile = ({
  alpine,
  entryfilePath,
  artifactSourcePath = '.'
}: {
  alpine: boolean;
  entryfilePath: string;
  artifactSourcePath?: string | undefined;
}) => {
  let baseImage = 'public.ecr.aws/docker/library/golang';
  if (alpine) {
    baseImage += ':alpine';
  }
  const entryDirectory = transformToUnixPath(dirname(entryfilePath));
  const buildTarget = entryDirectory === '.' ? '.' : `./${entryDirectory}`;
  const lambdaLibraryCommand = 'RUN if [ -f go.mod ]; then go mod download; fi';
  const buildCommand = `RUN CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -trimpath -ldflags="-s -w" -o /bootstrap -- ${quotePosixShellArgument(buildTarget)}`;
  const artifactSource = artifactSourcePath === '.' ? '/dist/.' : `/dist/${artifactSourcePath}/.`;
  const prepareArtifactCommand = `RUN mkdir /artifact && cp -R ${quotePosixShellArgument(artifactSource)} /artifact && \
    find /artifact -type f \\( -name '*.go' -o -name 'go.mod' -o -name 'go.sum' -o -name 'go.work' -o -name 'go.work.sum' \\) -delete && \
    cp /bootstrap /artifact/bootstrap`;

  return `FROM ${baseImage} AS build

RUN mkdir /dist
COPY . /dist
WORKDIR /dist
${lambdaLibraryCommand}
${buildCommand}
${prepareArtifactCommand}

FROM scratch AS artifact
COPY --from=build /artifact .
`;
};

export const buildPythonDockerfile = ({
  pythonVersion,
  entryfilePath,
  sourceRootPath,
  alpine,
  runAppAs,
  handler,
  customDockerBuildCommands
}: {
  pythonVersion: number | string;
  entryfilePath: string;
  sourceRootPath: string;
  alpine?: boolean | undefined;
  runAppAs?: SupportedPythonRunAppAs | undefined;
  handler?: string | undefined;
  customDockerBuildCommands?: string[] | undefined;
}) => {
  let additionalDependencies = '';
  let baseImage = `public.ecr.aws/docker/library/python:${pythonVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const scriptPath = transformToUnixPath(relative(sourceRootPath, entryfilePath)).replace(/^\.\//, '');
  let cmd = `CMD ["python", ${JSON.stringify(scriptPath)}]`;
  const moduleName = transformToUnixPath(relative(sourceRootPath, entryfilePath))
    .replace(/\.py$/, '')
    .replace(/^\.\//, '')
    .replace(/\//g, '.');

  if (runAppAs === 'ASGI') {
    additionalDependencies = 'RUN pip install uvicorn';
    cmd = `CMD ["sh", "-c", ${JSON.stringify(
      `exec python -m uvicorn ${quotePosixShellArgument(`${moduleName}:${handler}`)} --host 0.0.0.0 --port "$PORT"`
    )}]`;
  }
  if (runAppAs === 'WSGI') {
    additionalDependencies = 'RUN pip install gunicorn';
    cmd = `CMD ["sh", "-c", ${JSON.stringify(
      `exec python -m gunicorn --bind "0.0.0.0:$PORT" ${quotePosixShellArgument(`${moduleName}:${handler}`)}`
    )}]`;
  }

  return `FROM ${baseImage}
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app
ENV PYTHONPATH=/app
${additionalDependencies}
${cmd}
`;
};

export const buildJavaDockerfile = ({
  javaVersion,
  entryfilePath,
  alpine: _alpine,
  customDockerBuildCommands
}: {
  javaVersion: number;
  entryfilePath: string;
  alpine?: boolean | undefined;
  customDockerBuildCommands?: string[] | undefined;
}) => {
  const baseImage = `public.ecr.aws/amazoncorretto/amazoncorretto:${javaVersion}`;
  return `FROM ${baseImage}
RUN mkdir /app
COPY . /app
WORKDIR /app
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

CMD ["sh", "-c", ${JSON.stringify(
    `exec java -classpath "$CLASSPATH:/app/lib/*" ${quotePosixShellArgument(getJavaPackageName(entryfilePath))}`
  )}]
`;
};

export const buildGoDockerfile = ({
  alpine,
  customDockerBuildCommands
}: {
  alpine: boolean;
  customDockerBuildCommands?: string[] | undefined;
}) => {
  let baseImage = 'public.ecr.aws/docker/library/debian:bookworm-slim';
  if (alpine) {
    baseImage = 'public.ecr.aws/docker/library/alpine:3.19';
  }
  return `FROM ${baseImage}
RUN mkdir /app
COPY . /app
WORKDIR /app
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

RUN chmod +x /app/bootstrap

CMD ["./bootstrap"]
`;
};

export const buildRubyArtifactDockerfile = ({
  rubyVersion,
  alpine,
  target = 'container'
}: {
  rubyVersion: number;
  alpine?: boolean;
  target?: 'container' | 'lambda' | undefined;
}) => {
  const imageVersion = rubyVersion === 4 ? '4.0' : rubyVersion;
  let baseImage =
    target === 'lambda'
      ? `public.ecr.aws/sam/build-ruby${imageVersion}:latest`
      : `public.ecr.aws/docker/library/ruby:${imageVersion}`;
  if (target === 'container' && alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand =
    target === 'lambda'
      ? ''
      : alpine
        ? 'RUN apk add --no-cache build-base'
        : 'RUN apt-get update && apt-get install -y build-essential';
  const bundleInstallCommand = `RUN if [ -f Gemfile ] || [ -f gems.rb ]; then \
  gemfile=Gemfile; [ -f Gemfile ] || gemfile=gems.rb; \
  BUNDLE_APP_CONFIG=.bundle BUNDLE_GEMFILE="$gemfile" bundle config set --local path vendor/bundle && \
  BUNDLE_APP_CONFIG=.bundle BUNDLE_GEMFILE="$gemfile" bundle config set --local without 'development test' && \
  BUNDLE_APP_CONFIG=.bundle BUNDLE_GEMFILE="$gemfile" bundle install; \
fi`;

  return `FROM ${baseImage} AS build

${systemDepsCommand}

RUN mkdir /dist
COPY ./ /dist
WORKDIR /dist

${bundleInstallCommand}

FROM scratch AS artifact
COPY --from=build /dist .
`;
};

export const buildRubyDockerfile = ({
  rubyVersion,
  entryfilePath,
  alpine,
  customDockerBuildCommands
}: {
  rubyVersion: number;
  entryfilePath: string;
  alpine?: boolean | undefined;
  customDockerBuildCommands?: string[] | undefined;
}) => {
  let baseImage = `public.ecr.aws/docker/library/ruby:${rubyVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const scriptPath = transformToUnixPath(entryfilePath);
  const runCommand =
    'if [ -f Gemfile ]; then exec bundle exec ruby "$0"; ' +
    'elif [ -f gems.rb ]; then exec env BUNDLE_GEMFILE=gems.rb bundle exec ruby "$0"; ' +
    'else exec ruby "$0"; fi';
  const cmd = `CMD ["sh", "-c", ${JSON.stringify(runCommand)}, ${JSON.stringify(scriptPath)}]`;

  return `FROM ${baseImage}
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app

ENV BUNDLE_APP_CONFIG=/app/.bundle
ENV BUNDLE_PATH=/app/vendor/bundle

${cmd}
`;
};

export const buildPhpArtifactDockerfile = ({ phpVersion, alpine }: { phpVersion: number; alpine?: boolean }) => {
  let baseImage = `public.ecr.aws/docker/library/php:${phpVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand = alpine
    ? 'RUN apk add --no-cache git unzip'
    : 'RUN apt-get update && apt-get install -y git unzip';
  const composerInstallCommand = `RUN if [ -f composer.json ]; then \
  composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader; \
fi`;

  return `FROM composer:2 AS composer
FROM ${baseImage} AS build

${systemDepsCommand}
COPY --from=composer /usr/bin/composer /usr/local/bin/composer

RUN mkdir /dist
COPY ./ /dist
WORKDIR /dist

${composerInstallCommand}

FROM scratch AS artifact
COPY --from=build /dist .
`;
};

export const buildPhpDockerfile = ({
  phpVersion,
  entryfilePath,
  alpine,
  customDockerBuildCommands
}: {
  phpVersion: number;
  entryfilePath: string;
  alpine?: boolean | undefined;
  customDockerBuildCommands?: string[] | undefined;
}) => {
  let baseImage = `public.ecr.aws/docker/library/php:${phpVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const scriptPath = transformToUnixPath(entryfilePath);
  return `FROM ${baseImage}
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app

CMD ["php", ${JSON.stringify(scriptPath)}]
`;
};

export const DOTNET_ASSEMBLY_NAME_FILE = '.stacktape-assembly-name';

export const buildDotnetArtifactDockerfile = ({
  dotnetVersion,
  projectFilePath,
  target = 'container'
}: {
  dotnetVersion: number;
  projectFilePath: string;
  target?: 'container' | 'lambda' | undefined;
}) => {
  const sdkVersion = `${dotnetVersion}.0`;
  const baseImage =
    target === 'lambda'
      ? `public.ecr.aws/sam/build-dotnet${dotnetVersion}:latest`
      : `mcr.microsoft.com/dotnet/sdk:${sdkVersion}`;

  return `FROM ${baseImage} AS build

WORKDIR /src
COPY . .

RUN dotnet restore "${projectFilePath}"
RUN printf '%s\\n' '<Project>' '  <Target Name="StacktapePrintAssemblyName">' '    <Message Text="STACKTAPE_ASSEMBLY_NAME=$(AssemblyName)" Importance="High" />' '  </Target>' '</Project>' > /tmp/stacktape-assembly-name.targets
RUN dotnet msbuild "${projectFilePath}" -nologo -t:StacktapePrintAssemblyName -p:CustomAfterMicrosoftCommonTargets=/tmp/stacktape-assembly-name.targets | sed -n 's/.*STACKTAPE_ASSEMBLY_NAME=//p' | tail -n 1 > /tmp/${DOTNET_ASSEMBLY_NAME_FILE} && test -s /tmp/${DOTNET_ASSEMBLY_NAME_FILE}
RUN dotnet publish "${projectFilePath}" -c Release -o /dist
RUN mv /tmp/${DOTNET_ASSEMBLY_NAME_FILE} /dist/${DOTNET_ASSEMBLY_NAME_FILE}

FROM scratch AS artifact
COPY --from=build /dist .
`;
};

export const buildDotnetDockerfile = ({
  dotnetVersion,
  assemblyName,
  customDockerBuildCommands
}: {
  dotnetVersion: number;
  assemblyName: string;
  customDockerBuildCommands?: string[] | undefined;
}) => {
  const runtimeVersion = `${dotnetVersion}.0`;
  const baseImage = `mcr.microsoft.com/dotnet/aspnet:${runtimeVersion}`;

  return `FROM ${baseImage}
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app

CMD ["dotnet", "${assemblyName}.dll"]
`;
};
