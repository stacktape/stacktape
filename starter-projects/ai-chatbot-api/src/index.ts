import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText } from 'ai';

export const handler = awslambda.streamifyResponse(async (event: any, responseStream: any) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';

  // Serve the web UI
  if (path === '/' && method === 'GET') {
    responseStream.setContentType('text/html');
    responseStream.write(getHtml());
    responseStream.end();
    return;
  }

  // Chat endpoint
  if (path === '/chat' && method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message;

    if (!userMessage) {
      responseStream.setContentType('application/json');
      responseStream.write(JSON.stringify({ error: "Missing 'message' in request body" }));
      responseStream.end();
      return;
    }

    const model = process.env.AI_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

    const result = streamText({
      model: bedrock(model),
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Keep responses concise and informative.' },
        { role: 'user', content: userMessage }
      ]
    });

    responseStream.setContentType('text/plain; charset=utf-8');

    for await (const chunk of result.textStream) {
      responseStream.write(chunk);
    }
    responseStream.end();
    return;
  }

  responseStream.setContentType('application/json');
  responseStream.write(JSON.stringify({ error: 'Not found' }));
  responseStream.end();
});

const getHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chatbot</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; height: 100vh; display: flex; flex-direction: column; }
    .header { padding: 16px 24px; border-bottom: 1px solid #262626; }
    .header h1 { font-size: 18px; font-weight: 600; }
    .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .message { max-width: 720px; line-height: 1.6; white-space: pre-wrap; }
    .message.user { color: #a3a3a3; }
    .message.assistant { color: #e5e5e5; }
    .input-area { padding: 16px 24px; border-top: 1px solid #262626; }
    .input-row { display: flex; gap: 8px; max-width: 720px; }
    input { flex: 1; padding: 10px 14px; background: #171717; border: 1px solid #262626; border-radius: 8px; color: #e5e5e5; font-size: 14px; outline: none; }
    input:focus { border-color: #525252; }
    button { padding: 10px 20px; background: #fff; color: #000; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="header"><h1>AI Chatbot</h1></div>
  <div class="messages" id="messages"></div>
  <div class="input-area">
    <div class="input-row">
      <input type="text" id="input" placeholder="Ask anything..." autofocus />
      <button id="send" onclick="send()">Send</button>
    </div>
  </div>
  <script>
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    const sendBtn = document.getElementById('send');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !sendBtn.disabled) send(); });
    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendBtn.disabled = true;
      addMessage('user', text);
      const el = addMessage('assistant', '');
      try {
        const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          el.textContent += decoder.decode(value, { stream: true });
          messages.scrollTop = messages.scrollHeight;
        }
      } catch (e) { el.textContent = 'Error: ' + e.message; }
      sendBtn.disabled = false;
      input.focus();
    }
    function addMessage(role, text) {
      const el = document.createElement('div');
      el.className = 'message ' + role;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
      return el;
    }
  </script>
</body>
</html>`;
