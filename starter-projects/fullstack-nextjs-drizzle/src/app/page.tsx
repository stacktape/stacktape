import { db } from '@/db';
import { posts } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createPost } from './actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Posts</h1>

      <form
        action={createPost}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}
      >
        <input
          name="title"
          placeholder="Title"
          required
          style={{
            padding: '0.625rem 0.75rem',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#ededed',
            fontSize: '0.9rem'
          }}
        />
        <textarea
          name="content"
          placeholder="Content"
          required
          rows={3}
          style={{
            padding: '0.625rem 0.75rem',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#ededed',
            fontSize: '0.9rem',
            resize: 'vertical'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.625rem 1.25rem',
            background: '#ededed',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            alignSelf: 'flex-start'
          }}
        >
          Create post
        </button>
      </form>

      {allPosts.length === 0 ? (
        <p style={{ color: '#888' }}>No posts yet. Create one above.</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {allPosts.map((post) => (
            <li
              key={post.id}
              style={{
                padding: '1rem',
                background: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: 8
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.375rem' }}>{post.title}</h2>
              <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{post.content}</p>
              <time style={{ color: '#666', fontSize: '0.75rem' }}>
                {post.createdAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
