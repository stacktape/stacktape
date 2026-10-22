import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFile, rename } from 'node:fs/promises';
import { buildRubyLambda, getRubyLambdaHandlerFile } from '../../src/buildpacks/rb-lambda-buildpack';
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

// The Gemfile sits at the project root and the handler in `src/`, so the ZIP keeps `src/`. The handler is the one
// the CLI configures for the function, not a string written for this test.
test('a Ruby handler below its Gemfile runs in Lambda under the handler the CLI configures', async () => {
  await withProject('ruby-src-layout', async (root, project) => {
    const runtimeImage = 'public.ecr.aws/lambda/ruby:3.4';
    await ensureRuntimeImage(runtimeImage);
    const entryfilePath = 'src/handler.rb';
    const handler = `${getRubyLambdaHandlerFile({ cwd: project, entryfilePath })}.handler`;
    expect(handler).toBe('src/handler.handler');
    const output = await buildRubyLambda({
      ...actions,
      cwd: project,
      name: 'ruby-src-layout',
      entryfilePath,
      distFolderPath: join(root, 'dist'),
      rubyVersion: 3.4
    });
    const response = await invokeInLambdaImage({
      functionDirectory: await extractArtifact(output, root),
      runtimeImage,
      handler,
      user: '993:990',
      containerLabel: `stacktape.test=ruby-src-layout-${process.pid}`,
      event: { message: 'ruby-src-layout-ok' }
    });
    expect(response).toEqual({ file: '/var/task/src/handler.rb', value: { message: 'ruby-src-layout-ok' } });
  });
}, 480_000);
