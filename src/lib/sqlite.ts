import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

export type TodoItem = {
  id: string;
  task: string;
  is_complete: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  sync_status: "pending" | "synced";
  is_deleted: number;
};

const db = SQLite.openDatabaseSync("myapp_v2.db");

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY NOT NULL,
      task TEXT NOT NULL,
      is_complete INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      is_deleted INTEGER NOT NULL DEFAULT 0
    );
  `);

  try {
    db.execSync(`ALTER TABLE todos ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';`);
  } catch {}

  try {
    db.execSync(`ALTER TABLE todos ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
}

export function getTodos(): TodoItem[] {
  return db.getAllSync<TodoItem>(
    "SELECT * FROM todos WHERE is_deleted = 0 ORDER BY created_at DESC;"
  );
}

export async function addTodo(task: string) {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;

  if (!userId) {
    throw new Error("No cached session found");
  }

  db.runSync(
    `INSERT INTO todos (
      id, task, is_complete, created_at, updated_at, user_id, sync_status, is_deleted
    ) VALUES (?, ?, 0, ?, ?, ?, 'pending', 0)`,
    [id, task, now, now, userId]
  );

  void syncPendingTodos();

  return { id, synced: false };
}

export function toggleTodo(id: string, currentValue: number) {
  db.runSync(
    `UPDATE todos
     SET is_complete = ?, updated_at = ?, sync_status = 'pending'
     WHERE id = ?`,
    [currentValue ? 0 : 1, new Date().toISOString(), id]
  );

  void syncPendingTodos();
}

export async function deleteTodo(id: string) {
  const now = new Date().toISOString();

  db.runSync(
    `UPDATE todos
     SET is_deleted = 1, updated_at = ?, sync_status = 'pending'
     WHERE id = ?`,
    [now, id]
  );

  void syncPendingTodos();
}

export async function syncPendingTodos() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) return 0;

    const pending = db.getAllSync<TodoItem>(
      "SELECT * FROM todos WHERE sync_status != 'synced' ORDER BY created_at ASC;"
    );

    let syncedCount = 0;

    for (const todo of pending) {
      try {
        if (todo.is_deleted === 1) {
          const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", todo.id)
            .eq("user_id", todo.user_id);

          if (!error) {
            db.runSync(`DELETE FROM todos WHERE id = ?`, [todo.id]);
            syncedCount += 1;
          }
          continue;
        }

        const { error } = await supabase.from("todos").upsert({
          id: todo.id,
          task: todo.task,
          is_complete: todo.is_complete,
          created_at: todo.created_at,
          updated_at: todo.updated_at,
          user_id: todo.user_id,
        });

        if (!error) {
          db.runSync(`UPDATE todos SET sync_status = 'synced' WHERE id = ?`, [
            todo.id,
          ]);
          syncedCount += 1;
        }
      } catch {
        // keep it pending and try again later
      }
    }

    return syncedCount;
  } catch {
    return 0;
  }
}