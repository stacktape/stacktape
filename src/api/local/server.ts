// Local integration entrypoint for console-app.
// This avoids brittle cross-repo imports like ../stacktape/src/... while keeping
// this surface out of the published npm package contract.
export { compileTemplate } from '../server/index';
