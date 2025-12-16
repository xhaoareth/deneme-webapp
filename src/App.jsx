import { useEffect, useMemo, useState } from 'react';

const storageKeys = {
  todos: 'deneme-webapp.todos',
  notes: 'deneme-webapp.notes',
  theme: 'deneme-webapp.theme',
};

const defaultTodos = [
  { id: crypto.randomUUID(), text: 'Welcome to your productive space 🎯' },
  { id: crypto.randomUUID(), text: 'Add todos and notes, then toggle theme!' },
];

const defaultNotes = [
  { id: crypto.randomUUID(), text: 'Tips: double-check your goals and keep it simple.' },
];

function loadFromStorage(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key} from storage`, error);
    return fallback;
  }
}

function saveToStorage(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to storage`, error);
  }
}

function Header({ theme, onToggleTheme }) {
  return (
    <header className="navbar">
      <div className="brand">
        <div className="logo">DW</div>
        <div>
          <p className="eyebrow">Deneme Webapp</p>
          <h1>Productivity Hub</h1>
        </div>
      </div>
      <button className="theme-toggle" type="button" onClick={onToggleTheme}>
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode
      </button>
    </header>
  );
}

function TodoSection({ todos, onAdd, onDelete }) {
  const [input, setInput] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput('');
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Stay on track</p>
          <h2>Todo List</h2>
        </div>
        <span className="pill">{todos.length} items</span>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Add a new task..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      <ul className="list">
        {todos.map((todo) => (
          <li key={todo.id} className="list-item">
            <span>{todo.text}</span>
            <button className="ghost" type="button" onClick={() => onDelete(todo.id)}>
              Remove
            </button>
          </li>
        ))}
        {todos.length === 0 && <p className="empty">No tasks yet. Add your first one!</p>}
      </ul>
    </section>
  );
}

function NotesSection({ notes, onAdd, onDelete }) {
  const [input, setInput] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput('');
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Capture ideas</p>
          <h2>Notes</h2>
        </div>
        <span className="pill">{notes.length} notes</span>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Write a quick note..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit">Save</button>
      </form>
      <ul className="grid list">
        {notes.map((note) => (
          <li key={note.id} className="list-item note">
            <p>{note.text}</p>
            <button className="ghost" type="button" onClick={() => onDelete(note.id)}>
              Delete
            </button>
          </li>
        ))}
        {notes.length === 0 && <p className="empty">Notes you add appear here.</p>}
      </ul>
    </section>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => loadFromStorage(storageKeys.theme, 'light'));
  const [todos, setTodos] = useState(() => loadFromStorage(storageKeys.todos, defaultTodos));
  const [notes, setNotes] = useState(() => loadFromStorage(storageKeys.notes, defaultNotes));

  const themeClass = useMemo(() => (theme === 'dark' ? 'dark' : 'light'), [theme]);

  useEffect(() => {
    saveToStorage(storageKeys.todos, todos);
  }, [todos]);

  useEffect(() => {
    saveToStorage(storageKeys.notes, notes);
  }, [notes]);

  useEffect(() => {
    saveToStorage(storageKeys.theme, theme);
    document.documentElement.setAttribute('data-theme', themeClass);
  }, [theme, themeClass]);

  const addTodo = (text) => setTodos((prev) => [{ id: crypto.randomUUID(), text }, ...prev]);
  const deleteTodo = (id) => setTodos((prev) => prev.filter((todo) => todo.id !== id));

  const addNote = (text) => setNotes((prev) => [{ id: crypto.randomUUID(), text }, ...prev]);
  const deleteNote = (id) => setNotes((prev) => prev.filter((note) => note.id !== id));

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className={`page ${themeClass}`}>
      <div className="container">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main className="grid two-col">
          <TodoSection todos={todos} onAdd={addTodo} onDelete={deleteTodo} />
          <NotesSection notes={notes} onAdd={addNote} onDelete={deleteNote} />
        </main>
      </div>
    </div>
  );
}
