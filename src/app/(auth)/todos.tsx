import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  addTodo,
  deleteTodo,
  getTodos,
  initDatabase,
  toggleTodo,
  TodoItem,
} from "../../lib/sqlite";

export default function TodosScreen() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const refresh = () => setTodos(getTodos());

  useEffect(() => {
    initDatabase();
    refresh();
  }, []);

  const onAdd = () => {
    const value = task.trim();
    if (!value) return;

    addTodo(value);
    setTask("");
    refresh();
  };

  const onToggle = (item: TodoItem) => {
    toggleTodo(item.id, item.is_complete);
    refresh();
  };

  const onDelete = (id: string) => {
    deleteTodo(id);
    refresh();
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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