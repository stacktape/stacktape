import { Schema, model } from 'mongoose';

type Post = {
  title: string;
  content: string;
  authorEmail: string;
};

const PostSchema = new Schema<Post>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    authorEmail: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Post = model<Post>('Post', PostSchema);
