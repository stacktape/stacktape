import { Kafka, logLevel, Producer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-client',
  brokers: [process.env.KAFKA_ENDPOINT],
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
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
