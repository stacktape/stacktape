import { basename, relative } from 'node:path';
import { getJavaPackageName, transformToUnixPath } from './fs-utils';

const getInstallDepsCommand = ({
  dependencies,
  packageManager
}: {
  dependencies: { name: string; version: string }[];
  packageManager: SupportedEsPackageManager;
}) => {
  if (!dependencies.length) {
    return '';
  }
  const installCmd = packageManager === 'npm' ? 'install --save' : 'add';
  const depsList = dependencies.map(({ name, version }) => `${name}@${version}`).join(' ');
  return `RUN ${packageManager} ${installCmd} ${depsList}`;
};

const getInstallPackageManagerCommand = (packageManager: SupportedEsPackageManager) => {
  if (packageManager === 'pnpm') {
    return 'RUN npm install -g pnpm\n';
  }
  if (packageManager === 'yarn') {
    return 'RUN command -v yarn >/dev/null 2>&1 || npm install -g yarn\n';
  }
  if (packageManager === 'deno') {
    return 'RUN npm install -g deno\n';
  }
  if (packageManager === 'bun') {
    return 'RUN npm install -g bun\n';
  }
  return '';
};

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
  const installDepsCommand = getInstallDepsCommand({ dependencies, packageManager });
  const installPackageManagerCommand = getInstallPackageManagerCommand(packageManager);
  const baseImage = requiresGlibcBinaries
    ? `public.ecr.aws/docker/library/node:${nodeVersion}`
    : `public.ecr.aws/docker/library/node:${nodeVersion}-alpine`;

  if (requiresGlibcBinaries) {
    return `FROM ${baseImage}

RUN apt-get update && apt-get install -y tini curl

ENTRYPOINT ["tini", "--"]

WORKDIR /app
${installPackageManagerCommand}${installDepsCommand}

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
  }

  // Alpine version - no deps
  if (!dependencies.length) {
    return `FROM ${baseImage}

RUN apk add --no-cache tini curl openssl

ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
  }

  // Alpine version - with deps (need build tools for native modules)
  return `FROM ${baseImage}

RUN apk add --no-cache tini curl openssl python3 make g++

ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
${installPackageManagerCommand}${installDepsCommand}

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
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
  customDockerBuildCommands?: string[];
  nodeVersion: number;
}) => {
  const installDepsCommand = getInstallDepsCommand({ dependencies, packageManager });
  const installPackageManagerCommand = getInstallPackageManagerCommand(packageManager);

  if (!dependencies.length) {
    return `FROM public.ecr.aws/docker/library/node:${nodeVersion}-alpine

# correct process signal handling
RUN apk add --no-cache tini curl openssl
ENTRYPOINT ["/sbin/tini", "--"]

