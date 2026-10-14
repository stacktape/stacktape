import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFile, rename } from 'node:fs/promises';
import { buildRubyLambda } from '../../src/buildpacks/rb-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

// Ruby 3.4 runs the common layout: a Gemfile service inside a larger repository. Ruby 4.0 runs gems.rb at the root.
const layouts = [
  { version: 3.4, gemfile: 'Gemfile', lockfile: 'Gemfile.lock', directory: 'services/ruby' },
  { version: 4, gemfile: 'gems.rb', lockfile: 'gems.locked', directory: undefined }
] as const;

for (const { version, gemfile, lockfile, directory } of layouts) {
  test(`Ruby ${version} ${gemfile} project runs its locked native gem and handler in Lambda without development or test gems`, async () => {
    await withProject(
      'ruby',
      async (root, repository, project) => {
        if (gemfile === 'Gemfile') {
          await rename(join(project, 'gems.rb'), join(project, 'Gemfile'));
          await rename(join(project, 'gems.locked'), join(project, 'Gemfile.lock'));
        }
        const runtimeImage = `public.ecr.aws/lambda/ruby:${version === 4 ? '4.0' : version}`;
        await ensureRuntimeImage(runtimeImage);
        const lock = await readFile(join(project, lockfile), 'utf8');
        const output = await buildRubyLambda({
          ...actions,
          cwd: repository,
          name: 'ruby-native',
          entryfilePath: join(directory ?? '', 'src/handler.rb'),
          distFolderPath: join(root, 'dist'),
          rubyVersion: version
        });
        const functionDirectory = await extractArtifact(output, root);
        expect(await readFile(join(functionDirectory, lockfile), 'utf8')).toBe(lock);
        const response = await invokeInLambdaImage({
          functionDirectory,
          runtimeImage,
          handler: 'src/handler.handler',
          user: '993:990',
          containerLabel: `stacktape.test=ruby-native-${process.pid}`,
          event: { message: 'ruby-native-ok' }
        });
        expect(response).toEqual({
          value: { message: 'ruby-native-ok' },
          version: '4.1.1',
          decimal: '0.3',
          packaged: true,
          native: true,
          devAbsent: true,
          resource: 'ruby-resource-ok'
        });
      },
      { directory }
    );
  }, 480_000);
}
