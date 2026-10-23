/** Copies the fixture into the run's work directory (one per stage), tags it with the run ID and installs pg. */
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { assertAccount, PROJECT, recordResource, REGION, RUN, stackName, WORK_DIR } from './lib';

await assertAccount();
for (const stage of ['box', 'base']) {
  const dir = join(WORK_DIR, stage);
  cpSync(join(import.meta.dir, 'fixture'), dir, { recursive: true });
  let config = readFileSync(join(dir, 'stacktape.yml'), 'utf8').replace('value: local', `value: ${RUN}`);
  if (stage === 'base') {
    // Today's design: no VPC, no NAT; every function non-VPC (bore.pub path).
    config = config.replace(/  nat:\n    type: ec2\n    instanceSize: t4g.nano\n/, '').replace(/      joinDefaultVpc: true\n/g, '');
  }
  writeFileSync(join(dir, 'stacktape.yml'), config);
  execSync('npm install --no-audit --no-fund --silent', { cwd: dir, stdio: 'inherit' });
  recordResource({ kind: 'cloudformation-stack', name: stackName(stage), region: REGION, project: PROJECT, stage });
}
console.log('prepared', WORK_DIR);
