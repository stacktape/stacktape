import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);

const handler = async (event, context) => {
  await client.connect();

  const db = client.db('mydb');

  await db.collection('posts').insertOne({
    title: 'My first post',
    content: 'Hello!'
  });

  const post = await db.collection('posts').findOne({ title: 'My first post' });

  await client.close();
};
