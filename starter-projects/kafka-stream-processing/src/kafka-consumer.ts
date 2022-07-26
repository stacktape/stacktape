// Kafka events have the following structure: https://docs.aws.amazon.com/lambda/latest/dg/with-kafka.html
export default async (event, _context) => {
  const { records } = event;
  const [topicName] = Object.keys(records);

  const allRecords = records[topicName].map((record) => {
    // EXAMPLE RECORD
    // {
    //     "topic": "TOPIC_NAME",
    //     "partition": 0,
    //     "offset": 21,
    //     "timestamp": 1647415103909,
    //     "timestampType": "CREATE_TIME",
    //     "value": "SGVsbG8gS2Fma2FKUyB1c2VyIQ==", // Base64 encoded
    //     "headers": []
    // }
    return {
      topicName: record.topic,
      timestamp: record.timestamp,
      value: Buffer.from(record.value, 'base64').toString('utf8'),
    };
  });
  console.info(allRecords);
};
