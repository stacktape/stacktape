export const reviewerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'strengths', 'problems', 'mandatoryFixes', 'optionalImprovements'],
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      required: ['clarity', 'scannability', 'completeness', 'practicalUsefulness', 'audienceFit'],
      properties: {
        clarity: { type: 'number' },
        scannability: { type: 'number' },
        completeness: { type: 'number' },
        practicalUsefulness: { type: 'number' },
        audienceFit: { type: 'number' }
      }
    },
    strengths: { type: 'array', items: { type: 'string' } },
    problems: { type: 'array', items: { type: 'string' } },
    mandatoryFixes: { type: 'array', items: { type: 'string' } },
    optionalImprovements: { type: 'array', items: { type: 'string' } }
  }
} as const;

export const writerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mdx', 'seoTitle', 'seoDescription'],
  properties: {
    mdx: { type: 'string' },
    seoTitle: { type: 'string' },
    seoDescription: { type: 'string' }
  }
} as const;

export const verifierSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'issues', 'positiveFindings'],
  properties: {
    summary: { type: 'string' },
    issues: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'type', 'statement', 'reason', 'suggestedFix', 'evidence'],
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          type: {
            type: 'string',
            enum: ['unsupported-claim', 'incorrect-claim', 'ambiguous-claim', 'missing-caveat', 'stale-claim']
          },
          statement: { type: 'string' },
          reason: { type: 'string' },
          suggestedFix: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['file', 'quote'],
              properties: {
                file: { type: 'string' },
                quote: { type: 'string' }
              }
            }
          }
        }
      }
    },
    positiveFindings: { type: 'array', items: { type: 'string' } }
  }
} as const;

