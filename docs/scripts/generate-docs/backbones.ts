import type { BackboneTemplate } from './types';

export const getBackboneSections = (template: BackboneTemplate) => {
  switch (template) {
    case 'resource':
      return ['When to Use', 'Basic Example', 'Key Configuration Areas', 'How It Works', 'API Reference'];
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
