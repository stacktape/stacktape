/**
 * Custom Solid preload that fixes Windows path compatibility.
 * The upstream @opentui/solid/preload uses forward-slash-only regex filters
 * which don't match Windows backslash paths.
 */
import { transformAsync } from '@babel/core';
import ts from '@babel/preset-typescript';
import solid from 'babel-preset-solid';
import type { BunPlugin } from 'bun';

export const solidBuildPlugin: BunPlugin = {
  name: 'bun-plugin-solid',
  setup: (build) => {
    build.onLoad({ filter: /[\\/]node_modules[\\/]solid-js[\\/]dist[\\/]server\.js$/ }, async (args) => {
      const path = args.path.replace('server.js', 'solid.js');
      const file = Bun.file(path);
      const code = await file.text();
      return { contents: code, loader: 'js' };
    });
    build.onLoad({ filter: /[\\/]node_modules[\\/]solid-js[\\/]store[\\/]dist[\\/]server\.js$/ }, async (args) => {
      const path = args.path.replace('server.js', 'store.js');
      const file = Bun.file(path);
      const code = await file.text();
      return { contents: code, loader: 'js' };
    });
    build.onLoad({ filter: /\.(js|ts)x$/ }, async (args) => {
      const file = Bun.file(args.path);
      const code = await file.text();
      const transforms = await transformAsync(code, {
        filename: args.path,
        presets: [[solid, { moduleName: '@opentui/solid', generate: 'universal' }], [ts]]
      });
      return { contents: transforms?.code ?? '', loader: 'js' };
    });
  }
};
