import { expect, test } from 'bun:test';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildJavaLambda, getJavaLambdaHandler } from '../../src/buildpacks/java-lambda-buildpack';
import { invokeInLambdaImage } from '../e2e-helpers';
import { actions, ensureRuntimeImage, extractArtifact, withProject } from './harness';

// Maven runs as a service under an unrelated repository-root pom.xml, which must not become its reactor root.
const UNRELATED_ROOT_POM =
  '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><groupId>other</groupId><artifactId>tools</artifactId><version>1.0.0</version><packaging>pom</packaging></project>';

for (const manager of ['maven', 'gradle'] as const) {
  test(`Java ${manager} reactor ZIP binds a Lambda handler with sibling library, resource and useful invalid-handler error`, async () => {
    const directory = manager === 'maven' ? 'services/java' : undefined;
    await withProject(
      `java-${manager}`,
      async (root, repository, project) => {
        if (directory) await writeFile(join(repository, 'pom.xml'), UNRELATED_ROOT_POM);
        const version = manager === 'maven' ? 17 : 21;
        const runtimeImage = `public.ecr.aws/lambda/java:${version}`;
        await ensureRuntimeImage(runtimeImage);
        const projectFiles = (await readdir(project)).toSorted();
        const entryfilePath = join(directory ?? '', 'app/src/main/java/com/example/smoke/Handler.java');
        // The handler the CLI configures for the function, not a string written for this test.
        const handler = getJavaLambdaHandler({ cwd: repository, entryfilePath });
        expect(handler).toBe('com.example.smoke.Handler::handleRequest');
        const output = await buildJavaLambda({
          ...actions,
          cwd: repository,
          name: `java-${manager}`,
          entryfilePath,
          distFolderPath: join(root, 'dist'),
          javaVersion: version
          // Detect Maven/Gradle from the project, as a zero-config customer would.
        });
        // Temporary build files (the Gradle init script) must not stay in the customer's project.
        expect((await readdir(project)).toSorted()).toEqual(projectFiles);
        const invocation = {
          functionDirectory: await extractArtifact(output, root),
          runtimeImage,
          user: '993:990',
          containerLabel: `stacktape.test=java-${manager}-${process.pid}`,
          event: { name: 'stacktape' }
        };
        const response = await invokeInLambdaImage({ ...invocation, handler });
        expect(response).toBe(`${manager}-reactor-runtime-ok:java-runtime-resource:stacktape`);
        const invalid = await invokeInLambdaImage<{ errorMessage: string }>({
          ...invocation,
          handler: getJavaLambdaHandler({ cwd: repository, entryfilePath, handlerFunction: 'missingMethod' })
        });
        expect(invalid.errorMessage).toContain('missingMethod');
        expect(invalid.errorMessage).toContain('com.example.smoke.Handler');
      },
      { directory }
    );
  }, 480_000);
}
