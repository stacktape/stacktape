import os from 'node:os';
import { executeGit } from '@utils/exec';
import { getBaseName } from '@utils/fs-utils';

type SupportedGitVariable =
  | 'describe'
  | 'describeLight'
  | 'sha1'
  | 'commit'
  | 'branch'
  | 'message'
  | 'user'
  | 'email'
  | 'changes'
  | 'repository'
  | 'repositoryRoot'
  | 'tags'
  | 'repositoryUrl';

export const sanitizeGitRemoteUrl = (remoteUrl: string) => {
  if (!remoteUrl) {
    return remoteUrl;
  }

  const scpStyleMatch = remoteUrl.match(/^[^@/\s]+@([^:\s]+):([^?#]+)(?:[?#].*)?$/);
  if (scpStyleMatch) {
    return `https://${scpStyleMatch[1]}/${scpStyleMatch[2]}`;
  }

  try {
    const parsedUrl = new URL(remoteUrl);
    if (!parsedUrl.hostname) {
      return remoteUrl;
    }
    parsedUrl.username = '';
    parsedUrl.password = '';
    parsedUrl.search = '';
    parsedUrl.hash = '';
    return parsedUrl.toString().replace(/\/$/, remoteUrl.endsWith('/') ? '/' : '');
  } catch {
    if (
      /(?:^|\/\/)[^/\s@]+@/u.test(remoteUrl) ||
      /[?&](?:access_?token|auth|key|password|secret|token)=/iu.test(remoteUrl)
    ) {
      return '';
    }
    return remoteUrl;
  }
};

export const getGitVariable = async (variable: SupportedGitVariable) => {
  switch (variable) {
    case 'describe': {
      const { stdout } = await executeGit('describe --always');
      return stdout;
    }
    // case 'describeLight': {
    //   const { stdout } = await gitExec(['describe', '--always', '--tags']);
    //   return stdout;
    // }
    case 'sha1': {
      const { stdout } = await executeGit('rev-parse --short HEAD');
      return stdout;
    }
    case 'commit': {
      const { stdout } = await executeGit('rev-parse HEAD');
      return stdout;
    }
    case 'branch': {
      const { stdout } = await executeGit('rev-parse --abbrev-ref HEAD');
      return stdout;
    }
    case 'message': {
      const { stdout } = await executeGit('log -1 --pretty=%B');
      return stdout;
    }
    case 'user': {
      const { stdout } = await executeGit('config user.name');
      return stdout;
    }
    case 'email': {
      const { stdout } = await executeGit('config user.email');
      return stdout;
    }
    case 'changes': {
      const { stdout: writeTree } = await executeGit('write-tree');
      const { stdout: changes } = await executeGit(`diff-index ${writeTree} --`);
      return changes;
    }
    case 'repository': {
      const { stdout } = await executeGit('rev-parse --show-toplevel');
      return getBaseName(stdout);
    }
    case 'repositoryRoot': {
      const { stdout } = await executeGit('rev-parse --show-toplevel');
      return stdout;
    }
    case 'tags': {
      const { stdout } = await executeGit('tag --points-at HEAD');
      const value = stdout.split(os.EOL).join('::');
      return value || (await executeGit('rev-parse --short HEAD')).stdout;
    }
    case 'repositoryUrl': {
      const { stdout } = await executeGit('config --get remote.origin.url');
      if (!stdout.startsWith('http')) {
        return sanitizeGitRemoteUrl(stdout);
      }
      return sanitizeGitRemoteUrl(stdout);
    }
    default: {
      return null;
    }
  }
};
