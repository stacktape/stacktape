import type { SupportedEsPackageManager } from '../runtime-contracts';

type Dependency = { name: string; version: string };

const PINNED_PNPM_VERSION = '11.17.0';

const dependencySpecs = (dependencies: Dependency[], prefix = ''): string =>
  dependencies.map(({ name, version }) => `${prefix}${name}@${version}`).join(' ');

/** Creates a project-local, explicit lifecycle-script allowlist for package managers that block scripts by default. */
const getLifecyclePolicyCommand = (dependencies: Dependency[], packageManager: SupportedEsPackageManager): string => {
  const dependencyNames = dependencies.map(({ name }) => name);
  if (packageManager === 'pnpm') {
    const workspacePolicyLines = [
      'onlyBuiltDependencies:',
      ...dependencyNames.map((name) => `  - ${JSON.stringify(name)}`)
    ];
    return `RUN printf '%s\\n' ${workspacePolicyLines.map((line) => `'${line}'`).join(' ')} > pnpm-workspace.yaml\n`;
  }
  if (packageManager === 'bun') {
    return `RUN printf '%s' '${JSON.stringify({ private: true, trustedDependencies: dependencyNames })}' > package.json\n`;
  }
  if (packageManager === 'deno') {
    return `RUN printf '%s' '${JSON.stringify({ nodeModulesDir: 'auto', allowScripts: dependencyNames.map((name) => `npm:${name}`) })}' > deno.json\n`;
  }
  return '';
};

export const getInstallDependenciesCommand = ({
  dependencies,
  packageManager
}: {
  dependencies: Dependency[];
  packageManager: SupportedEsPackageManager;
}): string => {
  if (dependencies.length === 0) return '';
  const installCommand =
    packageManager === 'npm'
      ? `npm install --save ${dependencySpecs(dependencies)}`
      : packageManager === 'deno'
        ? `deno add ${dependencySpecs(dependencies, 'npm:')}`
        : `${packageManager} add ${dependencySpecs(dependencies)}`;
  const explicitPnpmLifecycleCommands =
    packageManager === 'pnpm'
      ? dependencies
          .flatMap(({ name }) =>
            ['preinstall', 'install', 'postinstall'].map(
              (scriptName) => `RUN pnpm --dir ${JSON.stringify(`node_modules/${name}`)} run --if-present ${scriptName}`
            )
          )
          .join('\n')
      : '';
  return `${getLifecyclePolicyCommand(dependencies, packageManager)}RUN ${installCommand}${explicitPnpmLifecycleCommands ? `\n${explicitPnpmLifecycleCommands}` : ''}`;
};

export const getInstallPackageManagerCommand = (packageManager: SupportedEsPackageManager): string => {
  if (packageManager === 'pnpm') return `RUN npm install -g pnpm@${PINNED_PNPM_VERSION}\n`;
  if (packageManager === 'yarn') return 'RUN command -v yarn >/dev/null 2>&1 || npm install -g yarn@1.22.22\n';
  if (packageManager === 'deno') return 'RUN command -v deno >/dev/null 2>&1 || npm install -g deno\n';
  if (packageManager === 'bun') return 'RUN command -v bun >/dev/null 2>&1 || npm install -g bun\n';
  return '';
};
