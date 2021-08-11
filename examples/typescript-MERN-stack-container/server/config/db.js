import { connect } from 'mongoose';

const connectDB = async () => {
  try {
    await connect(process.env.MONGODB_CONNECTION_STRING, {
      authMechanism: 'MONGODB-AWS',
      authSource: '$external',
      useNewUrlParser: true,
      dbName: process.env.DATABASE_NAME,
      useUnifiedTopology: true
    });
    console.info('MongoDB is Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

export default connectDB;
