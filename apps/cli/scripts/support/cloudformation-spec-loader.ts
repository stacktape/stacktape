import type { BunPlugin } from 'bun';

export const createCloudFormationSpecBuildPlugin = (): BunPlugin => ({
  name: 'stacktape-cloudformation-spec',
  setup(build) {
    build.onLoad(
      { filter: /[\\/]node_modules[\\/]@aws-cdk[\\/]aws-service-spec[\\/]lib[\\/]index\.js$/ },
      async ({ path }) => {
        const source = await Bun.file(path).text();
        const declaration = "const DB_PATH = path.join(__dirname, '..', DB_COMPRESSED);";
        if (source.split(declaration).length !== 2) {
          throw new Error('The CDK service-spec loader changed; review its embedded database path before releasing.');
        }
        // CDK reads this file lazily when comparing templates. A computed __dirname path points at the build
        // machine in compiled executables; a static file import embeds the same bytes for both fs loading paths.
        return {
          contents: `import stacktapeServiceSpecDatabasePath from '../db.json.gz' with { type: 'file' };\n${source.replace(declaration, 'const DB_PATH = stacktapeServiceSpecDatabasePath;')}`,
          loader: 'js'
        };
      }
    );
  }
});
