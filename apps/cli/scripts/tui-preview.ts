/**
 * Headless frame previewer for the progress TUI. Renders the full-screen
 * dashboard in representative states via the OpenTUI test
 * renderer and prints the text frames — a fast way to inspect and diff the UI
 * without a live terminal session.
 *
 *   bun scripts/tui-preview.ts            print frames to stdout
 *   bun scripts/tui-preview.ts out.txt    write frames to a file
 */
import { plugin } from 'bun';
import { writeFileSync } from 'node:fs';
import { createStacktapeOpenTuiBuildPlugin } from '@scripts/support/opentui-loader';

plugin(createStacktapeOpenTuiBuildPlugin());

const main = async () => {
  const { renderAllScenes } = await import('./support/tui-preview-scenes');
  const output = await renderAllScenes();
  const outFile = process.argv[2];
  if (outFile) {
    writeFileSync(outFile, output);
    console.info(`frames written to ${outFile}`);
  } else {
    console.info(output);
  }
  process.exit(0);
};

void main();
