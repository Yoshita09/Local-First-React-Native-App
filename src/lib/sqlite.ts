import * as SQLite from "expo-sqlite";

export type TodoItem = {
  id: string;
  task: string;
  is_complete: number;
  created_at: string;
  updated_at: string;
};

const db = SQLite.openDatabaseSync("myapp.db");

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY NOT NULL,
      task TEXT NOT NULL,
      is_complete INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function getTodos(): TodoItem[] {
  return db.getAllSync<TodoItem>(
    "SELECT * FROM todos ORDER BY created_at DESC;"
  );
}

export function addTodo(task: string) {
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  db.runSync(
    `INSERT INTO todos (id, task, is_complete, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?)`,
    [id, task, now, now]
  );

  return id;
}

export function toggleTodo(id: string, currentValue: number) {
  db.runSync(
    `UPDATE todos
     SET is_complete = ?, updated_at = ?
     WHERE id = ?`,
    [currentValue ? 0 : 1, new Date().toISOString(), id]
  );
}

export function deleteTodo(id: string) {
  db.runSync(`DELETE FROM todos WHERE id = ?`, [id]);
}