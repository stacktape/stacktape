import { connect } from 'mongoose';

export const connectMongoose = async () => {
  try {
    await connect(process.env.MONGODB_CONNECTION_STRING, {
      authMechanism: 'MONGODB-AWS',
      authSource: '$external',
      dbName: process.env.DATABASE_NAME,
    });
    console.info('Successfully connected to the MongoDB cluster.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
