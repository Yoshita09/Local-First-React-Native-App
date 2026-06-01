import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AppState,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  addTodo,
  deleteTodo,
  getTodos,
  initDatabase,
  syncPendingTodos,
  toggleTodo,
  TodoItem,
} from "../../lib/sqlite";
import { supabase } from "../../lib/supabase";

export default function TodosScreen() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = () => setTodos(getTodos());

  const syncNow = async () => {
    await syncPendingTodos();
    refresh();
  };

  useEffect(() => {
    initDatabase();
    refresh();

    void syncNow();

    // retry every few seconds while screen is open
    intervalRef.current = setInterval(() => {
      void syncNow();
    }, 5000);

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncNow();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      appSub.remove();
    };
  }, []);

  const onAdd = async () => {
    const value = task.trim();
    if (!value) return;

    try {
      await addTodo(value);
      setTask("");
      refresh();
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Could not save todo.");
    }
  };

  const onToggle = (item: TodoItem) => {
    toggleTodo(item.id, item.is_complete);
    refresh();
    void syncNow();
  };

  const onDelete = (id: string) => {
    deleteTodo(id);
    refresh();
    void syncNow();
  };

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Logout failed", error.message);
      return;
    }

    router.replace("/(auth)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Todos</Text>
          <Button title="Logout" onPress={onLogout} />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Add a todo"
            value={task}
            onChangeText={setTask}
            style={styles.input}
          />
          <Button title="Add" onPress={onAdd} />
        </View>

        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.todoTextWrap}
                onPress={() => onToggle(item)}
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

              <Button title="Del" onPress={() => onDelete(item.id)} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    flexShrink: 1,
    paddingRight: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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