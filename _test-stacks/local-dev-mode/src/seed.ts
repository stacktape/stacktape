/**
 * Seed script - runs before dev mode starts
 * This demonstrates the beforeDev hook functionality
 */

console.log('=== SEED SCRIPT STARTING ===');
console.log('Environment variables available:');

// Log all STP_ environment variables (connection strings for local resources)
const stpEnvVars = Object.entries(process.env)
  .filter(([key]) => key.startsWith('STP_'))
  .map(([key, value]) => `  ${key}: ${value?.substring(0, 50)}${(value?.length || 0) > 50 ? '...' : ''}`);

if (stpEnvVars.length > 0) {
  console.log(stpEnvVars.join('\n'));
} else {
  console.log('  No STP_ environment variables found (local resources not started yet)');
}

console.log('=== SEED SCRIPT COMPLETED ===');
