'use server';

import { db } from '@/db';
import { posts } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export const createPost = async (formData: FormData) => {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.insert(posts).values({ title, content });
  revalidatePath('/');
};
