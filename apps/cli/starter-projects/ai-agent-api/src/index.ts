import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText } from 'ai';
import { agentTools } from './tools';
import { loadConversation, saveMessage } from './conversation';

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
    const { message, conversationId = 'default' } = body;

    if (!message) {
      responseStream.setContentType('application/json');
      responseStream.write(JSON.stringify({ error: "Missing 'message'" }));
      responseStream.end();
      return;
    }

    // Load conversation history
    const history = await loadConversation(conversationId);
    await saveMessage(conversationId, 'user', message);

    const model = process.env.AI_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

    const result = streamText({
      model: bedrock(model),
      tools: agentTools,
      maxSteps: 5,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI agent. Use the available tools when appropriate. Be concise.'
        },
        ...history,
        { role: 'user', content: message }
      ]
    });

    responseStream.setContentType('text/plain; charset=utf-8');
    let fullResponse = '';
    for await (const chunk of result.textStream) {
      fullResponse += chunk;
      responseStream.write(chunk);
    }
    responseStream.end();

    // Save assistant response
    await saveMessage(conversationId, 'assistant', fullResponse);
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
  <title>AI Agent</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; height: 100vh; display: flex; flex-direction: column; }
    .header { padding: 16px 24px; border-bottom: 1px solid #262626; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .header h1 { font-size: 18px; font-weight: 600; }
    .header-controls { display: flex; align-items: center; gap: 8px; }
    .header-controls label { font-size: 12px; color: #737373; }
    .header-controls input { padding: 6px 10px; background: #171717; border: 1px solid #262626; border-radius: 6px; color: #e5e5e5; font-size: 12px; outline: none; width: 160px; }
    .header-controls input:focus { border-color: #525252; }
    .btn-new { padding: 6px 14px; background: #262626; color: #e5e5e5; border: 1px solid #404040; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap; }
    .btn-new:hover { background: #363636; }
    .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .message { max-width: 720px; line-height: 1.6; white-space: pre-wrap; }
    .message.user { color: #a3a3a3; }
    .message.assistant { color: #e5e5e5; }
    .message .tool-call { font-size: 12px; color: #737373; font-style: italic; margin-bottom: 4px; }
    .input-area { padding: 16px 24px; border-top: 1px solid #262626; }
    .input-row { display: flex; gap: 8px; max-width: 720px; }
    input#input { flex: 1; padding: 10px 14px; background: #171717; border: 1px solid #262626; border-radius: 8px; color: #e5e5e5; font-size: 14px; outline: none; }
    input#input:focus { border-color: #525252; }
    button#send { padding: 10px 20px; background: #fff; color: #000; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
    button#send:disabled { opacity: 0.5; cursor: not-allowed; }
    .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: #525252; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AI Agent</h1>
    <div class="header-controls">
      <label for="convId">Conversation:</label>
      <input type="text" id="convId" placeholder="default" value="default" />
      <button class="btn-new" onclick="newConversation()">New conversation</button>
    </div>
  </div>
  <div class="messages" id="messages">
    <div class="empty-state">Send a message to start a conversation. Try asking about the weather or a math problem.</div>
  </div>
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
    const convIdInput = document.getElementById('convId');

    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !sendBtn.disabled) send(); });

    function newConversation() {
      convIdInput.value = 'conv-' + Date.now().toString(36);
      messages.innerHTML = '<div class="empty-state">New conversation started. Send a message to begin.</div>';
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;

      // Clear empty state on first message
      const empty = messages.querySelector('.empty-state');
      if (empty) empty.remove();

      input.value = '';
      sendBtn.disabled = true;
      addMessage('user', text);
      const el = addMessage('assistant', '');

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, conversationId: convIdInput.value || 'default' })
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          el.textContent += decoder.decode(value, { stream: true });
          messages.scrollTop = messages.scrollHeight;
        }
      } catch (e) {
        el.textContent = 'Error: ' + e.message;
      }
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
