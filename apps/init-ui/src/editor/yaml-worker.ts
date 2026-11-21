// Vite needs a local worker entry so it bundles monaco-yaml's worker in the same module graph as the page.
// oxlint-disable-next-line import/no-unassigned-import -- the worker package registers its message handler on import
import 'monaco-yaml/yaml.worker.js';
