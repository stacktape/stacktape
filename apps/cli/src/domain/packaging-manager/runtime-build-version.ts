import type {
  SupportedDotnetVersion,
  SupportedJavaVersion,
  SupportedPythonVersion,
  SupportedRubyVersion
} from '@stacktape/config/deployment-artifacts';
import type { LambdaRuntime } from '@stacktape/config/primitives';

export const areBuildAndRuntimeVersionsAligned = (
  configuredVersion: string | number,
  runtimeVersion: string | number
): boolean => String(configuredVersion) === String(runtimeVersion);

/** Keep native dependencies and compiled bytecode aligned with the Lambda runtime selected for the function. */
export const getPythonBuildVersionForRuntime = (runtime?: LambdaRuntime): SupportedPythonVersion | undefined => {
  switch (runtime) {
    case 'python3.8':
      return 3.8;
    case 'python3.9':
      return 3.9;
    case 'python3.10':
      return '3.10';
    case 'python3.11':
      return 3.11;
    case 'python3.12':
      return 3.12;
    case 'python3.13':
      return 3.13;
    case 'python3.14':
      return 3.14;
    default:
      return undefined;
  }
};

export const getJavaBuildVersionForRuntime = (runtime?: LambdaRuntime): SupportedJavaVersion | undefined => {
  switch (runtime) {
    case 'java8':
    case 'java8.al2':
      return 8;
    case 'java11':
      return 11;
    case 'java17':
      return 17;
    case 'java21':
      return 21;
    case 'java25':
      return 25;
    default:
      return undefined;
  }
};

export const getRubyBuildVersionForRuntime = (runtime?: LambdaRuntime): SupportedRubyVersion | undefined => {
  switch (runtime) {
    case 'ruby3.3':
      return 3.3;
    case 'ruby3.4':
      return 3.4;
    case 'ruby4.0':
      return 4;
    default:
      return undefined;
  }
};

export const getDotnetBuildVersionForRuntime = (runtime?: LambdaRuntime): SupportedDotnetVersion | undefined => {
  switch (runtime) {
    case 'dotnet6':
      return 6;
    case 'dotnet7':
      return 7;
    case 'dotnet8':
      return 8;
    case 'dotnet10':
      return 10;
    default:
      return undefined;
  }
};
