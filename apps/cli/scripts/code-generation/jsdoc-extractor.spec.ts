import { describe, expect, test } from 'bun:test';
import { getResourceClassDescription, getSDKPropertyInfo } from './jsdoc-extractor';
import { resolveConfigSourceFile, SHARED_CONFIG_SOURCE } from './config-sources';

/**
 * The npm class generator falls back to generic prose whenever a lookup returns nothing, so a broken lookup is
 * invisible in the build and only shows up as worse published documentation. These assert distinctive authored
 * text, not merely that something was found.
 */
describe('authored property documentation reaches the npm declaration build', () => {
  test('a property declared directly on the resource props interface', () => {
    const memory = getSDKPropertyInfo('LambdaFunctionProps', 'memory');

    expect(memory?.optional).toBe(true);
    expect(memory?.jsdoc?.description).toContain('Memory in MB');
    // The examples are the product content the published declarations carry.
    expect(memory?.jsdoc?.description).toContain('**Example (YAML):**');
  });

  test('a property inherited through `extends ResourceAccessProps`', () => {
    // `connectTo` is declared once, on ResourceAccessProps in the shared module, and inherited by every
    // workload. A direct-members-only lookup returns nothing for it.
    const lambdaConnectTo = getSDKPropertyInfo('LambdaFunctionProps', 'connectTo');
    const webServiceConnectTo = getSDKPropertyInfo('WebServiceProps', 'connectTo');

    expect(lambdaConnectTo?.jsdoc?.description).toContain('Give this resource access to other resources');
    expect(webServiceConnectTo?.jsdoc?.description).toBe(lambdaConnectTo?.jsdoc?.description);
    expect(lambdaConnectTo?.type).toContain('string[]');
  });

  test('an inherited property whose documentation carries JSDoc tags', () => {
    const environment = getSDKPropertyInfo('LambdaFunctionProps', 'environment');

    expect(environment?.jsdoc?.description).toContain('Environment variables available to the function');
    expect(environment).toBeDefined();
  });

  test('resource class descriptions still resolve after the move', () => {
    expect(getResourceClassDescription('LambdaFunction')?.description).toContain('serverless compute resource');
    expect(getResourceClassDescription('WebService')?.description).toContain('container running 24/7');
  });

  test('an unknown property is reported as missing rather than guessed', () => {
    expect(getSDKPropertyInfo('LambdaFunctionProps', 'thereIsNoSuchProperty')).toBeUndefined();
  });

  test('the logical source names the published mapping records still resolve', () => {
    // class-config.ts records these historical names; the modules behind them were renamed.
    expect(resolveConfigSourceFile('__helpers.d.ts')).toEndWith('shared.ts');
    expect(resolveConfigSourceFile('_root.d.ts')).toEndWith('config.ts');
    expect(resolveConfigSourceFile(SHARED_CONFIG_SOURCE)).toEndWith('shared.ts');
    expect(resolveConfigSourceFile('functions.d.ts')).toEndWith('functions.ts');
    expect(() => resolveConfigSourceFile('scripts.d.ts')).toThrow('No @stacktape/config module');
  });
});
