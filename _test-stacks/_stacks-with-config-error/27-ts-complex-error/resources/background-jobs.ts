// Background job Lambda definitions
import { createLambdaConfig, getLambdaDefaults } from '../utils';

export const createBackgroundJobs = (stage: string) => {
  const defaults = getLambdaDefaults(stage);

  return {
    processQueue: createLambdaConfig('process-queue', 'src/jobs/process-queue.ts', defaults, {
      memory: 2048,
      timeout: 60
    }),
    sendNotifications: createLambdaConfig('send-notifications', 'src/jobs/send-notifications.ts', defaults, {
      timeout: 30
    }),
    cleanupOldData: createLambdaConfig('cleanup-old-data', 'src/jobs/cleanup-old-data.ts', defaults, {
      memory: 512,
      timeout: 120
    })
  };
};
