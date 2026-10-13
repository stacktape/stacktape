import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildRubyLambda } from '../../src/buildpacks/rb-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

for (const version of [3.4, 4] as const) {
  test(`Ruby ${version} locked native gem and gems.rb handler run in Lambda without development or test gems`, async () => {
    await withProject('ruby', async (root, project) => {
      const runtimeImage = `public.ecr.aws/lambda/ruby:${version === 4 ? '4.0' : version}`;
      await ensureRuntimeImage(runtimeImage);
      const lock = await readFile(join(project, 'gems.locked'), 'utf8');
      const output = await buildRubyLambda({
        ...actions,
        cwd: project,
        name: 'ruby-native',
        entryfilePath: 'src/handler.rb',
        distFolderPath: join(root, 'dist'),
        rubyVersion: version
      });
      const functionDirectory = await extractArtifact(output, root);
      expect(await readFile(join(functionDirectory, 'gems.locked'), 'utf8')).toBe(lock);
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
    });
  }, 480_000);
}