${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

COPY . /app
WORKDIR /app

CMD ["node", "--max-old-space-size=16384", "index.js"]`;
  }

  if (requiresGlibcBinaries) {
    return `FROM public.ecr.aws/docker/library/node:${nodeVersion}

# correct process signal handling
RUN apt-get update
RUN apt-get install -y tini curl
ENTRYPOINT ["tini", "--"]

${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

COPY . /app
WORKDIR /app

${installPackageManagerCommand}${installDepsCommand}

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

export const buildEsBinInstallerDockerfile = ({
  installationDirName,
  packageManager,
  lambdaRuntimeVersion,
  dependencies
}: {
  installationDirName: string;
  packageManager: SupportedEsPackageManager;
  lambdaRuntimeVersion: number;
  dependencies: { name: string; version: string }[];
}) => {
  const baseImage = `public.ecr.aws/sam/build-nodejs${lambdaRuntimeVersion}.x`;
  const installDepsCommand = getInstallDepsCommand({ dependencies, packageManager });
  const installPackageManagerCommand = getInstallPackageManagerCommand(packageManager);

  return `FROM ${baseImage} AS build

RUN mkdir /${installationDirName}
WORKDIR /${installationDirName}

${installPackageManagerCommand}${installDepsCommand}

FROM scratch AS artifact
COPY --from=build /${installationDirName}/node_modules /node_modules`;
};

// https://hub.docker.com/r/mhart/alpine-node/

export const buildPythonArtifactDockerfile = ({
  pythonVersion,
  minify,
  alpine
}: {
  pythonVersion: number;
  minify?: boolean;
  alpine?: boolean;
}) => {
  let baseImage = `public.ecr.aws/docker/library/python:${pythonVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand = alpine
    ? 'RUN apk add --no-cache build-base'
    : 'RUN apt-get update && apt-get install -y build-essential';
  const installUvCommand = alpine ? 'RUN pip install uv' : 'RUN pip install uv';
  const installDepsCommand = `RUN if [ -n "$STP_PY_DEP_FILE" ]; then \
  if [ "$STP_PY_DEP_TYPE" = "pipfile" ]; then \
    uv pip compile --pipfile "$STP_PY_DEP_FILE" -o /tmp/requirements.txt; \
    uv pip install --system --target . -r /tmp/requirements.txt; \
  elif [ "$STP_PY_DEP_TYPE" = "pyproject" ]; then \
    uv pip compile "$STP_PY_DEP_FILE" -o /tmp/requirements.txt; \
    uv pip install --system --target . -r /tmp/requirements.txt; \
  elif [ "$STP_PY_DEP_TYPE" = "uv-lock" ]; then \
    uv pip install --system --target . -r "$STP_PY_DEP_FILE"; \
  else \
    uv pip install --system --target . -r "$STP_PY_DEP_FILE"; \
  fi; \
fi`;
  const minifyCommand = `RUN uv pip install --system python-minifier
RUN pyminify . --in-place`;

  const dockerfile = `FROM ${baseImage} AS build

ARG STP_PY_DEP_FILE
ARG STP_PY_DEP_TYPE

RUN mkdir /dist
COPY ./ ./dist
WORKDIR /dist

${installUvCommand}
${systemDepsCommand}
${installDepsCommand}
${minify ? minifyCommand : ''}

FROM scratch AS artifact
COPY --from=build /dist .
`;
  return dockerfile;
};

export const buildJavaArtifactDockerfile = ({
  javaVersion = 11,
  useMaven,
  alpine
}: {
  javaVersion: number;
  useMaven?: boolean;
  alpine?: boolean;
}) => {
  let baseImage = `public.ecr.aws/docker/library/gradle:8.5-jdk${javaVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const mavenToGradleCommand = 'RUN printf "1\\nno\\n" | gradle init --type pom';
  const createDist = 'RUN gradle stacktapeDist --init-script stp-init.gradle';

  return `FROM ${baseImage} AS build

RUN mkdir /dist
COPY . /dist
WORKDIR /dist
${useMaven ? mavenToGradleCommand : ''}
${createDist}

FROM scratch AS artifact
COPY --from=build /dist/dist .
`;
};

export const buildGoArtifactDockerfile = ({ alpine, entryfilePath }: { alpine: boolean; entryfilePath: string }) => {
  let baseImage = 'public.ecr.aws/docker/library/golang';
  if (alpine) {
    baseImage += ':alpine';
  }
  const lambdaLibraryCommand = 'RUN go get github.com/aws/aws-lambda-go/lambda';
  const buildCommand = `RUN CGO_ENABLED=0 GOOS=linux go build -o bootstrap ${basename(entryfilePath)}`;

  return `FROM ${baseImage} AS build

RUN mkdir /dist
COPY . /dist
WORKDIR /dist
${lambdaLibraryCommand}
${buildCommand}

FROM scratch AS artifact
COPY --from=build /dist .
`;
};

export const buildPythonDockerfile = ({
  pythonVersion,
  entryfilePath,
  packageManagerFile,
  alpine,
  runAppAs,
  handler,
  customDockerBuildCommands
}: {
  pythonVersion: number;
  entryfilePath: string;
  packageManagerFile?: string;
  alpine?: boolean;
  runAppAs?: SupportedPythonRunAppAs;
  handler?: string;
  customDockerBuildCommands?: string[];
}) => {
  let additionalDependencies = '';
  let baseImage = `public.ecr.aws/docker/library/python:${pythonVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  let cmd = `CMD ["python", "${basename(entryfilePath)}"]`;
  const moduleName = packageManagerFile
    ? transformToUnixPath(relative(packageManagerFile, entryfilePath))
        .replace('.py', '')
        .replace('../', '')
        .replace(/\//g, '.')
    : basename(entryfilePath).replace('.py', '');

  if (runAppAs === 'ASGI') {
    additionalDependencies = 'RUN pip install uvicorn';
    cmd = `CMD python -m uvicorn ${moduleName}:${handler} --host 0.0.0.0 --port $PORT`;
  }
  if (runAppAs === 'WSGI') {
    additionalDependencies = 'RUN pip install gunicorn';
    cmd = `CMD python -m gunicorn --bind 0.0.0.0:$PORT ${moduleName}:${handler}`;
  }

  return `FROM ${baseImage}
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app
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
  alpine?: boolean;
  customDockerBuildCommands?: string[];
}) => {
  const baseImage = `public.ecr.aws/amazoncorretto/amazoncorretto:${javaVersion}`;
  return `FROM ${baseImage}
RUN mkdir /app
COPY . /app
WORKDIR /app
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}

CMD java -classpath "$CLASSPATH:/app/lib/*" ${getJavaPackageName(entryfilePath)}
`;
};

export const buildGoDockerfile = ({
  alpine,
  customDockerBuildCommands
}: {
  alpine: boolean;
  customDockerBuildCommands?: string[];
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

export const buildRubyArtifactDockerfile = ({ rubyVersion, alpine }: { rubyVersion: number; alpine?: boolean }) => {
  let baseImage = `public.ecr.aws/docker/library/ruby:${rubyVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand = alpine
    ? 'RUN apk add --no-cache build-base'
    : 'RUN apt-get update && apt-get install -y build-essential';
  const bundleInstallCommand = `RUN if [ -f Gemfile ]; then \
  bundle config set path vendor/bundle && \
  bundle install --without development test; \
fi`;

  return `FROM ${baseImage} AS build

${systemDepsCommand}

RUN mkdir /dist
COPY ./ ./dist
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
  alpine?: boolean;
  customDockerBuildCommands?: string[];
}) => {
  let baseImage = `public.ecr.aws/docker/library/ruby:${rubyVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand = alpine
    ? 'RUN apk add --no-cache build-base'
    : 'RUN apt-get update && apt-get install -y build-essential';
  const bundleInstallCommand = `RUN if [ -f Gemfile ]; then \
  bundle config set path vendor/bundle && \
  bundle install --without development test; \
fi`;

  const cmd = `CMD ["sh", "-c", "if [ -f Gemfile ]; then bundle exec ruby ${basename(
    entryfilePath
  )}; else ruby ${basename(entryfilePath)}; fi"]`;

  return `FROM ${baseImage}
${systemDepsCommand}
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app

${bundleInstallCommand}

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
  composer install --no-dev --prefer-dist --no-interaction --no-progress; \
fi`;

  return `FROM composer:2 AS composer
FROM ${baseImage} AS build

${systemDepsCommand}
COPY --from=composer /usr/bin/composer /usr/local/bin/composer

RUN mkdir /dist
COPY ./ ./dist
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
  alpine?: boolean;
  customDockerBuildCommands?: string[];
}) => {
  let baseImage = `public.ecr.aws/docker/library/php:${phpVersion}`;
  if (alpine) {
    baseImage += '-alpine';
  }
  const systemDepsCommand = alpine
    ? 'RUN apk add --no-cache git unzip'
    : 'RUN apt-get update && apt-get install -y git unzip';
  const composerInstallCommand = `RUN if [ -f composer.json ]; then \
  composer install --no-dev --prefer-dist --no-interaction --no-progress; \
fi`;

  return `FROM composer:2 AS composer
FROM ${baseImage}
${systemDepsCommand}
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
${(customDockerBuildCommands || []).map((command) => `RUN ${command}`).join('\n')}
RUN mkdir /app
COPY . /app
WORKDIR /app

${composerInstallCommand}

CMD ["php", "${basename(entryfilePath)}"]
`;
};

export const buildDotnetArtifactDockerfile = ({
  dotnetVersion,
  projectFilePath
}: {
  dotnetVersion: number;
  projectFilePath: string;
}) => {
  const sdkVersion = `${dotnetVersion}.0`;
  const baseImage = `mcr.microsoft.com/dotnet/sdk:${sdkVersion}`;

  return `FROM ${baseImage} AS build

WORKDIR /src
COPY . .

RUN dotnet restore "${projectFilePath}"
RUN dotnet publish "${projectFilePath}" -c Release -o /dist

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
  customDockerBuildCommands?: string[];
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
