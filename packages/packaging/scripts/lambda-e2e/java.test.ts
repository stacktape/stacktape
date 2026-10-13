import { expect, test } from 'bun:test';
import { join } from 'node:path';
import { buildJavaLambda } from '../../src/buildpacks/java-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

for (const manager of ['maven', 'gradle'] as const) {
  test(`Java ${manager} reactor ZIP binds a Lambda handler with sibling library, resource and useful invalid-handler error`, async () => {
    await withProject(`java-${manager}`, async (root, project) => {
      const version = manager === 'maven' ? 17 : 21;
      const runtimeImage = `public.ecr.aws/lambda/java:${version}`;
      await ensureRuntimeImage(runtimeImage);
      const output = await buildJavaLambda({
        ...actions,
        cwd: project,
        name: `java-${manager}`,
        entryfilePath: 'app/src/main/java/smoke/Handler.java',
        distFolderPath: join(root, 'dist'),
        javaVersion: version
        // Detect Maven/Gradle from the project, as a zero-config customer would.
      });
      const invocation = {
        functionDirectory: await extractArtifact(output, root),
        runtimeImage,
        user: '993:990',
        containerLabel: `stacktape.test=java-${manager}-${process.pid}`,
        event: { name: 'stacktape' }
      };
      const response = await invokeInLambdaImage({ ...invocation, handler: 'smoke.Handler::handleRequest' });
      expect(response).toBe(`${manager}-reactor-runtime-ok:java-runtime-resource:stacktape`);
      const invalid = await invokeInLambdaImage<{ errorMessage: string }>({
        ...invocation,
        handler: 'smoke.Handler::missingMethod'
      });
      expect(invalid.errorMessage).toContain('missingMethod');
      expect(invalid.errorMessage).toContain('smoke.Handler');
    });
  }, 480_000);
}
