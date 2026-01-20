import { useEffect, useState } from 'react';

type User = { id: string; name: string; email: string };
type Post = {
  id: string;
  title: string;
  content: string | null;
  published: boolean;
  author: User;
};
type CacheEntry = { key: string; value: string | null };
type DynamoItem = { pk: string; sk: string; [key: string]: unknown };
type OpenSearchDoc = { id: string; [key: string]: unknown };

type ApiType = 'server' | 'lambda';

const getApiUrls = () => {
  const injectedEnv = (window as unknown as { STP_INJECTED_ENV?: { API_URL?: string; LAMBDA_API_URL?: string } })
    .STP_INJECTED_ENV;
  return {
    server: injectedEnv?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
    lambda: injectedEnv?.LAMBDA_API_URL || import.meta.env.VITE_LAMBDA_API_URL || 'http://localhost:3001'
  };
};

const App = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'cache' | 'dynamo' | 'opensearch'>('posts');
  const [apiType, setApiType] = useState<ApiType>('server');
  const apiUrls = getApiUrls();
  const apiUrl = apiUrls[apiType];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>SPA Frontend - Local Dev Mode</h1>

      <div style={{ marginBottom: 20, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>API Backend:</strong>
          <select
            value={apiType}
            onChange={(e) => setApiType(e.target.value as ApiType)}
            style={{ marginLeft: 8, padding: '4px 8px' }}
          >
            <option value="server">Server (Web Service)</option>
            <option value="lambda">Lambda (API Gateway)</option>
          </select>
        </div>
        <p style={{ color: '#666', margin: 0, fontSize: 14 }}>
          {apiType === 'server' ? 'Server' : 'Lambda'} API: {apiUrl}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          style={{
            background: activeTab === 'posts' ? '#0070f3' : '#e0e0e0',
            color: activeTab === 'posts' ? '#fff' : '#333'
          }}
        >
          Posts (Postgres)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cache')}
          style={{
            background: activeTab === 'cache' ? '#0070f3' : '#e0e0e0',
            color: activeTab === 'cache' ? '#fff' : '#333'
          }}
        >
          Cache (Redis)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dynamo')}
          style={{
            background: activeTab === 'dynamo' ? '#0070f3' : '#e0e0e0',
            color: activeTab === 'dynamo' ? '#fff' : '#333'
          }}
        >
          Items (DynamoDB)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('opensearch')}
          style={{
            background: activeTab === 'opensearch' ? '#0070f3' : '#e0e0e0',
            color: activeTab === 'opensearch' ? '#fff' : '#333'
          }}
        >
          Docs (OpenSearch)
        </button>
      </div>

      {activeTab === 'posts' && <PostsSection apiUrl={apiUrl} />}
      {activeTab === 'cache' && <CacheSection apiUrl={apiUrl} />}
      {activeTab === 'dynamo' && <DynamoSection apiUrl={apiUrl} />}
      {activeTab === 'opensearch' && <OpenSearchSection apiUrl={apiUrl} />}
    </div>
  );
};

