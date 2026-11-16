// Receives the alarms' webhook notifications and logs them, so the canary can prove that a notification arrives.
export default async (event: { body?: string; isBase64Encoded?: boolean }) => {
  const body = event.isBase64Encoded && event.body ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  console.log(`ALARM_NOTIFICATION ${body ?? ''}`);
  return { statusCode: 200, body: 'ok' };
};
