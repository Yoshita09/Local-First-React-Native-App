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
      user_id TEXT NOT NULL
    );
  `);
}

export function getTodos(): TodoItem[] {
  return db.getAllSync<TodoItem>(
    "SELECT * FROM todos ORDER BY created_at DESC;"
  );
}

export async function addTodo(task: string) {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("User not signed in");
  }

  const userId = userData.user.id;

  // Save locally first
  db.runSync(
    `INSERT INTO todos (id, task, is_complete, created_at, updated_at, user_id)
     VALUES (?, ?, 0, ?, ?, ?)`,
    [id, task, now, now, userId]
  );

  // Then try Supabase
  const { error } = await supabase.from("todos").insert({
    id,
    task,
    is_complete: 0,
    created_at: now,
    updated_at: now,
    user_id: userId,
  });

  if (error) {
    console.error("Supabase insert failed:", error.message);
    return { id, synced: false };
  }

  return { id, synced: true };
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