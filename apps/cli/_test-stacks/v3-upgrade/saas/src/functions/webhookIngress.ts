// Behind the load balancer: answers the partner webhook route with the function's own name.
import { doWork } from '../shared/work';

export default async () => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(await doWork('webhookIngress', undefined))
});
