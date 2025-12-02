import { describe, expect, test } from 'bun:test';
import { extractPaths } from './extract-paths-from-config';

describe('extract-paths-from-config', () => {
  describe('extractPaths', () => {
    test('should extract filePath from resources', () => {
      const stacktapeConfig: any = {
        resources: {
          myFunction: {
            type: 'function',
            properties: {
              packaging: {
                type: 'stacktape-lambda-buildpack',
                properties: {
                  filePath: 'src/index.ts'
                }
              }
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
      expect(result[0].pathType).toBe('resource');
      expect(result[0].name).toBe('myFunction');
    });

    test('should extract executeScript from resources', () => {
      const stacktapeConfig: any = {
        resources: {
          myScript: {
            type: 'deployment-script',
            properties: {
              executeScript: './deploy.sh'
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('./deploy.sh');
      expect(result[0].pathType).toBe('resource');
    });

    test('should extract directoryPath from resources', () => {
      const stacktapeConfig: any = {
        resources: {
          webService: {
            type: 'web-service',
            properties: {
              packaging: {
                type: 'stacktape-image-buildpack',
                properties: {
                  directoryPath: './app'
                }
              }
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('./app');
      expect(result[0].oftenGenerated).toBe(true);
    });

    test('should extract from directives', () => {
      const stacktapeConfig: any = {
        directives: {
          myDirective: {
            name: 'custom-directive',
            filePath: 'directives/setup.ts'
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('directives/setup.ts');
      expect(result[0].pathType).toBe('directive');
      expect(result[0].name).toBe('custom-directive');
    });

    test('should extract from scripts', () => {
      const stacktapeConfig: any = {
        scripts: {
          build: {
            executeScript: './build.sh'
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('./build.sh');
      expect(result[0].pathType).toBe('script');
      expect(result[0].name).toBe('build');
    });

    test('should extract paths from arrays', () => {
      const stacktapeConfig: any = {
        resources: {
          myFunction: {
            type: 'function',
            properties: {
              executeScripts: ['./script1.sh', './script2.sh']
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('./script1.sh');
      expect(result[1].path).toBe('./script2.sh');
    });

    test('should clean paths with colons', () => {
      const stacktapeConfig: any = {
        resources: {
          myFunction: {
            type: 'function',
            properties: {
              filePath: 'src/index.ts:handler'
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result[0].path).toBe('src/index.ts');
    });

    test('should handle null values', () => {
      const stacktapeConfig: any = {
        resources: {
          myFunction: {
            type: 'function',
            properties: null
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result).toEqual([]);
    });

    test('should extract all recognized path properties', () => {
      const stacktapeConfig: any = {
        resources: {
          resource1: {
            type: 'function',
            properties: {
              filePath: 'file.ts',
              executeScript: 'script.sh',
              dockerfilePath: 'Dockerfile',
              tsConfigPath: 'tsconfig.json'
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result.map((r) => r.path)).toContain('file.ts');
      expect(result.map((r) => r.path)).toContain('script.sh');
      expect(result.map((r) => r.path)).toContain('Dockerfile');
      expect(result.map((r) => r.path)).toContain('tsconfig.json');
    });

    test('should include resourceType for resources', () => {
      const stacktapeConfig: any = {
        resources: {
          myFunction: {
            type: 'function',
            properties: {
              filePath: 'index.ts'
            }
          }
        }
      };

      const result = extractPaths({ stacktapeConfig });

      expect(result[0].resourceType).toBe('function');
    });

    test('should handle empty config', () => {
      const stacktapeConfig: any = {};

      const result = extractPaths({ stacktapeConfig });

      expect(result).toEqual([]);
    });
  });
});
