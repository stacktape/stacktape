import os from 'node:os';
import { join } from 'node:path';
import { executeGit } from '@shared/utils/exec';
import { getBaseName } from '@shared/utils/fs-utils';
import execa from 'execa';
import { remove } from 'fs-extra';

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
        return stdout
          .replace(/:/g, '/')
          .replace(/ssh\/\//g, '')
          .replace(/git@/g, 'https://');
      }
      return stdout;
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
    await executeGit('add -A', { cwd: directory });
    ({ stdout: commitHash } = await executeGit('stash create', { cwd: directory }));
  }
  commitHash = commitHash || 'HEAD';
  await executeGit(`archive --format=zip --output ${outputPath} ${commitHash}`, { cwd: directory });
  // if we were not inside git directory, we had to initialize git
  // we need to clean it up now
  if (!isInsideGitWorkingTree) {
    await remove(join(directory, '.git'));
  }
};
