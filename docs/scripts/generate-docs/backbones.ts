import type { BackboneTemplate } from './types';

export const getBackboneSections = (template: BackboneTemplate) => {
  switch (template) {
    case 'resource':
      // Bookends only. The writer agent chooses how to subdivide configuration content
      // between the basic example and the API reference — pick H2/H3 sections that match the
      // resource's actual shape, source files, and most-touched configuration paths.
      return ['When to Use', 'Basic Example', 'API Reference'];
    case 'choosing':
      return ['Quick Recommendation', 'Comparison Table', 'When to Choose Each Option', 'Cost and Operational Tradeoffs', 'Related Pages'];
    case 'recipe':
      return ['What You’ll Build', 'Stacktape Configuration', 'Application Code', 'How It Works', 'Deploy', 'Next Steps'];
    case 'console':
      return ['What This Part of the Console Does', 'Walkthrough', 'Common Tasks', 'Troubleshooting', 'Related Features'];
    case 'cli':
      return ['What It Does', 'Usage', 'Important Flags', 'Examples', 'Related Commands'];
    default:
      return [];
  }
};
