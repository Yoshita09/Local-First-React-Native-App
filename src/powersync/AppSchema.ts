import { column, Schema, TableV2 } from "@powersync/react-native";

export const TODOS_TABLE = "todos";

const todos = new TableV2({
  task: column.text,
  is_complete: column.integer,
  user_id: column.text,
  modified_at: column.text,
});

export const AppSchema = new Schema({
  todos,
});

export type Database = (typeof AppSchema)["types"];
export type Todo = Database["todos"];