import { connect } from 'mongoose';

export const connectMongoose = async () => {
  try {
    await connect(process.env.MONGODB_CONNECTION_STRING, {
      authMechanism: 'MONGODB-AWS',
      authSource: '$external',
    });
    console.info('Successfully connected to the MongoDB cluster.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
