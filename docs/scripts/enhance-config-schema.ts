import { join } from 'node:path';
import configSchema from '@generated/schemas/config-schema.json';
import { writeJSON } from 'fs-extra';
import { logInfo, logSuccess } from '../../shared/utils/logging';
import { marked } from './utils/marked-mdx-parser';
import { processAllNodes } from './utils/misc';

export const enhanceConfigSchema = async () => {
  logInfo('Enhancing config schema...');
  await processAllNodes(configSchema, async (node) => {
    try {
      if (node && (node.type || node.$ref || node.anyOf) && node.description) {
        const [sd, ld] = node.description.split('---');
        const [parsedSd, parsedLd] = await Promise.all([marked(sd.replace('####', '')), ld && marked(ld)]);
        node._MdxDesc = { sd: parsedSd, ...(ld && { ld: parsedLd }) };
      }
    } catch (err) {
      console.error('Processing of schema node ended with error', err, node);
      throw err;
    }
  });

  const schemaPath = join(__dirname, '../..', '@generated', 'schemas', 'enhanced-config-schema.json');
  await writeJSON(schemaPath, configSchema);
  logSuccess(`Config schema enhanced successfully and saved to ${schemaPath}`);
};

if (import.meta.main) {
  enhanceConfigSchema();
}
