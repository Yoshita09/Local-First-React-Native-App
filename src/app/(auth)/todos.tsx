import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { TODOS_TABLE, Todo } from "../../powersync/AppSchema";
import { useSystem, system } from "../../powersync/PowerSync";
import { supabase } from "../../lib/supabase";
import { uuid } from "../../powersync/uuid";

export default function TodosScreen() {
  const router = useRouter();
  const { db } = useSystem();

  const [task, setTask] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);

  const loadTodos = async () => {
    const rows = await db.selectFrom(TODOS_TABLE).selectAll().execute();
    setTodos(rows as Todo[]);
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const addTodo = async () => {
    const text = task.trim();
    if (!text) return;

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      Alert.alert("Please sign in again.");
      router.replace("/(auth)");
      return;
    }

    await db
      .insertInto(TODOS_TABLE)
      .values({
        id: uuid(),
        task: text,
        user_id: user.id,
        is_complete: 0,
        modified_at: new Date().toISOString(),
      })
      .execute();

    setTask("");
    loadTodos();
  };

  const toggleTodo = async (todo: Todo) => {
    await db
      .updateTable(TODOS_TABLE)
      .where("id", "=", todo.id)
      .set({
        is_complete: todo.is_complete === 1 ? 0 : 1,
      })
      .execute();

    loadTodos();
  };

  const deleteTodo = async (todo: Todo) => {
    await db.deleteFrom(TODOS_TABLE).where("id", "=", todo.id).execute();
    loadTodos();
  };

  const signOut = async () => {
    await system.powersync.disconnectAndClear?.();
    await supabase.auth.signOut();
    router.replace("/(auth)");
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Todos</Text>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Add new task"
          value={task}
          onChangeText={setTask}
          style={styles.input}
        />
        <TouchableOpacity onPress={addTodo} style={styles.addButton}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoRow}>
            <TouchableOpacity
              onPress={() => toggleTodo(item)}
              style={styles.todoTextWrap}
            >
              <Text
                style={[
                  styles.todoText,
                  item.is_complete === 1 && styles.doneText,
                ]}
              >
                {item.task}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteTodo(item)}>
              <Ionicons name="trash-outline" size={22} color="#d11" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingTop: 60,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addButton: {
    width: 48,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  todoTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  todoText: {
    fontSize: 16,
  },
  doneText: {
    textDecorationLine: "line-through",
    color: "#888",
  },
});