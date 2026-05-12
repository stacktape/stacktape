'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

export default function Home() {
  const messages = useQuery(api.messages.list);
  const send = useMutation(api.messages.send);
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !author.trim()) return;
    await send({ body, author });
    setBody('');
  };

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Convex chat (self-hosted on AWS via Stacktape)</h1>

      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Name"
          style={{ flex: '0 0 120px' }}
        />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          style={{ flex: 1 }}
        />
        <button type="submit">Send</button>
      </form>

      {messages === undefined ? (
        <p>Loading...</p>
      ) : messages.length === 0 ? (
        <p>No messages yet. Be the first!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {messages.map((m) => (
            <li key={m._id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <strong>{m.author}:</strong> {m.body}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
