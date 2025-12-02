import { defineConfig } from 'taze';

export default defineConfig({
  interactive: true,
  group: true,
  mode: 'major',
  // ignore packages from bumping
  // exclude: [
  //   'webpack'
  // ],
  // fetch latest package info from registry without cache
  // force: true,
  // write to package.json
  write: true,
  // run `npm install` or `yarn install` right after bumping
  install: true,
  // ignore paths for looking for package.json in monorepo
  ignorePaths: ['**/starter-projects/**/*', '**/_example-configs/**/*']
  // // ignore package.json that in other workspaces (with their own .git,pnpm-workspace.yaml,etc.)
  // ignoreOtherWorkspaces: true,
  // // override with different bumping mode for each package
  // packageMode: {
  //   'typescript': 'major',
  //   'unocss': 'ignore',
  //   // regex starts and ends with '/'
  //   '/vue/': 'latest'
  // },
  // disable checking for "overrides" package.json field
  // depFields: {
  //   overrides: false
  // }
});
