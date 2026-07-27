const API_URL = (window.STP_INJECTED_ENV && window.STP_INJECTED_ENV.API_URL) || '';

async function fetchTodos() {
  const res = await fetch(API_URL + '/todos');
  const json = await res.json();
  renderTodos(json.data);
}

function renderTodos(todos) {
  const list = document.getElementById('todoList');
  if (!todos.length) {
    list.innerHTML = '<li class="empty">No todos yet. Add one above!</li>';
    return;
  }
  list.innerHTML = todos
    .map(
      (t) =>
        '<li class="todo-item' + (t.completed ? ' completed' : '') + '">' +
        '<input type="checkbox"' + (t.completed ? ' checked' : '') + ' onchange="toggleTodo(\'' + t.id + '\', ' + !t.completed + ')" />' +
        '<span class="todo-title">' + escapeHtml(t.title) + '</span>' +
        '<button class="delete-btn" onclick="deleteTodo(\'' + t.id + '\')">&times;</button>' +
        '</li>'
    )
    .join('');
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function addTodo() {
  var input = document.getElementById('todoInput');
  var title = input.value.trim();
  if (!title) return;

  await fetch(API_URL + '/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title })
  });
  input.value = '';
  fetchTodos();
}

async function toggleTodo(id, completed) {
  await fetch(API_URL + '/todos/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: completed })
  });
  fetchTodos();
}

async function deleteTodo(id) {
  await fetch(API_URL + '/todos/' + id, { method: 'DELETE' });
  fetchTodos();
}

document.getElementById('todoInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addTodo();
});

fetchTodos();
