import { plugin } from 'bun';
import { createStacktapeOpenTuiBuildPlugin } from '@scripts/support/opentui-loader';
// The network guard: every non-loopback HTTP request fails before transport. Child processes preload it directly.
// oxlint-disable-next-line import/no-unassigned-import
import './network-guard-preload';

// Tests must opt into a deliberately configured local endpoint; inheriting a developer or CI identity is never a
// valid default. Dummy credentials and disabled instance metadata stop the credential chain from escaping first.
process.env.AWS_ACCESS_KEY_ID = 'stacktape-tests-no-real-aws';
process.env.AWS_SECRET_ACCESS_KEY = 'stacktape-tests-no-real-aws';
process.env.AWS_SESSION_TOKEN = 'stacktape-tests-no-real-aws';
process.env.AWS_DEFAULT_REGION = 'eu-west-1';
process.env.AWS_EC2_METADATA_DISABLED = 'true';
process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'true';
delete process.env.AWS_PROFILE;
delete process.env.AWS_ENDPOINT_URL;
// A test's Stacktape login stays in its temporary home, never the machine's credential store.
process.env.STACKTAPE_CREDENTIAL_STORE = 'file';
for (const name of Object.keys(process.env)) {
  if (name.startsWith('AWS_ENDPOINT_URL_')) {
    delete process.env[name];
  }
}

plugin(createStacktapeOpenTuiBuildPlugin());
