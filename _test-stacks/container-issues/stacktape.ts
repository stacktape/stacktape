import {
  defineConfig,
  StacktapeImageBuildpackPackaging,
  WebService
} from '../../__release-npm';

export default defineConfig(() => {
  const tsWeb = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/ts-web/server.ts'
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  const pyWeb = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/py-web/app.py',
      languageSpecificConfig: { pythonVersion: 3.11, packageManager: 'uv' }
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  const goWeb = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/go-web/main.go'
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  const javaWeb = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/java-web/src/main/java/com/example/App.java',
      languageSpecificConfig: { javaVersion: 17 }
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  const rbWeb = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/rb-web/server.rb'
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  const phpWeb = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/php-web/server.php',
      languageSpecificConfig: { phpVersion: 8.3 }
    }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    resources: { tsWeb, pyWeb, goWeb, javaWeb, rbWeb, phpWeb }
  };
});
