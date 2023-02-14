import SNS from 'aws-sdk/clients/sns';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const client = new SNS({});

const handler = async (event, _context) => {
  // event contains change records of items in dynamo table
  const items = event.Records.map((record) => DynamoDB.Converter.unmarshall(record.dynamodb.NewImage));
  console.info('items to be published', items);

  for (const item of items) {
    const params = {
      TopicArn: process.env.STP_MAIN_TOPIC_ARN,
      Message: JSON.stringify(item),
    };
    await client.publish(params).promise();
  }
};

export default handler;
