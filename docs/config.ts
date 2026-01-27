// Conditionally export the config based on DOCS_CONTENT_DIR environment variable
// This allows switching between original docs and new docs navigation structure

import originalConfig from './config-original';
import newDocsConfig from './config-new-docs';

// Use NEXT_PUBLIC_ prefix to make it available on both server and client
// Falls back to server-only DOCS_CONTENT_DIR for backwards compatibility
const DOCS_CONTENT_DIR = process.env.NEXT_PUBLIC_DOCS_CONTENT_DIR || process.env.DOCS_CONTENT_DIR || 'docs';

const config = DOCS_CONTENT_DIR === '_new-docs' ? newDocsConfig : originalConfig;

export default config;
