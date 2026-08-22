// Test fixture for *.stacktape.ts command support.
//
// The schema features (validation / hover / completion / go-to-definition) intentionally
// do NOT apply to .ts configs — TypeScript itself + the `stacktape` package's types cover
// those. But the Stacktape COMMANDS should still be available here:
//
//   ▶ TEST: with this file open, the "Deploy stack" / "Preview changes" buttons should
//           appear in the editor title bar (top-right), and "Stacktape: ..." commands
//           should appear in the right-click menu and the Command Palette.
//
// (No imports here on purpose, so the fixture has no TypeScript errors without a real
//  `stacktape` install.)

export default {
  resources: {
    api: {
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: { entryfilePath: './src/index.ts' }
        }
      }
    }
  }
};
