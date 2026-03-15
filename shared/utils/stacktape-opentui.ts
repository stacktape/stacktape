import type { BunPlugin } from 'bun';
import { transformAsync } from '@babel/core';
import ts from '@babel/preset-typescript';
import solid from 'babel-preset-solid';

export const createStacktapeOpenTuiBuildPlugin = (): BunPlugin => {
  return {
    name: 'stacktape-opentui-build',
    setup(build) {
      build.onLoad({ filter: /[\\/]node_modules[\\/]solid-js[\\/]dist[\\/]server\.js$/ }, async (args) => {
        const path = args.path.replace('server.js', 'solid.js');
        const code = await Bun.file(path).text();
        return { contents: code, loader: 'js' };
      });

      build.onLoad({ filter: /[\\/]node_modules[\\/]solid-js[\\/]store[\\/]dist[\\/]server\.js$/ }, async (args) => {
        const path = args.path.replace('server.js', 'store.js');
        const code = await Bun.file(path).text();
        return { contents: code, loader: 'js' };
      });

      build.onLoad({ filter: /\.(ts|js)x$/ }, async (args) => {
        if (args.path.includes('node_modules')) {
          return undefined;
        }

        const code = await Bun.file(args.path).text();
        const transformed = await transformAsync(code, {
          filename: args.path,
          presets: [[solid, { moduleName: '@opentui/solid', generate: 'universal' }], [ts]]
        });

        return { contents: transformed?.code ?? '', loader: 'js' };
      });
    }
  };
};
