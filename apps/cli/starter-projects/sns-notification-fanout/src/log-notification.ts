type SNSRecord = {
  Sns: { Subject: string; Message: string; MessageId: string; Timestamp: string };
};

// This subscriber simulates sending notifications (email, SMS, webhook, etc.)
// In a real app, you'd integrate with SES, Twilio, or an HTTP endpoint here.
const handler = async (event: { Records: SNSRecord[] }) => {
  for (const record of event.Records) {
    const notification = JSON.parse(record.Sns.Message);
    console.log(`[NOTIFICATION] Channel: ${notification.channel} | Subject: ${notification.subject} | Message: ${notification.message} | Sent: ${notification.sentAt}`);
  }

  return { statusCode: 200, body: 'Notifications logged' };
};

export default handler;