const PostsSection = ({ apiUrl }: { apiUrl: string }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', authorId: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsRes, usersRes] = await Promise.all([
        fetch(`${apiUrl}/postgres/posts`),
        fetch(`${apiUrl}/postgres/users`)
      ]);
      const postsData = await postsRes.json();
      const usersData = await usersRes.json();
      setPosts(Array.isArray(postsData) ? postsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      if (!newPost.authorId && usersData.length > 0) {
        setNewPost((p) => ({ ...p, authorId: usersData[0].id }));
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.authorId) return;
    try {
      await fetch(`${apiUrl}/postgres/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
      setNewPost({ title: '', content: '', authorId: users[0]?.id || '' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await fetch(`${apiUrl}/postgres/posts/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  const togglePublish = async (post: Post) => {
    try {
      await fetch(`${apiUrl}/postgres/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published })
      });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <form onSubmit={createPost} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Create Post</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Title"
            value={newPost.title}
            onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
            style={{ flex: 1, minWidth: 150 }}
          />
          <input
            placeholder="Content"
            value={newPost.content}
            onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
            style={{ flex: 2, minWidth: 200 }}
          />
          <select
            value={newPost.authorId}
            onChange={(e) => setNewPost((p) => ({ ...p, authorId: e.target.value }))}
            style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd' }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button type="submit" style={{ background: '#0070f3', color: '#fff' }}>
            Add
          </button>
        </div>
      </form>

      <h3>Posts ({posts.length})</h3>
      {posts.length === 0 ? (
        <p style={{ color: '#666' }}>No posts yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{post.title}</h4>
                  <p style={{ margin: '4px 0', color: '#666', fontSize: 14 }}>by {post.author?.name || 'Unknown'}</p>
                  {post.content && <p style={{ margin: '8px 0 0' }}>{post.content}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => togglePublish(post)}
                    style={{ background: post.published ? '#22c55e' : '#f59e0b', color: '#fff', fontSize: 12 }}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePost(post.id)}
                    style={{ background: '#ef4444', color: '#fff', fontSize: 12 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CacheSection = ({ apiUrl }: { apiUrl: string }) => {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({ key: '', value: '', ttl: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/redis/cache`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const createEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.key || !newEntry.value) return;
    try {
      await fetch(`${apiUrl}/redis/cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newEntry.key,
          value: newEntry.value,
          ttl: newEntry.ttl ? Number.parseInt(newEntry.ttl) : undefined
        })
      });
      setNewEntry({ key: '', value: '', ttl: '' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  const deleteEntry = async (key: string) => {
    try {
      await fetch(`${apiUrl}/redis/cache/${key}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  if (loading) return <p>Loading cache...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <form onSubmit={createEntry} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Add Cache Entry</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Key"
            value={newEntry.key}
            onChange={(e) => setNewEntry((p) => ({ ...p, key: e.target.value }))}
            style={{ flex: 1, minWidth: 100 }}
          />
          <input
            placeholder="Value"
            value={newEntry.value}
            onChange={(e) => setNewEntry((p) => ({ ...p, value: e.target.value }))}
            style={{ flex: 2, minWidth: 150 }}
          />
          <input
            placeholder="TTL (sec)"
            value={newEntry.ttl}
            onChange={(e) => setNewEntry((p) => ({ ...p, ttl: e.target.value }))}
            style={{ width: 80 }}
            type="number"
          />
          <button type="submit" style={{ background: '#0070f3', color: '#fff' }}>
            Add
          </button>
        </div>
      </form>

      <h3>Cache Entries ({entries.length})</h3>
      {entries.length === 0 ? (
        <p style={{ color: '#666' }}>No cache entries</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry) => (
            <div
              key={entry.key}
              style={{
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ color: '#0070f3' }}>{entry.key}</strong>
                <span style={{ margin: '0 8px', color: '#999' }}>=</span>
                <span>{entry.value}</span>
              </div>
              <button
                type="button"
                onClick={() => deleteEntry(entry.key)}
                style={{ background: '#ef4444', color: '#fff', fontSize: 12 }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DynamoSection = ({ apiUrl }: { apiUrl: string }) => {
  const [items, setItems] = useState<DynamoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ pk: '', sk: '', data: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/dynamo/items`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.pk || !newItem.sk) return;
    try {
      const item: Record<string, unknown> = { pk: newItem.pk, sk: newItem.sk };
      if (newItem.data) {
        try {
          const parsed = JSON.parse(newItem.data);
          Object.assign(item, parsed);
        } catch {
          item.data = newItem.data;
        }
      }
      await fetch(`${apiUrl}/dynamo/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      setNewItem({ pk: '', sk: '', data: '' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  const deleteItem = async (pk: string, sk: string) => {
    try {
      await fetch(`${apiUrl}/dynamo/items/${encodeURIComponent(pk)}/${encodeURIComponent(sk)}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  if (loading) return <p>Loading DynamoDB items...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <form onSubmit={createItem} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Add DynamoDB Item</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Partition Key (pk)"
            value={newItem.pk}
            onChange={(e) => setNewItem((p) => ({ ...p, pk: e.target.value }))}
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            placeholder="Sort Key (sk)"
            value={newItem.sk}
            onChange={(e) => setNewItem((p) => ({ ...p, sk: e.target.value }))}
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            placeholder="Data (JSON or string)"
            value={newItem.data}
            onChange={(e) => setNewItem((p) => ({ ...p, data: e.target.value }))}
            style={{ flex: 2, minWidth: 150 }}
          />
          <button type="submit" style={{ background: '#0070f3', color: '#fff' }}>
            Add
          </button>
        </div>
      </form>

      <h3>DynamoDB Items ({items.length})</h3>
      {items.length === 0 ? (
        <p style={{ color: '#666' }}>No items yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => (
            <div
              key={`${item.pk}-${item.sk}`}
              style={{
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ flex: 1 }}>
                <div>
                  <strong style={{ color: '#0070f3' }}>pk:</strong> {item.pk}
                  <span style={{ margin: '0 12px', color: '#999' }}>|</span>
                  <strong style={{ color: '#0070f3' }}>sk:</strong> {item.sk}
                </div>
                {Object.keys(item).filter((k) => k !== 'pk' && k !== 'sk').length > 0 && (
                  <pre
                    style={{
                      margin: '8px 0 0',
                      padding: 8,
                      background: '#f5f5f5',
                      borderRadius: 4,
                      fontSize: 12,
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(
                      Object.fromEntries(Object.entries(item).filter(([k]) => k !== 'pk' && k !== 'sk')),
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteItem(item.pk, item.sk)}
                style={{ background: '#ef4444', color: '#fff', fontSize: 12, marginLeft: 12 }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OpenSearchSection = ({ apiUrl }: { apiUrl: string }) => {
  const [docs, setDocs] = useState<OpenSearchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState({ title: '', content: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenSearchDoc[] | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/opensearch/docs`);
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const createDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title) return;
    try {
      await fetch(`${apiUrl}/opensearch/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDoc.title, content: newDoc.content, createdAt: new Date().toISOString() })
      });
      setNewDoc({ title: '', content: '' });
      fetchData();
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await fetch(`${apiUrl}/opensearch/docs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchData();
      if (searchResults) {
        setSearchResults(searchResults.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/opensearch/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Failed: ${(err as Error).message}`);
    }
  };

  if (loading) return <p>Loading OpenSearch docs...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  const displayDocs = searchResults ?? docs;

  return (
    <div>
      <form onSubmit={createDoc} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Add Document</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Title"
            value={newDoc.title}
            onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))}
            style={{ flex: 1, minWidth: 150 }}
          />
          <input
            placeholder="Content"
            value={newDoc.content}
            onChange={(e) => setNewDoc((p) => ({ ...p, content: e.target.value }))}
            style={{ flex: 2, minWidth: 200 }}
          />
          <button type="submit" style={{ background: '#0070f3', color: '#fff' }}>
            Add
          </button>
        </div>
      </form>

      <form onSubmit={search} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Search Documents</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Search query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ background: '#0070f3', color: '#fff' }}>
            Search
          </button>
          {searchResults && (
            <button
              type="button"
              onClick={() => {
                setSearchResults(null);
                setSearchQuery('');
              }}
              style={{ background: '#6b7280', color: '#fff' }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <h3>{searchResults ? `Search Results (${displayDocs.length})` : `Documents (${displayDocs.length})`}</h3>
      {displayDocs.length === 0 ? (
        <p style={{ color: '#666' }}>{searchResults ? 'No results found' : 'No documents yet'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ flex: 1 }}>
                <div>
                  <strong style={{ color: '#0070f3' }}>{(doc.title as string) || 'Untitled'}</strong>
                  <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>ID: {doc.id}</span>
                </div>
                {doc.content && <p style={{ margin: '8px 0 0', color: '#666' }}>{String(doc.content)}</p>}
                {doc.createdAt && (
                  <span style={{ fontSize: 12, color: '#999' }}>
                    Created: {new Date(String(doc.createdAt)).toLocaleString()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteDoc(doc.id)}
                style={{ background: '#ef4444', color: '#fff', fontSize: 12, marginLeft: 12 }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
