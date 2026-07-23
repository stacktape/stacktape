import os from 'node:os';
import { copyFile, mkdtemp } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { executeGit } from '@shared/utils/exec';
import { getBaseName } from '@shared/utils/fs-utils';
import execa from 'execa';
import { pathExists, remove } from 'fs-extra';

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

export const gitCreateZipArchive = async ({ directory, outputPath }: { directory: string; outputPath: string }) => {
  const { exitCode } = await execa('git rev-parse --is-inside-work-tree', { cwd: directory, shell: true }).catch(
    (err) => err
  );
  let commitHash: string;
  const isInsideGitWorkingTree = exitCode === 0;
  if (!isInsideGitWorkingTree) {
    // await execa(
    //   [
    //     'git init',
    //     'git add -A',
    //     'git config user.name stacktape',
    //     'git config user.email info@stacktape.com',
    //     'git commit --author="stacktape-codebuild-pipeline" -m "Stacktape deployment"'
    //   ].join(' && '),
    //   { cwd: directory, shell: true }
    // );
    await executeGit('init', { cwd: directory });
    await executeGit('add -A', { cwd: directory });
    await executeGit('config user.name "Stacktape"', { cwd: directory });
    await executeGit('config user.email info@stacktape.com', { cwd: directory });
    await executeGit('commit --author="stacktape-codebuild-pipeline <>" -m "Stacktape deployment"', { cwd: directory });
    ({ stdout: commitHash } = await executeGit('rev-parse HEAD', { cwd: directory }));
  } else {
    const temporaryIndexDirectory = await mkdtemp(join(os.tmpdir(), 'stacktape-git-index-'));
    const temporaryIndexPath = join(temporaryIndexDirectory, 'index');
    try {
      const { stdout: gitDirectory } = await executeGit('rev-parse --git-dir', { cwd: directory });
      const currentIndexPath = join(
        isAbsolute(gitDirectory) ? gitDirectory : resolve(directory, gitDirectory),
        'index'
      );
      if (await pathExists(currentIndexPath)) {
        await copyFile(currentIndexPath, temporaryIndexPath);
      } else {
        await executeGit('read-tree --empty', {
          cwd: directory,
          env: { GIT_INDEX_FILE: temporaryIndexPath }
        });
      }
      const temporaryIndexOptions = {
        cwd: directory,
        env: { GIT_INDEX_FILE: temporaryIndexPath }
      };
      await executeGit('add -A', temporaryIndexOptions);
      ({ stdout: commitHash } = await executeGit('stash create', temporaryIndexOptions));
    } finally {
      await remove(temporaryIndexDirectory);
    }
  }
  commitHash = commitHash || 'HEAD';
  await executeGit(`archive --format=zip --output ${outputPath} ${commitHash}`, { cwd: directory });
  // if we were not inside git directory, we had to initialize git
  // we need to clean it up now
  if (!isInsideGitWorkingTree) {
    await remove(join(directory, '.git'));
  }
};
