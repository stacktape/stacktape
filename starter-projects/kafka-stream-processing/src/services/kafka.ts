import { Kafka, logLevel, Producer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-client',
  brokers: [process.env.STP_KAFKA_TOPIC_TCP_ENDPOINT],
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.STP_KAFKA_TOPIC_USERNAME,
    password: process.env.STP_KAFKA_TOPIC_PASSWORD,
  },
  logLevel: logLevel.WARN,
});

let producer: Producer;
export const getKafkaProducer = async () => {
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
};
